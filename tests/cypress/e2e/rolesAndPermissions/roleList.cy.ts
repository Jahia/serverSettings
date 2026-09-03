// The role list, and the four facts it states that the current screen does not.
//
// The two permission columns are the point of the screen. A role NAMES a set of permissions, and that
// set REACHES further once aggregation and role inheritance apply. One number would hide the model the
// whole interface is built on, so the assertions below check that the two disagree on a role where
// they must, and that the reach cell attributes part of itself to the parent role.
//
// The scope column and the grantable-on column are the role scope metadata. `j:roleGroup` says which
// scope family a role belongs to, and `j:nodeTypes` says where it can be granted. Neither value is
// invented by this screen, and `site-administrator` is the seeded role where the two disagree: it is
// declared a site role and carries no node type, so it can be granted on any node type.
//
// The privileged flag is read on the whole role chain, because `AclListener` reads
// `j:privilegedAccess` on the role and on every ancestor. The fixture role below sets no property of
// its own and must still be reported privileged, through its parent.
//
// The fixture also carries a permission no module declares, which is one of the three warnings the
// screen reports. It is created with the generic JCR mutation of `graphql-dxm-provider`.
import gql from 'graphql-tag'
import { RoleListPage } from '../page-object/RoleListPage'

const ADD_ROLE = gql`
    mutation AddFixtureRole($parentPath: String!, $name: String!, $permissions: [String!]!) {
        jcr {
            mutateNode(pathOrId: $parentPath) {
                addChild(name: $name, primaryNodeType: "jnt:role") {
                    mutateProperty(name: "j:permissionNames") {
                        setValues(values: $permissions, type: STRING)
                    }
                }
            }
        }
    }
`

const DELETE_ROLE = gql`
    mutation DeleteFixtureRole($path: String!) {
        jcr {
            deleteNode(pathOrId: $path)
        }
    }
`

describe('Roles and permissions - the role list', () => {
    const uniq = Date.now().toString(36)
    const fixture = `rpListFixture${uniq}`
    const fixturePath = `/roles/editor/${fixture}`
    const unknownPermission = `rpNoSuchPermission${uniq}`

    before(() => {
        cy.login()
        cy.apolloClient().apollo({
            mutation: ADD_ROLE,
            variables: { parentPath: '/roles/editor', name: fixture, permissions: [unknownPermission] },
        })
    })

    after(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: DELETE_ROLE, variables: { path: fixturePath } })
    })

    beforeEach(() => {
        cy.login()
    })

    it('lists the roles of the instance, including the ones hidden from the picker', () => {
        const page = RoleListPage.visit()

        page.getRoleName('editor').should('be.visible')
        // `translator` sets j:hidden, so the access control picker does not offer it. This screen
        // administers roles, so it must still list it.
        page.getRoleName('translator').should('be.visible')
        cy.get('[data-testid="role-hidden-translator"]').should('be.visible')
    })

    it('states the scope of a role', () => {
        const page = RoleListPage.visit()

        page.getScope('server-administrator').should('have.text', 'server-role')
        page.getScope('site-administrator').should('have.text', 'site-role')
    })

    it('says what a role grants, in the words the rest of the interface uses', () => {
        const page = RoleListPage.visit()

        // The cell carries permission labels and not permission names, because the row is read by
        // somebody deciding which role to open. The server reduces the role's own names to the ones
        // no other listed name already covers, so nothing here repeats itself.
        page.getGrants('reader').should('contain', 'Add comment')
        page.getGrants('reader').should('not.contain', 'addComment')

        // A role that names nothing of its own says so, rather than showing an empty cell that could
        // equally mean the screen failed to load.
        page.getGrants('jahiapp-user').should('contain', 'Nothing of its own')
    })

    it('says a nested role ADDS, because its parent already grants the rest', () => {
        const page = RoleListPage.visit()

        // editor-in-chief is nested inside editor, so what it names is what it adds on top. Reading
        // the same cell as a complete list of what the role grants would be wrong by everything the
        // parent grants.
        page.getGrants('editor-in-chief').should('contain', 'Adds')
        page.getGrants('editor').should('not.contain', 'Adds')
    })

    it('reports a role as privileged when only an ancestor role sets the property', () => {
        const page = RoleListPage.visit()

        // The fixture sets no j:privilegedAccess. Its parent, editor, does, and AclListener reads the
        // whole chain, so granting the fixture makes the principal privileged.
        page.getPrivilegedFlag(fixture).should('contain', 'Privileged via editor')

        // editor sets the property itself, so its flag names no parent.
        page.getPrivilegedFlag('editor').should('have.text', 'Privileged access')
    })

    it('warns about a granted permission no module declares', () => {
        const page = RoleListPage.visit()

        page.getWarning(fixture, 'UNKNOWN_PERMISSION').should('contain', unknownPermission)

        // A healthy seeded role carries no warning at all, so the badge is a signal and not decoration.
        page.getFlags('reviewer').find('[data-testid^="role-warning-"]').should('not.exist')
    })

    it('narrows the list by scope, and the excluded role disappears', () => {
        const page = RoleListPage.visit()

        page.getRoleName('server-administrator').should('be.visible')
        page.getRoleName('reader').should('be.visible')

        page.filterByScope('server-role')

        page.getRoleName('server-administrator').should('be.visible')
        // reader is a live-role, so the server-role filter must drop it.
        cy.get('[data-testid="role-name-reader"]').should('not.exist')

        page.filterByScope('any')
        page.getRoleName('reader').should('be.visible')
    })

    it('narrows the list by a search on the role name', () => {
        const page = RoleListPage.visit()
        page.search('translator')

        page.getVisibleRoles().then((roles) => {
            expect(roles, 'the searched role must be kept').to.include('translator')
            roles.forEach((role) => {
                expect(role.toLowerCase(), `${role} must match the search`).to.contain('translator')
            })
        })
    })
})
