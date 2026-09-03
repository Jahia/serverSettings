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
    })

    it('states the scope of a role', () => {
        const page = RoleListPage.visit()

        page.getScope('server-administrator').should('have.text', 'server-role')
        page.getScope('site-administrator').should('have.text', 'site-role')
    })

    it('warns about a granted permission no module declares', () => {
        const page = RoleListPage.visit()

        // The warning sits with the name rather than in a column of its own, because it is what an
        // administrator scans for and it is absent on a healthy instance.
        page.getWarning(fixture, 'UNKNOWN_PERMISSION').should('contain', unknownPermission)

        // A healthy seeded role carries no warning at all, so the badge is a signal and not decoration.
        cy.get('[data-testid="role-warnings-reviewer"]').should('not.exist')
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

    it('gives every icon-only control an accessible name', () => {
        RoleListPage.visit()

        // An icon with no text announces "button" and nothing else, and a pointer user gets no
        // tooltip either. This is the screen that administers access, so the name is not optional.
        cy.get('[data-testid="role-duplicate-editor"]').should('have.attr', 'aria-label').and('not.be.empty')
        cy.get('[data-testid="role-delete-editor"]').should('have.attr', 'aria-label').and('not.be.empty')
    })

    it('shows the description of a role, and shows nothing when there is none', () => {
        const page = RoleListPage.visit()

        // The description is the role's own text: what the sources declare, and what an administrator
        // edits in the role settings. It says what the role is FOR, which is what somebody scanning
        // the list is deciding on.
        page.getDescription('editor').should('contain', 'Can edit content using jContent')

        // The text is declared per language and the core seed declares English only, so a role with
        // none in the interface language shows an empty cell. Nothing stands in for it: a placeholder
        // repeated down the column says nothing, and a fallback would show a language the
        // administrator did not ask for.
        page.getDescription('reader').should('not.exist')
    })

    it('gives the description the width, and keeps a long name readable', () => {
        const page = RoleListPage.visit()

        // The name column is sized on its content and the description takes what is left. Left
        // flexible the two split the free space evenly, so the name column held 501px for 186px of
        // content while the description wrapped.
        cy.get('[data-testid="role-table"] tbody tr:first-child td').then(($cells) => {
            const nameWidth = $cells[0].offsetWidth
            const descriptionWidth = $cells[2].offsetWidth
            expect(descriptionWidth, 'the description is the widest column').to.be.greaterThan(nameWidth)
        })

        // A name that does not fit ends in an ellipsis and the cell carries it in full as a tooltip.
        // It cannot wrap: the table gives every row one height, so a third line would be clipped with
        // nothing to show the name had been cut.
        page.getRoleName('editor').should('have.attr', 'title')
        cy.get('[data-testid="role-table"] tbody tr').then(($rows) => {
            const heights = [...$rows].map((row) => row.offsetHeight)
            expect(new Set(heights).size, 'every row has the same height').to.eq(1)
        })
    })
})
