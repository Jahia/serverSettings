// Editing the permissions of a role, which is the screen the whole design exists for.
//
// The rule the interface follows: a preview appears when the effect exceeds the row the administrator
// clicked, and the change is applied with no question when it does not. So the specs below check both
// halves of that rule, and check the effect against the repository afterwards rather than against the
// screen alone.
//
// The hard case is a permission several levels below a granted one. `jContent` is granted, and
// `viewComponentRightsTab` sits three levels below it. One expansion would not free that row, so the
// write has to replace the grant on `jContent` with explicit grants at every level between the two.
// The dialog states that cost, and the assertion reads the stored names back over GraphQL.
//
// Every test runs on its own fixture role. A seeded role would make one test's write change what
// another test reads, and the roleModel spec asserts the exact grants of the seeded roles.
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
                    grants {
                        id
                        directPermissions
                        effectivePermissions {
                            name
                        }
                    }
                }
            }
        }
    }
`

/** The names the role's own target holds, read from the repository rather than from the screen. */
const storedNames = (role: string): Cypress.Chainable<string[]> =>
    cy
        .apolloClient()
        .apollo({ query: READ, variables: { role } })
        .then((result) => {
            const grants = result.data.admin.rolesAndPermissions.role.grants
            return grants.find((grant) => grant.id === '').directPermissions as string[]
        })

/** Every permission the role grants on its own target. */
const effectiveNames = (role: string): Cypress.Chainable<string[]> =>
    cy
        .apolloClient()
        .apollo({ query: READ, variables: { role } })
        .then((result) => {
            const grants = result.data.admin.rolesAndPermissions.role.grants
            return grants
                .find((grant) => grant.id === '')
                .effectivePermissions.map((effective) => effective.name) as string[]
        })

describe('Roles and permissions - editing what a role grants', () => {
    const uniq = Date.now().toString(36)
    const roles: string[] = []

    const newRole = (suffix: string, permissions: string[] = []) => {
        const name = `rpEdit${suffix}${uniq}`
        roles.push(name)
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name } })
        if (permissions.length > 0) {
            cy.apolloClient().apollo({ mutation: GRANT, variables: { role: name, permissions } })
        }

        return name
    }

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        cy.login()
        roles.forEach((role) => {
            cy.apolloClient().apollo({ mutation: DELETE, variables: { role } })
        })
    })

    it('grants a permission with no question, and stores its name', () => {
        const role = newRole('Grant')
        const page = RoleDetailPage.visit(role).openPermissionsTab()

        page.searchPermission('clearLock')
        page.getPermissionState('clearLock').should('eq', 'NOT_GRANTED')
        page.togglePermission('clearLock')

        // A grant never costs more than the row, so no dialog opens.
        page.getDialog().should('not.exist')
        page.getPermissionState('clearLock').should('eq', 'DIRECT')

        storedNames(role).should('deep.eq', ['clearLock'])
    })

    it('removes a permission with no question when nothing else goes with it', () => {
        const role = newRole('Immediate', ['clearLock'])
        const page = RoleDetailPage.visit(role).openPermissionsTab()

        page.searchPermission('clearLock')
        page.getPermissionState('clearLock').should('eq', 'DIRECT')
        page.togglePermission('clearLock')

        // clearLock aggregates nothing, so the removal costs exactly the row and applies at once.
        page.getDialog().should('not.exist')
        page.getPermissionState('clearLock').should('eq', 'NOT_GRANTED')

        storedNames(role).should('deep.eq', [])
    })

    it('states the aggregation before removing a permission that carries others', () => {
        const role = newRole('Cascade', ['viewRolesTab'])
        const page = RoleDetailPage.visit(role).openPermissionsTab()

        page.searchPermission('viewRolesTab')
        page.getPermissionState('viewRolesTab').should('eq', 'DIRECT')
        page.togglePermission('viewRolesTab')

        // The row is named by the target, so nothing is expanded. What exceeds the row is the three
        // permissions viewRolesTab aggregates, and the dialog says so before anything is written.
        page.getDialogHeadline().should('contain', 'also removes')
        page.getDialogLost().should('contain', 'viewComponentRightsTab')
        page.cancelDialog()

        // Cancelling writes nothing, which is the point of the preview.
        storedNames(role).should('deep.eq', ['viewRolesTab'])
    })

    it('expands every level between a granted ancestor and the permission removed', () => {
        const role = newRole('Expand', ['jContent'])
        const page = RoleDetailPage.visit(role).openPermissionsTab()

        page.searchPermission('viewComponentRightsTab')
        // Three levels sit between jContent and this permission, and jContent is what holds it.
        page.getPermissionState('viewComponentRightsTab').should('eq', 'IMPLIED')
        page.togglePermission('viewComponentRightsTab')

        page.getDialogHeadline().should('contain', 'jContent')
        page.getDialogRemoved().should('contain', 'jContent')
        // The names added are the siblings along the way down, at every level.
        page.getDialogAdded().should('contain', 'jContentActions')
        page.confirmDialog()

        // One write, every level. jContent is gone, its other children are named, and the permission
        // removed is no longer granted while its own siblings still are.
        storedNames(role).then((names) => {
            expect(names, 'jContent is replaced, not kept').to.not.include('jContent')
            expect(names, 'the siblings of the way down are named').to.include.members([
                'jContentActions',
                'viewEditRolesTab',
                'viewLiveRolesTab',
            ])
            expect(names, 'the permission removed is not named').to.not.include('viewComponentRightsTab')
        })

        effectiveNames(role).then((names) => {
            expect(names, 'the permission removed is no longer granted').to.not.include('viewComponentRightsTab')
            expect(names, 'its siblings are still granted').to.include('viewEditRolesTab')
            // Removing a permission under a granted ancestor stops the role granting that ancestor.
            // That is a real consequence, and the dialog listed it.
            expect(names, 'the role no longer grants the ancestor itself').to.not.include('jContent')
        })
    })

    it('refuses to remove a permission a parent role grants, and names that role', () => {
        // A sub-role of editor inherits everything editor grants, and no write here removes it.
        const name = `rpEditChild${uniq}`
        roles.push(name)
        cy.apolloClient().apollo({
            mutation: gql`
                mutation CreateChild($name: String!) {
                    admin {
                        rolesAndPermissions {
                            createRole(name: $name, parentRole: "editor", roleGroup: "edit-role")
                        }
                    }
                }
            `,
            variables: { name },
        })

        const page = RoleDetailPage.visit(name).openPermissionsTab()
        page.searchPermission('api-access')
        page.getPermissionState('api-access').should('eq', 'INHERITED')

        // The row is locked, so the checkbox cannot start the removal at all. That is the honest
        // control: no edit on this role frees the row.
        page.getPermissionCheckbox('api-access').should('be.disabled')
    })

    it('lets a role remove a name its parent role also grants, and says the grant stays', () => {
        // The two facts ADR-0001 keeps apart, on one row: the role NAMES the permission, and the
        // parent role HOLDS it. A redundant name is what an administrator opens this screen to clean
        // up, so the row has to stay editable and the caption has to state both facts.
        const name = `rpEditRedundant${uniq}`
        roles.push(name)
        cy.apolloClient().apollo({
            mutation: gql`
                mutation CreateChild($name: String!) {
                    admin {
                        rolesAndPermissions {
                            createRole(name: $name, parentRole: "editor", roleGroup: "edit-role")
                        }
                    }
                }
            `,
            variables: { name },
        })
        cy.apolloClient().apollo({
            mutation: GRANT,
            variables: { role: name, permissions: ['api-access'] },
        })

        const page = RoleDetailPage.visit(name).openPermissionsTab()
        page.searchPermission('api-access')

        // Both facts are on the row, and neither is written in the caption any more. That the role
        // names it is the DIRECT state and the enabled checkbox; that the parent holds it too is the
        // chip beside the label. The caption is the technical name, on every row.
        page.getPermissionState('api-access').should('eq', 'DIRECT')
        page.getPermissionCheckbox('api-access').should('not.be.disabled')
        cy.get('[data-testid="role-permission-inherited-api-access"]').should('contain', 'editor')
        cy.get('[data-testid="role-permission-name-api-access"]').should('have.text', 'api-access')

        page.togglePermission('api-access')

        // The dialog states what the removal does and what it does not do, and offers to apply it.
        page.getDialogHeadline().should('contain', 'editor')
        page.getDialogRemoved().should('contain', 'api-access')
        page.confirmDialog()

        storedNames(name).should('deep.eq', [])
        effectiveNames(name).then((names) => {
            expect(names, 'the parent role goes on granting it').to.include('api-access')
        })
        page.getPermissionState('api-access').should('eq', 'INHERITED')
    })

    it('groups the children of a permission back onto it, and states what that starts granting', () => {
        const role = newRole('Group', ['viewComponentRightsTab', 'viewEditRolesTab', 'viewLiveRolesTab'])
        const page = RoleDetailPage.visit(role).openPermissionsTab()

        page.searchPermission('viewRolesTab')
        // The target names every direct child, so the parent is offered as a grouping.
        page.getPermissionState('viewRolesTab').should('eq', 'NOT_GRANTED')
        page.groupOnto('viewRolesTab')

        // The role starts granting the parent, which it did not grant before. The dialog says so,
        // because a check on that permission would start passing.
        page.getDialogHeadline().should('contain', 'viewRolesTab')
        page.getDialogLost().should('contain', 'viewRolesTab')
        page.confirmDialog()

        storedNames(role).should('deep.eq', ['viewRolesTab'])
        effectiveNames(role).then((names) => {
            expect(names, 'the children stay granted').to.include.members([
                'viewComponentRightsTab',
                'viewEditRolesTab',
                'viewLiveRolesTab',
            ])
            expect(names, 'and the parent is granted now').to.include('viewRolesTab')
        })
    })

    it('counts what the role grants per area, against what the area holds', () => {
        const role = newRole('Counts', ['viewRolesTab'])
        const page = RoleDetailPage.visit(role).openPermissionsTab()

        // viewRolesTab and the three permissions it aggregates all sit in the jContent area, so the
        // count states four even though the target names one.
        page.getAreaCount('jContent').should('contain', '4 of')
        page.getAreaCount('admin').should('contain', '0 of')
    })

    it('marks the selected area in the rail', () => {
        const page = RoleDetailPage.visit('editor').openPermissionsTab()
        page.selectArea('admin')

        // The rail is a Moonstone TreeView, so which area is selected is the tree's own aria state.
        page.getSelectedArea().should('have.attr', 'data-testid', 'role-area-admin')
    })

    // The caption under a label used to be shared: a reason when there was one, the technical name
    // otherwise. So the rows that carried the most information were the ones that hid the name, and
    // jcr:write_default was unreadable on exactly the rows an administrator was investigating.
    it('states the technical name of every permission, whatever holds it', () => {
        const page = RoleDetailPage.visit('editor').openPermissionsTab()
        page.searchPermission('jcr:write_default')

        cy.get('[data-testid="role-permission-name-jcr:write_default"]').should('have.text', 'jcr:write_default')
    })

    // A row locked by a parent role cannot be unticked from this role, so the reason for the disabled
    // checkbox stays. It sits beside the label and no longer takes the caption the name needs.
    it('names the parent role that locks a row, beside the label and not instead of the name', () => {
        // editor-in-chief is nested inside editor, and editor grants api-access, so the row is locked
        // on the child and no edit on the child frees it.
        const page = RoleDetailPage.visit('editor-in-chief').openPermissionsTab()
        page.searchPermission('api-access')

        cy.get('[data-testid="role-permission-inherited-api-access"]').should('contain', 'editor')
        cy.get('[data-testid="role-permission-name-api-access"]').should('have.text', 'api-access')
        page.getPermissionCheckbox('api-access').should('be.disabled')
    })

    // A tab says where the role reaches. `/` and `/modules` say nothing to an administrator, and the
    // granted node of a server role is the whole server rather than a piece of content, so one kind
    // reads differently depending on the scope.
    it('names a grant target in words rather than as a path', () => {
        RoleDetailPage.visit('system-administrator').openPermissionsTab()
        cy.get('[data-testid="role-target-currentNode"]').should('contain', 'On the system tools')
        cy.get('[data-testid="role-target-root-access"]').should('contain', 'On the whole server')

        RoleDetailPage.visit('server-administrator').openPermissionsTab()
        cy.get('[data-testid="role-target-currentNode"]').should('contain', 'On the whole server')
        cy.get('[data-testid="role-target-currentSite-access"]').should('contain', 'On the system site')

        RoleDetailPage.visit('editor').openPermissionsTab()
        cy.get('[data-testid="role-target-currentNode"]').should('contain', 'On the granted node')
    })

    it('gives every permission checkbox an accessible name', () => {
        const page = RoleDetailPage.visit('editor').openPermissionsTab()
        page.searchPermission('clearLock')

        // Moonstone's Field renders a label with no htmlFor, and the row's own label is a sibling
        // span, so the input has no accessible name of its own. A checkbox that decides a permission
        // announced as "checkbox" alone is unusable without sight of the row.
        page.getPermissionCheckbox('clearLock').should('have.attr', 'aria-label').and('not.be.empty')
    })
})
