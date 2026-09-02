import { BaseComponent, BasePage, getComponent } from '@jahia/cypress'

/**
 * The new roles and permissions screen. Its route key is `rolesAndPermissionsV2`, and the administration
 * SPA turns a route key into the last path segment, so that key is the URL. The `rolesmanager` screen
 * keeps `rolesAndPermissions` and the two entries coexist.
 */
export class RolesAndPermissionsPage extends BasePage {
    static visit() {
        cy.visit('/jahia/administration/rolesAndPermissionsV2')
        return new RolesAndPermissionsPage()
    }

    getScopeBar() {
        return getComponent(ScopeBar)
    }

    /** Present only when the query failed, so a test can tell an error from an empty answer. */
    assertNoError() {
        cy.get('[data-testid="roles-error"]').should('not.exist')
        return this
    }
}

export class ScopeBar extends BaseComponent {
    static readonly defaultSelector = '[data-testid="roles-scope-bar"]'

    getScope(roleGroup: string) {
        return cy.get(`[data-testid="roles-scope-${roleGroup}"]`)
    }
}
