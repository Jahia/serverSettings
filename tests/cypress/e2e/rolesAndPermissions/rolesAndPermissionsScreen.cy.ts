// The new roles and permissions screen renders, and it renders from live data.
//
// Two facts make this more than a smoke test. The screen asserts a role group name that comes from the
// repository and not from the interface bundle, so a screen that rendered its own labels and no data
// would fail here. And it asserts that the error pane is absent, so an empty scope bar cannot pass as a
// successful render.
//
// The route key is `rolesAndPermissionsV2`, which the administration SPA also uses as the URL segment.
// The `rolesmanager` screen keeps `rolesAndPermissions`, and this spec asserts nothing about it: the two
// entries are meant to coexist and this module does not own the other one.
import { RolesAndPermissionsPage } from '../page-object/RolesAndPermissionsPage'

describe('Roles and permissions - the screen', () => {
    beforeEach(() => {
        cy.login()
    })

    it('renders the scope bar from the repository role groups', () => {
        const page = RolesAndPermissionsPage.visit()
        page.assertNoError()

        const scopeBar = page.getScopeBar()
        scopeBar.get().should('be.visible')

        // `edit-role` and `server-role` are seeded by core in root-roles.xml, so they are present on every
        // instance. Naming them ties the assertion to repository data rather than to a rendered constant.
        scopeBar.getScope('edit-role').should('be.visible')
        scopeBar.getScope('server-role').should('be.visible')
    })
})
