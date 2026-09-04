// Creating, copying and deleting a role from the list.
//
// The one rule worth a test of its own: a role name another role already carries is refused. An access
// control entry holds a role NAME, and core resolves that name with a query that takes the first
// result, so two roles of one name make the applied permissions undefined. The check cannot live in
// the browser either, because two administrators could pick one name at the same time. So the server
// refuses it and the dialog shows the message it answers.
import gql from 'graphql-tag'
import { RoleListPage } from '../page-object/RoleListPage'

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

const DUPLICATE = gql`
    mutation Duplicate($role: String!, $newName: String!, $withSubRoles: Boolean) {
        admin {
            rolesAndPermissions {
                duplicateRole(role: $role, newName: $newName, withSubRoles: $withSubRoles)
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

const READ = gql`
    query Read($role: String!) {
        admin {
            rolesAndPermissions {
                role(name: $role) {
                    roleGroup
                    parentRoleName
                    subRoleNames
                    title(language: "en")
                    grants {
                        id
                        directPermissions
                        effectivePermissions {
                            name
                            isDirect
                            lockKind
                            lockedBy
                        }
                    }
                }
            }
        }
    }
`

const nameDialog = {
    name: () => cy.get('[data-testid="role-name-input"]'),
    confirm: () => cy.get('[data-testid="role-name-confirm"]'),
    cancel: () => cy.get('[data-testid="role-name-cancel"]'),
    error: () => cy.get('[data-testid="role-name-error"]'),
}

describe('Roles and permissions - creating, copying and deleting a role', () => {
    const uniq = Date.now().toString(36)
    const created = `rpNew${uniq}`
    const copy = `rpNew${uniq}-copy`
    const nested = `rpNested${uniq}`
    const seededCopy = `rpReviewer${uniq}`
    const subRoleCopy = `rpSubs${uniq}`

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        cy.login()
        ;[copy, nested, seededCopy, `${subRoleCopy}-editor-in-chief`, subRoleCopy, created].forEach((role) => {
            cy.apolloClient().apollo({ mutation: DELETE, variables: { role } })
        })
    })

    it('creates a role, and the list shows it with the scope chosen', () => {
        const page = RoleListPage.visit()

        cy.get('[data-testid="role-create"]').click()
        nameDialog.name().type(created)
        nameDialog.confirm().click()

        page.getRoleName(created).should('be.visible')
        page.getScope(created).should('have.text', 'edit-role')
    })

    it('refuses a name another role already carries, and says which', () => {
        RoleListPage.visit()

        cy.get('[data-testid="role-create"]').click()
        nameDialog.name().clear()
        nameDialog.name().type('editor')
        nameDialog.confirm().click()

        // The server refuses it and answers its own message. A silent failure, or a generic internal
        // error, would leave an administrator with no idea what to change.
        nameDialog.error().should('contain', 'editor')
        nameDialog.cancel().click()

        // Nothing was created, so the seeded role is still the only one of that name.
        cy.get('[data-testid="role-name-editor"]').should('be.visible')
    })

    it('copies a role with the permissions it names', () => {
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: created, permissions: ['clearLock', 'publish'] },
        })

        const page = RoleListPage.visit()
        cy.get(`[data-testid="role-duplicate-${created}"]`).click()
        nameDialog.name().clear()
        nameDialog.name().type(copy)
        nameDialog.confirm().click()

        page.getRoleName(copy).should('be.visible')

        cy.apolloClient()
            .apollo({ query: READ, variables: { role: copy } })
            .then((result) => {
                const role = result.data.admin.rolesAndPermissions.role
                expect(role.roleGroup, 'the copy keeps the scope').to.eq('edit-role')
                expect(
                    role.grants.find((grant) => grant.id === '').directPermissions,
                    'and it names what the source names',
                ).to.deep.eq(['clearLock', 'publish'])
            })
    })

    // A role the test creates has no title, so the copy above never reads the jnt:translation child a
    // seeded role carries. That child is what made the copy fail for every seeded role.
    it('copies a seeded role with the title it carries', () => {
        const page = RoleListPage.visit()
        cy.get('[data-testid="role-duplicate-reviewer"]').click()
        nameDialog.name().clear()
        nameDialog.name().type(seededCopy)
        nameDialog.confirm().click()

        page.getRoleName(seededCopy).should('be.visible')

        cy.apolloClient()
            .apollo({ query: READ, variables: { role: seededCopy } })
            .then((result) => {
                const role = result.data.admin.rolesAndPermissions.role
                expect(role, 'the copy was created').to.not.be.null
                expect(role.title, 'and it carries the title of the source').to.eq('Reviewer')
            })
    })

    // A role name is what an access control entry holds, so two roles of one name make the applied
    // permissions undefined. A sub-role copy is therefore named after its new parent, which is what
    // lets a role with sub-roles be copied at all.
    it('copies the sub-roles under a name derived from the new parent', () => {
        cy.apolloClient()
            .apollo({
                mutation: DUPLICATE,
                variables: { role: 'editor', newName: subRoleCopy, withSubRoles: true },
                errorPolicy: 'all',
            })
            .then((result) => {
                expect(result.errors, 'the copy is accepted').to.be.undefined
            })

        cy.apolloClient()
            .apollo({ query: READ, variables: { role: subRoleCopy } })
            .then((result) => {
                const role = result.data.admin.rolesAndPermissions.role
                expect(role, 'the copy was created').to.not.be.null
                expect(role.subRoleNames, 'and its sub-role carries the new parent as a prefix').to.deep.eq([
                    `${subRoleCopy}-editor-in-chief`,
                ])
            })

        cy.apolloClient()
            .apollo({ query: READ, variables: { role: `${subRoleCopy}-editor-in-chief` } })
            .then((result) => {
                const child = result.data.admin.rolesAndPermissions.role
                expect(child, 'the sub-role copy is a role of its own').to.not.be.null
                expect(child.parentRoleName, 'nested inside the copy').to.eq(subRoleCopy)
            })

        cy.apolloClient()
            .apollo({ query: READ, variables: { role: 'editor-in-chief' } })
            .then((result) => {
                expect(
                    result.data.admin.rolesAndPermissions.role,
                    'and the source sub-role is untouched',
                ).to.not.be.null
            })
    })

    it('creates a role nested inside another, which then adds to it', () => {
        const page = RoleListPage.visit()

        cy.get('[data-testid="role-create"]').click()
        nameDialog.name().clear()
        nameDialog.name().type(nested)
        // The parent is what makes this a nested role rather than a top-level one. Without this field
        // the screen could only create top-level roles, whatever the API allowed.
        cy.get('[data-testid="role-new-parent"]').click()
        cy.get('[data-testid="role-new-parent-editor"]').click()
        nameDialog.confirm().click()

        // The list indents a nested role and names the role it sits in.
        page.getRoleName(nested).should('contain', `inside editor`)

        // The indent is asserted as rendered, not as markup. It regressed once already: the cell
        // became a button, the button reset `padding` to 0, and at equal specificity the reset won on
        // source order. Every sub-role sat flush with its parent while the class was still applied,
        // so a test that only read the class name stayed green.
        page.getRoleName(nested).then(($nested) => {
            const indent = parseFloat($nested.css('padding-left'))
            expect(indent, 'a nested role is indented').to.be.greaterThan(0)

            page.getRoleName('editor').then(($parent) => {
                expect(indent, 'and it is indented further than the role it sits inside').to.be.greaterThan(
                    parseFloat($parent.css('padding-left')),
                )
            })
        })

        cy.apolloClient()
            .apollo({ query: READ, variables: { role: nested } })
            .then((result) => {
                const role = result.data.admin.rolesAndPermissions.role
                expect(role.parentRoleName, 'the role is nested inside editor').to.eq('editor')

                const own = role.grants.find((grant) => grant.id === '')
                expect(own.directPermissions, 'and it names nothing of its own').to.deep.eq([])

                // A nested role ADDS to its parent, so it already grants what editor grants, and every
                // one of those is locked by editor rather than named here. That is the difference from
                // a copy, which would name the same permissions and be independent.
                const inherited = own.effectivePermissions.find((effective) => effective.name === 'api-access')
                expect(inherited, 'editor grants api-access, so the nested role grants it too').to.not.be.undefined
                expect(inherited.isDirect, 'without naming it').to.be.false
                expect(inherited.lockKind).to.eq('INHERITED_FROM_ROLE')
                expect(inherited.lockedBy).to.eq('editor')
            })
    })

    it('deletes a role, and the list stops showing it', () => {
        const page = RoleListPage.visit()
        cy.get(`[data-testid="role-delete-${copy}"]`).click()

        // Deleting asks first, always. This role names permissions but nobody holds it, so one
        // confirmation is enough and no name has to be typed. destructiveActions.cy.ts covers the
        // refusals and the name gate.
        cy.get('[data-testid="confirm-destructive-confirm"]').click()

        cy.get(`[data-testid="role-name-${copy}"]`).should('not.exist')

        // The role is gone from the repository too, and not only from the table.
        cy.apolloClient()
            .apollo({ query: READ, variables: { role: copy } })
            .then((result) => {
                expect(result.data.admin.rolesAndPermissions.role, 'the role is gone').to.be.null
            })

        page.getRoleName(created).should('be.visible')
    })
})
