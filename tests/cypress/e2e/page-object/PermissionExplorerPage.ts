import { BasePage } from '@jahia/cypress'

/**
 * The permission explorer. Its route key is `permissionsExplorer`, and the administration navigation
 * turns a route key into the last path segment, so that key is the URL.
 */
export class PermissionExplorerPage extends BasePage {
    static visit() {
        cy.visit('/jahia/administration/permissionsExplorer')
        const page = new PermissionExplorerPage()
        page.getList().should('be.visible')
        return page
    }

    getList() {
        return cy.get('[data-testid="permission-list"]')
    }

    getRow(permission: string) {
        return cy.get(`[data-testid="permission-row-${permission}"]`)
    }

    /**
     * The selected row, read from the tree's own aria state.
     *
     * The list is a Moonstone TreeView, so the selected state is `aria-selected` rather than a class
     * this module wrote. Asserting the aria state tests the behaviour and not the styling.
     */
    getSelectedRow() {
        return cy.get('[data-testid="permission-list"] [role="treeitem"][aria-selected="true"]')
    }

    /** The workspace marker, which sits in the detail pane and no longer on the row. */
    getWorkspace() {
        return cy.get('[data-testid="permission-detail-workspace"]')
    }

    /** Every permission name the list currently shows, in list order. */
    getVisibleNames(): Cypress.Chainable<string[]> {
        return this.getList()
            .find('[data-testid^="permission-row-"]')
            .then((rows) =>
                Cypress.$.makeArray(rows).map((row) =>
                    (row.getAttribute('data-testid') || '').replace('permission-row-', ''),
                ),
            )
    }

    search(text: string) {
        cy.get('[data-testid="permission-search"]').clear()
        if (text !== '') {
            cy.get('[data-testid="permission-search"]').type(text)
        }

        return this
    }

    resetFilters() {
        cy.get('[data-testid="permission-filter-reset"]').click()
        return this
    }

    /**
     * Pick a value in one of the filter dropdowns.
     *
     * Each option carries its own test attribute, so this does not depend on how Moonstone renders
     * the option list.
     *
     * @param group one of `workspace`, `area` or `module`
     * @param value the filter value, or `any` for the option that keeps everything
     */
    filterBy(group: string, value: string) {
        cy.get(`[data-testid="permission-filter-${group}"]`).click()
        cy.get(`[data-testid="permission-option-${group}-${value}"]`).click()
        return this
    }

    getMatchCount() {
        return cy.get('[data-testid="permission-match-count"]')
    }

    select(permission: string) {
        this.getRow(permission).click()
        cy.get('[data-testid="permission-detail"]').should('be.visible')
        return new PermissionDetailPane()
    }

    getEmptyDetail() {
        return cy.get('[data-testid="permission-detail-empty"]')
    }
}

export class PermissionDetailPane {
    getLabel() {
        return cy.get('[data-testid="permission-detail-label"]')
    }

    getPath() {
        return cy.get('[data-testid="permission-detail-path"]')
    }

    getModules() {
        return cy.get('[data-testid="permission-detail-modules"]')
    }

    getChildren() {
        return cy.get('[data-testid="permission-detail-children"]')
    }

    getGrantedBy() {
        return cy.get('[data-testid="permission-detail-granted-by"]')
    }

    /** One row of the "granted by" list. `grantId` is `currentNode` for the granted node. */
    getUsage(roleName: string, grantId: string) {
        return cy.get(`[data-testid="permission-usage-${roleName}-${grantId}"]`)
    }
}
