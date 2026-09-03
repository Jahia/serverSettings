// Nothing irreversible happens on one click.
//
// This spec exists because it did. The delete icon deleted the role, and a seeded role went with one
// stray click. So the assertions here are written the other way round from the rest of the suite:
// each one clicks the destructive control and then proves the repository DID NOT change.
//
// The confirmation states the consequence rather than asking whether the administrator is sure. The
// one that matters is what deleting a role that somebody holds does. An access control entry holds a
// role NAME, and deleting the role node leaves those entries naming a role the repository no longer
// has. They then grant nothing, and nobody is told. `reader` is granted to `g:users` and `u:guest` on
// this instance, so deleting it takes read access away from every visitor in silence.
//
// The name has to be typed whenever something is actually lost, which is what makes the wrong row
// impossible to delete by accident. A role nobody holds and nothing is nested inside needs one
// confirmation and no typing, because the friction belongs where the loss is.
import gql from 'graphql-tag'
import { RoleListPage } from '../page-object/RoleListPage'
import { RoleDetailPage } from '../page-object/RoleDetailPage'

const CREATE = gql`
    mutation Create($name: String!) {
        admin {
            rolesAndPermissions {
                createRole(name: $name, roleGroup: "edit-role")
            }
        }
    }
`

const ADD_TARGET = gql`
    mutation AddTarget($role: String!, $path: String!) {
        admin {
            rolesAndPermissions {
                addTarget(role: $role, path: $path)
            }
        }
    }
`

const GRANT = gql`
    mutation Grant($role: String!, $target: String!, $permissions: [String!]!) {
        admin {
            rolesAndPermissions {
                grantPermissions(role: $role, target: $target, permissions: $permissions) {
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
                    name
                    usage {
                        entryCount
                        principals
                    }
                    grants {
                        id
                        path
                        directPermissions
                    }
                }
            }
        }
    }
`

const readRole = (role: string) =>
    cy
        .apolloClient()
        .apollo({ query: READ, variables: { role } })
        .then((result) => result.data.admin.rolesAndPermissions.role)

const dialog = {
    root: () => cy.get('[data-testid="confirm-destructive-dialog"]'),
    message: () => cy.get('[data-testid="confirm-destructive-message"]'),
    consequences: () => cy.get('[data-testid="confirm-destructive-consequences"]'),
    expected: () => cy.get('[data-testid="confirm-destructive-expected"]'),
    word: () => cy.get('[data-testid="confirm-destructive-word"]'),
    confirm: () => cy.get('[data-testid="confirm-destructive-confirm"]'),
    cancel: () => cy.get('[data-testid="confirm-destructive-cancel"]'),
}

describe('Roles and permissions - nothing irreversible happens on one click', () => {
    const uniq = Date.now().toString(36)
    const unused = `rpUnused${uniq}`
    const withTarget = `rpTarget${uniq}`

    before(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: unused } })
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: withTarget } })
        cy.apolloClient().apollo({ mutation: ADD_TARGET, variables: { role: withTarget, path: 'currentSite' } })
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: withTarget, target: 'currentSite-access', permissions: ['jContentAccess'] },
        })
    })

    after(() => {
        cy.login()
        ;[unused, withTarget].forEach((role) => {
            cy.apolloClient().apollo({ mutation: DELETE, variables: { role } })
        })
    })

    beforeEach(() => {
        cy.login()
    })

    it('does not delete a seeded role on one click, and says who would lose access', () => {
        const page = RoleListPage.visit()
        cy.get('[data-testid="role-delete-reader"]').click()

        // The role is still there while the dialog is open, which is the whole point.
        dialog.root().should('be.visible')
        page.getRoleName('reader').should('be.visible')

        dialog.message().should('contain', 'cannot be undone')
        // The dangerous fact, named: the entries stay behind and stop granting anything.
        dialog
            .consequences()
            .should('contain', 'access control entries grant this role')
            .and('contain', 'u:guest')
            .and('contain', 'grant nothing')

        // Confirming is blocked until the name is typed, so a stray click cannot reach it.
        dialog.confirm().should('be.disabled')
        dialog.expected().should('have.text', 'reader')

        dialog.cancel().click()
        dialog.root().should('not.exist')

        // The repository is untouched, and the entries that grant the role are still there.
        readRole('reader').then((role) => {
            expect(role, 'the role is still in the repository').to.not.be.null
            expect(role.usage.entryCount, 'and it is still granted').to.be.greaterThan(0)
        })
    })

    it('refuses to delete until the typed name matches exactly', () => {
        RoleListPage.visit()
        cy.get('[data-testid="role-delete-reader"]').click()

        // A role name is case-sensitive, so an upper-case spelling must not unlock the action.
        dialog.word().type('READER')
        dialog.confirm().should('be.disabled')

        dialog.word().clear()
        dialog.word().type('reader')
        dialog.confirm().should('not.be.disabled')

        dialog.cancel().click()
        readRole('reader').should('not.be.null')
    })

    it('asks once, and no typing, for a role nobody holds', () => {
        const page = RoleListPage.visit()
        cy.get(`[data-testid="role-delete-${unused}"]`).click()

        // Nothing is lost here, so the friction stops at one confirmation.
        dialog.consequences().should('contain', 'nobody loses access')
        cy.get('[data-testid="confirm-destructive-expected"]').should('not.exist')
        dialog.confirm().should('not.be.disabled')

        dialog.cancel().click()
        page.getRoleName(unused).should('be.visible')
    })

    it('does not remove a target on one click, and lists the permissions that would go', () => {
        // A target is where the role reaches, so it is removed from the role's own settings and no
        // longer from the screen that grants permissions.
        RoleDetailPage.visit(withTarget).openIdentityTab()

        cy.get('[data-testid="role-remove-target-currentSite-access"]').click()

        dialog.root().should('be.visible')
        dialog.message().should('contain', 'currentSite')
        dialog.consequences().should('contain', 'jContentAccess')
        // The target names a permission, so the path has to be typed.
        dialog.confirm().should('be.disabled')

        dialog.cancel().click()

        readRole(withTarget).then((role) => {
            const target = role.grants.find((grant) => grant.id === 'currentSite-access')
            expect(target, 'the target is still there').to.not.be.undefined
            expect(target.directPermissions, 'with its permission').to.deep.eq(['jContentAccess'])
        })
    })

    it('removes the target once the path is typed, and only then', () => {
        RoleDetailPage.visit(withTarget).openIdentityTab()

        cy.get('[data-testid="role-remove-target-currentSite-access"]').click()
        dialog.word().type('currentSite')
        dialog.confirm().click()
        dialog.root().should('not.exist')

        readRole(withTarget).then((role) => {
            expect(
                role.grants.find((grant) => grant.id === 'currentSite-access'),
                'the target is gone',
            ).to.be.undefined
        })
    })
})
