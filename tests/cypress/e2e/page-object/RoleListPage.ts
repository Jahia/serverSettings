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

    getScope(role: string) {
        return cy.get(`[data-testid="role-scope-${role}"]`)
    }

    getNodeTypes(role: string) {
        return cy.get(`[data-testid="role-nodetypes-${role}"]`)
    }

    /** The count of permissions the role's own targets name. */
    getNamedCount(role: string) {
        return cy.get(`[data-testid="role-named-${role}"]`)
    }

    /** The count of permissions the role grants across every target. */
    getReachCount(role: string) {
        return cy.get(`[data-testid="role-reach-count-${role}"]`)
    }

    /**
     * The caption naming the part of the reach a parent role contributes. Absent on a role with no
     * parent, so a test asserts on its absence rather than on a zero.
     */
    getInheritedCaption(role: string) {
        return cy.get(`[data-testid="role-inherited-count-${role}"]`)
    }

    getFlags(role: string) {
        return cy.get(`[data-testid="role-flags-${role}"]`)
    }

    getPrivilegedFlag(role: string) {
        return cy.get(`[data-testid="role-privileged-${role}"]`)
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
    filterByScope(scope: string) {
        cy.get(`[data-testid="role-scope-filter-${scope}"]`).click()
        return this
    }

    getMatchCount() {
        return cy.get('[data-testid="role-match-count"]')
    }
}
