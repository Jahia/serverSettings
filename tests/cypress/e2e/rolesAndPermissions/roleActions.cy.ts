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

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        cy.login()
        ;[copy, nested, created].forEach((role) => {
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
                const inherited = own.effectivePermissions.find(
                    (effective) => effective.name === 'api-access',
                )
                expect(inherited, 'editor grants api-access, so the nested role grants it too').to.not.be
                    .undefined
                expect(inherited.isDirect, 'without naming it').to.be.false
                expect(inherited.lockKind).to.eq('INHERITED_FROM_ROLE')
                expect(inherited.lockedBy).to.eq('editor')
            })
    })

    it('deletes a role, and the list stops showing it', () => {
        const page = RoleListPage.visit()
        cy.get(`[data-testid="role-delete-${copy}"]`).click()
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
