import { BasePage } from '@jahia/cypress'

/**
 * The role detail. One administration route carries the list and the detail, and the role name lives
 * in the query string, so a role is deep-linkable.
 */
export class RoleDetailPage extends BasePage {
    static visit(roleName: string) {
        cy.visit(`/jahia/administration/rolesAndPermissionsV2?role=${encodeURIComponent(roleName)}`)
        const page = new RoleDetailPage()
        cy.get('[data-testid="role-detail-header"]').should('be.visible')
        return page
    }

    /**
     * Select one tab.
     *
     * Moonstone gives the selected tab `pointer-events: none`, so clicking the tab already open can
     * never land. The click is therefore conditional on the tab not being selected.
     */
    private openTab(tab: string, panel: string) {
        cy.get(`[data-testid="role-tab-${tab}"]`).then((element) => {
            if (element.attr('aria-selected') !== 'true') {
                cy.wrap(element).click()
            }
        })
        cy.get(`[data-testid="${panel}"]`).should('be.visible')
        return this
    }

    openPermissionsTab() {
        return this.openTab('permissions', 'role-permissions-tab')
    }

    openIdentityTab() {
        return this.openTab('identity', 'role-identity-tab')
    }

    back() {
        cy.get('[data-testid="role-detail-back"]').click()
        cy.get('[data-testid="role-table"]').should('be.visible')
    }

    // ----- the permissions tab -----

    /** Pick a target. Pass `currentNode` for the node the role is granted on. */
    selectTarget(targetId: string) {
        cy.get(`[data-testid="role-target-${targetId}"]`).click()
        return this
    }

    selectArea(area: string) {
        cy.get(`[data-testid="role-area-${area}"]`).click()
        // The pane renders the area's own rows, so waiting on one of them avoids acting on the
        // previous area's list.
        cy.get('[data-testid="role-permissions-tab"]').should('be.visible')
        return this
    }

    getAreaCount(area: string) {
        return cy.get(`[data-testid="role-area-count-${area}"]`)
    }

    searchPermission(text: string) {
        cy.get('[data-testid="role-permission-search"]').clear()
        if (text !== '') {
            cy.get('[data-testid="role-permission-search"]').type(text)
        }

        return this
    }

    getPermissionRow(permission: string) {
        return cy.get(`[data-testid="role-permission-${permission}"]`)
    }

    /** The row state the interface derived: NOT_GRANTED, DIRECT, IMPLIED or INHERITED. */
    getPermissionState(permission: string) {
        return this.getPermissionRow(permission).invoke('attr', 'data-state')
    }

    getPermissionCheckbox(permission: string) {
        return cy.get(`[data-testid="role-permission-checkbox-${permission}"]`)
    }

    togglePermission(permission: string) {
        this.getPermissionCheckbox(permission).click()
        return this
    }

    groupOnto(permission: string) {
        cy.get(`[data-testid="role-collapse-${permission}"]`).click()
        return this
    }

    // ----- the change dialog -----

    getDialog() {
        return cy.get('[data-testid="permission-change-dialog"]')
    }

    getDialogHeadline() {
        return cy.get('[data-testid="permission-change-headline"]')
    }

    getDialogLost() {
        return cy.get('[data-testid="permission-change-lost"]')
    }

    getDialogAdded() {
        return cy.get('[data-testid="permission-change-added"]')
    }

    getDialogRemoved() {
        return cy.get('[data-testid="permission-change-removed"]')
    }

    confirmDialog() {
        cy.get('[data-testid="permission-change-confirm"]').click()
        this.getDialog().should('not.exist')
        return this
    }

    cancelDialog() {
        cy.get('[data-testid="permission-change-cancel"]').click()
        this.getDialog().should('not.exist')
        return this
    }

    // ----- the identity tab -----

    getTitleInput() {
        return cy.get('[data-testid="role-title-input"]')
    }

    getNodeTypesInput() {
        return cy.get('[data-testid="role-nodetypes-input"]')
    }

    /**
     * Save the identity tab, and wait for the screen to confirm it.
     *
     * Without the wait a read of the repository races the write, and the race is winnable, which is
     * worse than losing it: the test passes some of the time.
     */
    saveIdentity() {
        cy.get('[data-testid="role-identity-save"]').click()
        cy.get('[data-testid="role-identity-saved"]').should('be.visible')
        return this
    }
}
