// The permission explorer, which answers the three questions the current screen cannot: what a
// permission is, which modules declare it, and which role grants it.
//
// The reverse index is the point of the screen, so the assertions on it are the strict ones. The
// `adminRoles` permission is granted by `server-administrator`, which names `admin` and never names
// `adminRoles`. So the row the screen shows has to say the permission comes through `admin`, and a
// screen that only listed role names would fail here.
//
// The list is the repository tree and not a re-arranged one. Two assertions hold that: the row of a
// permission states the logical path the repository gives it, and a permission the filters exclude
// disappears from the list rather than moving to a bucket.
import { PermissionExplorerPage } from '../page-object/PermissionExplorerPage'

describe('Roles and permissions - the permission explorer', () => {
    beforeEach(() => {
        cy.login()
    })

    it('lists the permissions of the instance, and states how many the filters keep', () => {
        const page = PermissionExplorerPage.visit()

        // jContent and one of the permissions it aggregates are both present, so the list carries the
        // whole tree and not only its roots.
        page.getRow('jContent').should('be.visible')
        page.getRow('jContentActions').should('be.visible')

        // The count names both numbers, so an administrator can tell a filtered list from a full one.
        page.getMatchCount().should('contain', 'permissions')
    })

    it('narrows the list by a search on the permission name', () => {
        const page = PermissionExplorerPage.visit()
        page.search('adminRoles')

        page.getVisibleNames().then((names) => {
            expect(names, 'the searched permission must be kept').to.include('adminRoles')
            // Every remaining row must match the search, which is what makes this a filter and not a
            // highlight.
            names.forEach((name) => {
                expect(name.toLowerCase(), `${name} must match the search`).to.contain('adminroles')
            })
        })
    })

    it('narrows the list by workspace, and the excluded permission disappears', () => {
        const page = PermissionExplorerPage.visit()

        // jcr:read_live and jcr:read_default are two permissions, and only the name suffix separates
        // them. Filtering on the live workspace must keep the first and drop the second.
        page.getRow('jcr:read_live').should('be.visible')
        page.getRow('jcr:read_default').should('be.visible')

        page.filterBy('workspace', 'LIVE')

        page.getRow('jcr:read_live').should('be.visible')
        cy.get('[data-testid="permission-row-jcr:read_default"]').should('not.exist')

        page.resetFilters()
        page.getRow('jcr:read_default').should('be.visible')
    })

    it('states the repository path of a permission, and the modules that declare it', () => {
        const page = PermissionExplorerPage.visit()
        const detail = page.select('editAction')

        // The path is the one the repository gives the permission, with the module and version prefix
        // removed. Nothing re-parents it.
        detail.getPath().should('have.text', '/permissions/jContent/jContentActions/editAction')

        // The jcontent module declares this permission under the jContent tree core seeds.
        detail.getModules().should('contain', 'jcontent')
    })

    it('names the roles that grant a permission, and why each one grants it', () => {
        const page = PermissionExplorerPage.visit()
        const detail = page.select('adminRoles')

        detail.getGrantedBy().should('be.visible')

        // server-administrator grants adminRoles on the node the role is granted on, and it grants it
        // through the admin permission it names. The row has to say so, because the role name alone
        // does not tell an administrator where to go to change it.
        detail
            .getUsage('server-administrator', 'currentNode')
            .should('contain', 'server-administrator')
            .and('contain', 'On the granted node')
            .and('contain', 'Granted through admin')
    })

    it('says a permission is aggregated, and lists what it aggregates', () => {
        const page = PermissionExplorerPage.visit()
        const detail = page.select('jContentActions')

        // editAction is a child of jContentActions in the repository, so granting the parent grants it.
        // The detail lists the children, which is what makes the consequence of a grant readable.
        detail.getChildren().should('contain', 'editAction')
    })

    it('shows no detail until a permission is selected', () => {
        const page = PermissionExplorerPage.visit()
        page.getEmptyDetail().should('be.visible')
        cy.get('[data-testid="permission-detail"]').should('not.exist')
    })
    it('draws the catalogue hierarchy, and never re-parents a permission', () => {
        const page = PermissionExplorerPage.visit()

        // The list is a Moonstone TreeView, so the depth is the tree's own aria-level and no longer a
        // padding this module wrote. jContentActions is a child of jContent in the repository, so it must
        // sit one level deeper. Nothing here asserts a pixel.
        page.getRow('jContent').should('have.attr', 'aria-level', '1')
        page.getRow('jContentActions').then(($child) => {
            const level = Number($child.attr('aria-level'))
            expect(level, 'a child sits deeper than its parent').to.be.greaterThan(1)
        })
    })

    it('shows a filtered result flat, because a match whose parent is filtered out has no parent', () => {
        const page = PermissionExplorerPage.visit()

        // Building a tree from a filtered subset would mean hanging an orphan somewhere it does not
        // belong, which is the re-parenting this interface refuses. A search result is a list.
        page.search('jContentActions')
        page.getRow('jContentActions').should('have.attr', 'aria-level', '1')
    })

    it('marks the selected row, and states the workspace of the permission picked', () => {
        const page = PermissionExplorerPage.visit()

        page.getRow('jcr:read_live').click()

        // The selected state is the tree's own aria state and not a class this module writes.
        page.getSelectedRow().should('have.attr', 'data-testid', 'permission-row-jcr:read_live')

        // The workspace marker moved off the row and into the detail pane, so this is where the
        // screen now states which workspace the permission decides in.
        page.getWorkspace().should('have.text', 'Live')
    })
})
