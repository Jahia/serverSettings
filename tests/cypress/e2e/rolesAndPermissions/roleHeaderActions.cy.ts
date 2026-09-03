// The actions on the role page, and where each one leaves you.
//
// The page has one subject, so the header carries one rule: the action you came for is a button, and
// everything else that acts on the role as a whole is behind the menu. What matters in a test is not
// which control was clicked but where the administrator ends up, because an action that changes what
// the page is about cannot leave the page showing the old thing.
import gql from 'graphql-tag'
import { RoleDetailPage } from '../page-object/RoleDetailPage'
import { RoleListPage } from '../page-object/RoleListPage'

const CREATE = gql`
    mutation Create($name: String!) {
        admin {
            rolesAndPermissions {
                createRole(name: $name, roleGroup: "edit-role")
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

    it('adds a target from the role settings, and the permissions view then offers it as a tab', () => {
        const page = RoleDetailPage.visit(source)
        page.addTarget('currentSite')

        // Where the role reaches is a property of the role, so it is edited in the settings. The
        // screen that grants permissions reads targets and never creates one.
        RoleListPage.visit()
        const again = RoleDetailPage.visit(source)
        again.openPermissionsTab()
        cy.get('[data-testid="role-target-currentSite-access"]').should('be.visible')
    })
})
