// What each screen says when a write is refused, or a read answers nothing.
//
// This spec exists because none of these branches rendered anything at all. Every write here awaited
// a mutation with no catch, so a refusal rejected the promise, nothing was drawn, and the control
// stayed where it was. On a permission checkbox that reads as "it worked", which is the worst
// possible answer on the screen that administers access.
//
// The refusals are simulated at the transport, because a test cannot make the repository refuse a
// write on demand. Each one is reachable on a real instance: a role deleted from another session, a
// permission revoked while a plan was on screen, a write the repository turns down.
import gql from 'graphql-tag'
import { RoleListPage } from '../page-object/RoleListPage'
import { RoleDetailPage } from '../page-object/RoleDetailPage'
import { refuse } from './graphqlFailure'

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
                role(name: $role) {
                    name
                    title(language: "en")
                    grants {
                        id
                        directPermissions
                    }
                }
            }
        }
    }
`

/**
 * The role as the repository holds it.
 *
 * Every refusal below is proved here and not on the screen. A screen that did not refetch shows the
 * old state whether the write landed or not, so reading the repository is the only assertion that
 * tells a refused write from one that went through and was merely reported as refused.
 */
const readRole = (role: string) =>
    cy
        .apolloClient()
        .apollo({ query: READ, variables: { role }, fetchPolicy: 'no-cache' })
        .then((result) => result.data.admin.rolesAndPermissions.role)

const ownNames = (role: string) =>
    readRole(role).then((answered) => answered.grants.find((grant) => grant.id === '').directPermissions)

const REFUSAL = 'The repository refused this write'

// The banner that offers a deleted role back lists only roles a source declares, so this test needs a
// seeded one. `jahiapp-user` is the one that is safe to delete: its live state already matches the
// declared baseline, so deleting it and resetting it is an exact round trip. `reviewer` is not, and
// restoring it by reset would strip the permissions a module declares on top of the core seed, for
// every spec that runs after this one. The test asserts the round-trip property before it deletes
// anything, so it fails loudly rather than quietly damaging the instance if that ever changes.
const SEEDED_ROLE = 'jahiapp-user'

describe('Roles and permissions - what a refused write says', () => {
    const uniq = Date.now().toString(36)
    const role = `rpError${uniq}`

    before(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: role } })
        cy.apolloClient().apollo({ mutation: GRANT, variables: { role, permissions: ['viewRolesTab'] } })
    })

    after(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: DELETE, variables: { role } })
        // The restore test deletes a seeded role, and a test that fails half way would leave it
        // deleted for every spec after this one.
        cy.apolloClient().apollo({ mutation: RESET, variables: { role: SEEDED_ROLE } })
    })

    beforeEach(() => {
        cy.login()
    })

    it('states a refused grant, and leaves the checkbox where it was', () => {
        const page = RoleDetailPage.visit(role).openPermissionsTab()
        page.searchPermission('clearLock')
        page.getPermissionState('clearLock').should('eq', 'NOT_GRANTED')

        refuse('GrantPermissions', REFUSAL)
        page.togglePermission('clearLock')

        // The notice is the whole point. Without it the row simply stays unchecked, which is
        // indistinguishable from a click that never registered.
        cy.get('[data-testid="role-permissions-notice"]').should('contain', REFUSAL)
        page.getPermissionState('clearLock').should('eq', 'NOT_GRANTED')
        ownNames(role).should('not.include', 'clearLock')
    })

    it('states a refused removal', () => {
        const page = RoleDetailPage.visit(role).openPermissionsTab()
        page.searchPermission('viewRolesTab')
        page.getPermissionState('viewRolesTab').should('eq', 'DIRECT')

        // viewRolesTab aggregates three permissions, so the removal is previewed and applied from the
        // dialog. The refusal therefore reaches confirmChange and not the checkbox handler.
        page.togglePermission('viewRolesTab')
        refuse('RevokePermission', REFUSAL)
        page.confirmDialog()

        cy.get('[data-testid="role-permissions-notice"]').should('contain', REFUSAL)
        page.getPermissionState('viewRolesTab').should('eq', 'DIRECT')
        ownNames(role).should('include', 'viewRolesTab')
    })

    it('does not open the change dialog when the plan answers no data', () => {
        // The role is deleted from another session while the screen is open, which is the condition
        // that makes the plan query answer a null role. Nothing is intercepted here: this is what the
        // server really returns, and the branch has to survive it.
        const vanishing = `rpVanish${uniq}`
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: vanishing } })
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: vanishing, permissions: ['viewRolesTab'] },
        })

        const page = RoleDetailPage.visit(vanishing).openPermissionsTab()
        page.searchPermission('viewRolesTab')
        page.getPermissionState('viewRolesTab').should('eq', 'DIRECT')

        cy.apolloClient().apollo({ mutation: DELETE, variables: { role: vanishing } })

        // PermissionChangeDialog reads plan.outcome, so opening it on an answer that carried no plan
        // took the screen down. The row states the problem instead.
        page.togglePermission('viewRolesTab')

        page.getDialog().should('not.exist')
        cy.get('[data-testid="role-permissions-notice"]').should('be.visible')
        cy.get('[data-testid="role-permissions-tab"]').should('be.visible')
    })

    it('does not say "Saved" when the save was refused', () => {
        const page = RoleDetailPage.visit(role)
        page.openIdentityTab()
        page.getTitleInput().clear()
        page.getTitleInput().type('A title that will not land')

        refuse('SaveRoleText', REFUSAL)
        cy.get('[data-testid="role-identity-save"]').click()

        // The form reported the refusal in its body while the footer said "Saved" beside it. Both
        // assertions are needed: the message alone passed before the fix.
        cy.get('[data-testid="role-identity-error"]').should('contain', REFUSAL)
        cy.get('[data-testid="role-identity-saved"]').should('not.exist')
        readRole(role).then((answered) => {
            expect(answered.title, 'and the title was not written').to.not.eq('A title that will not land')
        })
    })

    it('states a refused deletion, and stays on the role', () => {
        const page = RoleDetailPage.visit(role)
        page.chooseAction('delete')

        refuse('DeleteRole', REFUSAL)
        cy.get('[data-testid="confirm-destructive-confirm"]').click()

        // Closing the dialog and leaving for the list would report the deletion the confirmation had
        // just asked about.
        cy.get('[data-testid="confirm-destructive-dialog"]').should('be.visible')
        cy.get('[data-testid="confirm-destructive-error"]').should('contain', REFUSAL)
        readRole(role).should('not.be.null')
    })

    it('states a failed read as a failure, and not as a role that does not exist', () => {
        refuse('GetRole', REFUSAL)
        RoleDetailPage.visit(role)

        cy.get('[data-testid="role-detail-error"]').should('contain', REFUSAL)
        cy.get('[data-testid="role-detail-error"]').should('not.contain', 'No role is named')
    })

    it('names the role it could not find', () => {
        const absent = `rpAbsent${uniq}`
        cy.visit(`/jahia/administration/rolesAndPermissionsV2?role=${absent}`)

        // The message interpolated the wrong key and rendered "No role is named ." with no name at
        // all, so the name is the assertion.
        cy.get('[data-testid="role-detail-error"]').should('contain', absent)
    })

    it('states a refused restore in the banner that offered it', () => {
        // The precondition, asserted rather than assumed: this role's live state matches the declared
        // baseline, so the delete below is undone exactly by the reset in after().
        cy.apolloClient()
            .apollo({
                query: gql`
                    query Plan($role: String!) {
                        admin {
                            rolesAndPermissions {
                                role(name: $role) {
                                    resetPlan {
                                        noop
                                    }
                                }
                            }
                        }
                    }
                `,
                variables: { role: SEEDED_ROLE },
                fetchPolicy: 'no-cache',
            })
            .then((result) => {
                expect(
                    result.data.admin.rolesAndPermissions.role.resetPlan.noop,
                    `${SEEDED_ROLE} must match its declared baseline for this test to be reversible`,
                ).to.be.true
            })

        cy.apolloClient().apollo({ mutation: DELETE, variables: { role: SEEDED_ROLE } })

        const page = RoleListPage.visit()
        cy.get('[data-testid="missing-declared-roles"]').should('be.visible')

        refuse('ResetRole', REFUSAL)
        cy.get(`[data-testid="restore-role-${SEEDED_ROLE}"]`).click()

        // The banner is the only place this action is offered, so a refusal has nowhere else to go.
        // Without the message the button simply stops looking busy and the role is still missing.
        cy.get('[data-testid="restore-role-error"]').should('contain', REFUSAL)
        page.getRoleName(SEEDED_ROLE).should('not.exist')
        readRole(SEEDED_ROLE).should('be.null')
    })
})
