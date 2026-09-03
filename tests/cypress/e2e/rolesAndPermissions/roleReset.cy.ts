// Resetting a role to what the installed sources declare.
//
// The baseline is read from what is installed and not from a record of what once happened: the seed
// file the running Jahia ships, and the roles.xml inside every installed module bundle. So it says
// what this instance would hold for this core version and this exact module set, before anybody
// edited a role. That is not the state the role had a minute ago, which is why every test here goes
// through the difference rather than straight to the write.
//
// The difference is stated twice, and the second statement is the one that matters. A granted
// permission grants its descendants, so removing one name can stop the role granting nine
// permissions. A diff of names alone would report "removes 1" and hide the other eight.
import gql from 'graphql-tag'
import { RoleListPage } from '../page-object/RoleListPage'
import { RoleDetailPage } from '../page-object/RoleDetailPage'

// editSelector aggregates 8 children and no source declares it on this role, so granting it creates
// a difference whose name count and permission count cannot be confused.
const DRIFT_PERMISSION = 'editSelector'
const SEEDED_ROLE = 'editor-in-chief'
const SEEDED_PARENT = 'editor'

const CREATE = gql`
    mutation Create($name: String!) {
        admin {
            rolesAndPermissions {
                createRole(name: $name, roleGroup: "edit-role")
            }
        }
    }
`

const DELETE = gql`
    mutation Delete($role: String!) {
        admin {
            rolesAndPermissions {
                deleteRole(role: $role)
            }
        }
    }
`

const GRANT = gql`
    mutation Grant($role: String!, $permissions: [String!]!) {
        admin {
            rolesAndPermissions {
                grantPermissions(role: $role, target: "", permissions: $permissions) {
                    outcome
                }
            }
        }
    }
`

const REVOKE = gql`
    mutation Revoke($role: String!, $permission: String!) {
        admin {
            rolesAndPermissions {
                revokePermission(role: $role, target: "", permission: $permission) {
                    outcome
                }
            }
        }
    }
`

const SET_TEXT = gql`
    mutation SetText($role: String!, $title: String) {
        admin {
            rolesAndPermissions {
                setRoleText(role: $role, language: "en", title: $title)
            }
        }
    }
`

const SET_PRIVILEGED = gql`
    mutation SetPrivileged($path: String!, $value: String!) {
        jcr(workspace: EDIT) {
            mutateNode(pathOrId: $path) {
                mutateProperty(name: "j:privilegedAccess") {
                    setValue(type: BOOLEAN, value: $value)
                }
            }
        }
    }
`

const RESET = gql`
    mutation Reset($role: String!) {
        admin {
            rolesAndPermissions {
                resetRoleToDeclared(role: $role) {
                    outcome
                }
            }
        }
    }
`

const READ = gql`
    query Read($role: String!) {
        admin {
            rolesAndPermissions {
                missingDeclaredRoles
                role(name: $role) {
                    name
                    parentRoleName
                    directPermissionNames
                    title(language: "en")
                    hasPrivilegedAccess
                    resetPlan {
                        applicable
                        noop
                        widening
                        sourceLabels
                        textLanguagesChanged
                        privilegedAccessChange
                    }
                }
            }
        }
    }
`

const read = (role: string) =>
    cy
        .apolloClient()
        .apollo({ query: READ, variables: { role }, fetchPolicy: 'no-cache' })
        .then((result) => result.data.admin.rolesAndPermissions)

const dialog = {
    root: () => cy.get('[data-testid="role-reset-dialog"]'),
    baseline: () => cy.get('[data-testid="reset-baseline"]'),
    removes: () => cy.get('[data-testid="reset-diff-removes"]'),
    adds: () => cy.get('[data-testid="reset-diff-adds"]'),
    removesReach: () => cy.get('[data-testid="reset-removes-reach"]'),
    expected: () => cy.get('[data-testid="reset-expected"]'),
    word: () => cy.get('[data-testid="reset-word"]'),
    confirm: () => cy.get('[data-testid="reset-confirm"]'),
    cancel: () => cy.get('[data-testid="reset-cancel"]'),
    message: () => cy.get('[data-testid="role-action-message"]'),
}

