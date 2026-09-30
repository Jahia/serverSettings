// The actions on the role page, and where each one leaves you.
//
// The page has one subject, so the header carries one rule: the action you came for is a button, and
// everything else that acts on the role as a whole is behind the menu. What matters in a test is not
// which control was clicked but where the administrator ends up, because an action that changes what
// the page is about cannot leave the page showing the old thing.
import gql from 'graphql-tag'
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
                    name
                    directPermissionNames
                }
            }
        }
    }
`

const read = (role: string) =>
    cy
        .apolloClient()
        .apollo({ query: READ, variables: { role }, fetchPolicy: 'no-cache' })
        .then((result) => result.data.admin.rolesAndPermissions.role)

describe('Roles and permissions - the actions on a role page', () => {
    const uniq = Date.now().toString(36)
    const source = `rpHeader${uniq}`
    const clone = `${source}-copy`
    const doomed = `rpDoomed${uniq}`

    before(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: source } })
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: source, permissions: ['clearLock', 'publish'] },
        })
    })

    after(() => {
        cy.login()
        ;[clone, doomed, source].forEach((role) => {
            cy.apolloClient().apollo({ mutation: DELETE, variables: { role } })
        })
    })

    beforeEach(() => {
        cy.login()
    })

    it('shows the permissions and nothing else, with the role name only in the page title', () => {
        const page = RoleDetailPage.visit(source)
        page.openPermissionsTab()

        // The page used to carry two tabs and a line repeating the role name under the header. Both
        // are gone: the header names the role, and the body is what the page is for.
        cy.get('[data-testid="role-detail-header"]').should('contain', source)
        cy.get('[data-testid="role-tab-permissions"]').should('not.exist')
        cy.get('[data-testid="role-tab-identity"]').should('not.exist')
    })

    it('opens the role settings from the header, and closing them leaves the page as it was', () => {
        const page = RoleDetailPage.visit(source)

        page.openIdentityTab()
        cy.get('[data-testid="role-edit-dialog"]').should('be.visible')

        page.closeEdit()
        cy.get('[data-testid="role-permissions-tab"]').should('be.visible')
    })

    it('carries clone, reset and delete behind one menu', () => {
        const page = RoleDetailPage.visit(source)
        page.openActionsMenu()

        cy.get('[data-testid="role-action-clone"]').should('be.visible')
        cy.get('[data-testid="role-action-reset"]').should('be.visible')
        cy.get('[data-testid="role-action-delete"]').should('be.visible')
    })

    it('lands on the copy after cloning, because the copy is what was asked for', () => {
        const page = RoleDetailPage.visit(source)
        page.chooseAction('clone')

        cy.get('[data-testid="role-name-input"]').clear()
        cy.get('[data-testid="role-name-input"]').type(clone)
        cy.get('[data-testid="role-name-confirm"]').click()

        // The address is the copy's, so the page can be sent to a colleague and reloaded.
        cy.location('search').should('contain', encodeURIComponent(clone))
        cy.get('[data-testid="role-detail-header"]').should('contain', clone)

        read(clone).then((role) => {
            expect(role.directPermissionNames, 'the copy names what the source names').to.include.members([
                'clearLock',
                'publish',
            ])
        })
    })

    it('goes back to the list after deleting, because the page has lost its subject', () => {
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: doomed } })

        const page = RoleDetailPage.visit(doomed)
        page.chooseAction('delete')

        // Nobody holds this role and nothing is nested inside it, so one confirmation is enough.
        cy.get('[data-testid="confirm-destructive-confirm"]').click()

        cy.get('[data-testid="role-table"]').should('be.visible')
        cy.get(`[data-testid="role-name-${doomed}"]`).should('not.exist')

        read(doomed).should('be.null')
    })

    // Where a role reaches is declared by the module that seeds it, and the old UI never offered to
    // change it either. The screen reads targets and creates none, so the settings form does not
    // carry a target editor at all.
    it('reads a target the role carries, and offers no way to add one', () => {
        cy.apolloClient().apollo({ mutation: ADD_TARGET, variables: { role: source, path: 'currentSite' } })

        const page = RoleDetailPage.visit(source)
        page.openPermissionsTab()
        cy.get('[data-testid="role-target-currentSite-access"]').should('be.visible')

        page.openIdentityTab()
        cy.get('[data-testid="role-targets-field"]').should('not.exist')
        cy.get('[data-testid="role-new-target-path"]').should('not.exist')
        cy.get('[data-testid="role-add-target"]').should('not.exist')
    })
})
