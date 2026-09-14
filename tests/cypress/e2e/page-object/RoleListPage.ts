import { BasePage } from '@jahia/cypress'

/**
 * The role list. Its route key is `rolesAndPermissionsV2`, and the administration navigation turns a
 * route key into the last path segment, so that key is the URL. The `rolesmanager` screen keeps
 * `rolesAndPermissions`, and the two entries are meant to coexist.
 */
export class RoleListPage extends BasePage {
    static visit() {
        cy.visit('/jahia/administration/rolesAndPermissionsV2')
        const page = new RoleListPage()
        page.getTable().should('be.visible')
        return page
    }

    getTable() {
        return cy.get('[data-testid="role-table"]')
    }

    getRoleName(role: string) {
        return cy.get(`[data-testid="role-name-${role}"]`)
    }

    /** The role's own description, in the interface language. */
    getDescription(role: string) {
        return cy.get(`[data-testid="role-description-${role}"]`)
    }

    getScope(role: string) {
        return cy.get(`[data-testid="role-scope-${role}"]`)
    }

    getWarning(role: string, code: string) {
        return cy.get(`[data-testid="role-warning-${role}-${code}"]`)
    }

    /** Every role name the table currently shows, in table order. */
    getVisibleRoles(): Cypress.Chainable<string[]> {
        return this.getTable()
            .find('[data-testid^="role-name-"]')
            .then((cells) =>
                Cypress.$.makeArray(cells).map((cell) =>
                    (cell.getAttribute('data-testid') || '').replace('role-name-', ''),
                ),
            )
    }

    search(text: string) {
        cy.get('[data-testid="role-search"]').clear()
        if (text !== '') {
            cy.get('[data-testid="role-search"]').type(text)
        }

        return this
    }

    /** Narrow the list to one scope. Pass `any` for the chip that keeps every role. */
    /**
     * Show one scope.
     *
     * A role belongs to exactly one scope, so choosing one is switching view rather than narrowing a
     * set. That is a tab, and Moonstone gives the selected tab `pointer-events: none`, so the click is
     * conditional on the tab not being selected.
     */
    filterByScope(scope: string) {
        cy.get(`[data-testid="role-scope-tab-${scope}"]`).then((element) => {
            if (element.attr('aria-selected') !== 'true') {
                cy.wrap(element).click()
            }
        })
        return this
    }

    getMatchCount() {
        return cy.get('[data-testid="role-match-count"]')
    }
}