// The reset acts on the role as a whole, so it lives in the header menu beside the other actions on
// the role, and no longer inside the form that edits the role's own settings.
const openReset = (role: string) => {
    const page = RoleDetailPage.visit(role)
    page.chooseAction('reset')
    return page
}

describe('Roles and permissions - resetting a role to the declared baseline', () => {
    const uniq = Date.now().toString(36)
    const ownRole = `rpOwn${uniq}`

    before(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: ownRole } })
    })

    after(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: DELETE, variables: { role: ownRole } })
        // Whatever a test left on the seeded role, the baseline is what it should hold.
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
    })

    beforeEach(() => {
        cy.login()
    })

    it('has no baseline for a role your team created', () => {
        openReset(ownRole)

        // No installed source declares it, so there is nothing to reset to. Saying so beats offering
        // an action that would empty the role.
        dialog.message().should('contain', 'No installed source declares this role')
        dialog.root().should('not.exist')

        read(ownRole).then(({ role }) => {
            expect(role.resetPlan.applicable, 'the plan says it does not apply').to.be.false
        })
    })

    it('says a role already matching the baseline would write nothing', () => {
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })

        openReset(SEEDED_ROLE)

        dialog.message().should('contain', 'already matches')
        dialog.root().should('not.exist')
    })

    it('counts the difference in permissions and not only in names', () => {
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: SEEDED_ROLE, permissions: [DRIFT_PERMISSION] },
        })

        openReset(SEEDED_ROLE)

        // The baseline names its contributors, so a reader can see whose declaration this is.
        dialog.baseline().should('contain', 'Jahia core')

        dialog.removes().should('contain', DRIFT_PERMISSION)
        cy.get('[data-testid="reset-diff-adds"]').should('not.exist')

        // The permission aggregates 8 others, so one removed name costs 9 permissions. This assertion
        // is the reason the plan is measured on the server against the permission catalog.
        dialog.removesReach().should('contain', '9 permissions')
        dialog.removesReach().should('contain', '8 descendants')
    })

    it('writes nothing when the difference is refused', () => {
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: SEEDED_ROLE, permissions: [DRIFT_PERMISSION] },
        })

        openReset(SEEDED_ROLE)
        dialog.root().should('be.visible')
        dialog.cancel().click()
        dialog.root().should('not.exist')

        read(SEEDED_ROLE).then(({ role }) => {
            expect(
                role.directPermissionNames,
                'the role still names what it named before the preview',
            ).to.include(DRIFT_PERMISSION)
        })
    })

    it('applies the difference it showed, and the role then matches the baseline', () => {
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: SEEDED_ROLE, permissions: [DRIFT_PERMISSION] },
        })

        openReset(SEEDED_ROLE)
        // Removing only, so nothing is gained and no name has to be typed.
        cy.get('[data-testid="reset-expected"]').should('not.exist')
        dialog.confirm().click()
        dialog.root().should('not.exist')

        read(SEEDED_ROLE).then(({ role }) => {
            expect(role.directPermissionNames, 'the drift is gone').to.not.include(DRIFT_PERMISSION)
            expect(role.resetPlan.noop, 'and a second reset would write nothing').to.be.true
        })
    })

    it('asks for the name to be typed when the reset widens the role', () => {
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
        // Take away something the sources declare, so putting the baseline back makes the role grant
        // more than it does now. That is the change worth a pause; restoring costs nothing.
        cy.apolloClient()
            .apollo({
                mutation: REVOKE,
                variables: { role: SEEDED_ROLE, permission: 'canSeeAdvancedOptionsTab' },
            })
            // The fixture is asserted so a fixture that stops working fails here, and not later in
            // an assertion about the dialog that would send a reader looking at the wrong code.
            .then((result) => {
                expect(
                    result.data.admin.rolesAndPermissions.revokePermission.outcome,
                    'the fixture removed the declared permission',
                ).to.eq('APPLIED')
            })

        openReset(SEEDED_ROLE)

        dialog.adds().should('contain', 'canSeeAdvancedOptionsTab')
        dialog.confirm().should('be.disabled')
        dialog.expected().should('have.text', SEEDED_ROLE)

        dialog.word().type('EDITOR-IN-CHIEF')
        dialog.confirm().should('be.disabled')

        dialog.word().clear()
        dialog.word().type(SEEDED_ROLE)
        dialog.confirm().should('not.be.disabled')
        dialog.confirm().click()

        // The dialog closes only once the mutation has answered, so this is the signal that the write
        // landed. Reading straight after the click races the server, and wins that race only while the
        // server is warm.
        dialog.root().should('not.exist')

        read(SEEDED_ROLE).then(({ role }) => {
            expect(role.directPermissionNames, 'the declared permission is back').to.include(
                'canSeeAdvancedOptionsTab',
            )
        })
    })

    // The sources declare a title and a description per language, so the reset writes them. Reading
    // the text and never writing it left a recreated role with no label at all, and left an edited
    // title in place after an action that says it restores what the sources declare.
    it('restores the title the sources declare, and states it in the difference first', () => {
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
        cy.apolloClient().apollo({
            mutation: SET_TEXT,
            variables: { role: SEEDED_ROLE, title: 'Edited by an administrator' },
        })

        read(SEEDED_ROLE).then(({ role }) => {
            expect(role.title, 'the edit landed').to.eq('Edited by an administrator')
            expect(role.resetPlan.textLanguagesChanged, 'and the plan names the language').to.deep.eq([
                'en',
            ])
        })

        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })

        read(SEEDED_ROLE).then(({ role }) => {
            expect(role.title, 'the declared title is back').to.eq('Editor in chief')
            expect(role.resetPlan.noop, 'and nothing is left to reset').to.be.true
        })
    })

    // A source silent on a property declares no value for it, so the reset removes the property.
    // j:privilegedAccess is the one that matters: it decides whether granting the role adds the
    // principal to the site privileged group.
    it('removes a property no source declares, and states that first', () => {
        const silent = 'reader'
        cy.apolloClient().apollo({
            mutation: SET_PRIVILEGED,
            variables: { path: `/roles/${silent}`, value: 'true' },
        })

        read(silent).then(({ role }) => {
            expect(role.hasPrivilegedAccess, 'the property was set by hand').to.be.true
            expect(role.resetPlan.privilegedAccessChange, 'and the plan says the reset clears it').to.eq(
                'false',
            )
        })

        cy.apolloClient().apollo({ mutation: RESET, variables: { role: silent } })

        read(silent).then(({ role }) => {
            expect(role.hasPrivilegedAccess, 'the reset restored the default').to.be.false
            expect(role.resetPlan.privilegedAccessChange, 'and there is nothing left to clear').to.be.null
        })
    })

    it('offers a deleted role back, and restores the access it granted', () => {
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
        cy.apolloClient().apollo({ mutation: DELETE, variables: { role: SEEDED_ROLE } })

        const page = RoleListPage.visit()

        // A deleted role is in no row, so the list is the only place it can be offered back. This is
        // the recovery that matters: an access control entry stores the role NAME, so the entries the
        // deletion left behind start granting again the moment the role is back.
        cy.get('[data-testid="missing-declared-roles"]').should('contain', 'not in this repository')
        cy.get(`[data-testid="restore-role-${SEEDED_ROLE}"]`).click()

        cy.get('[data-testid="missing-declared-roles"]').should('not.exist')
        page.getRoleName(SEEDED_ROLE).should('be.visible')

        read(SEEDED_ROLE).then(({ missingDeclaredRoles, role }) => {
            expect(missingDeclaredRoles, 'nothing is missing any more').to.not.include(SEEDED_ROLE)
            expect(role.parentRoleName, 'and it is nested where the sources declare it').to.eq(
                SEEDED_PARENT,
            )
            expect(role.resetPlan.noop, 'and it matches the baseline exactly').to.be.true
            // Without the text the role came back with no label at all, so the list showed its
            // technical name where every other seeded role shows a title.
            expect(role.title, 'and it carries the title the sources declare').to.eq('Editor in chief')
        })
    })
})
