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
     * Wait for the permissions to be on screen.
     *
     * The page used to carry two tabs and now carries one subject, so there is nothing to click: the
     * permissions ARE the page. The method stays because what a spec means by it has not changed.
     */
    openPermissionsTab() {
        cy.get('[data-testid="role-permissions-tab"]').should('be.visible')
        return this
    }

    /**
     * Open the role's own settings.
     *
     * These used to be a tab beside the permissions. Editing the role is a detour from deciding what
     * it grants, so it is a dialog opened from the header, the way creating a role is.
     */
    openIdentityTab() {
        cy.get('[data-testid="role-edit"]').click()
        cy.get('[data-testid="role-identity-tab"]').should('be.visible')
        return this
    }

    closeEdit() {
        cy.get('[data-testid="role-edit-close"]').click()
        cy.get('[data-testid="role-edit-dialog"]').should('not.exist')
        return this
    }

    /** Open the header menu that carries every action on the role as a whole. */
    openActionsMenu() {
        cy.get('[data-testid="role-more-actions"]').click()
        cy.get('[data-testid="role-actions-menu"]').should('be.visible')
        return this
    }

    /** One action from the header menu: `clone`, `reset` or `delete`. */
    chooseAction(action: 'clone' | 'reset' | 'delete') {
        this.openActionsMenu()
        cy.get(`[data-testid="role-action-${action}"]`).click()
        return this
    }

    back() {
        cy.get('[data-testid="role-detail-back"]').click()
        cy.get('[data-testid="role-table"]').should('be.visible')
    }

    // ----- the permissions tab -----

    /**
     * Pick a target. Pass `currentNode` for the node the role is granted on.
     *
     * A target is a tab, and Moonstone gives the selected tab `pointer-events: none`, so a click on
     * the tab already open can never land. The click is conditional on the tab not being selected.
     */
    selectTarget(targetId: string) {
        cy.get(`[data-testid="role-target-${targetId}"]`).then((element) => {
            if (element.attr('aria-selected') !== 'true') {
                cy.wrap(element).click()
            }
        })
        return this
    }

    /**
     * Add a target to the role.
     *
     * A target is where the role reaches, which is a property of the role, so it is added from the
     * edit dialog and no longer from the screen that grants permissions.
     */

    selectArea(area: string) {
        cy.get(`[data-testid="role-area-${area}"]`).click()
        // The pane renders the area's own rows, so waiting on one of them avoids acting on the
        // previous area's list.
        cy.get('[data-testid="role-permissions-tab"]').should('be.visible')
        return this
    }

    /**
     * The area row, which carries its own granted/total count.
     *
     * The count used to be a separate element. The rail is a Moonstone TreeView now, and a tree row
     * takes a string label and an icon beside it, so the count is part of the label.
     */
    getAreaCount(area: string) {
        return cy.get(`[data-testid="role-area-${area}"]`)
    }

    /** The area rail row that is selected, read from the tree's own aria state. */
    getSelectedArea() {
        return cy.get('[data-testid="role-area-rail"] [role="treeitem"][aria-selected="true"]')
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

    getDescriptionInput() {
        return cy.get('[data-testid="role-description-input"]')
    }

    /** Switch the language the title and the description are written in. */
    chooseTextLanguage(code: string) {
        cy.get('[data-testid="role-language-select"]').click()
        cy.get(`[data-testid="role-language-option-${code}"]`).click()
        return this
    }

    /** Open the node type multi-select and narrow it. Pass an empty string to list everything. */
    searchNodeTypes(text: string) {
        cy.get('[data-testid="role-nodetypes-select"]').click()
        if (text !== '') {
            // Moonstone renders the menu in a portal, so the search box is not inside the select, and
            // the permission search on the page behind is a searchbox too.
            cy.get('.moonstone-menu_searchInput [role="searchbox"]').type(text)
        }

        return this
    }

    /** Tick or untick one node type. The menu has to be open already. */
    toggleNodeType(name: string) {
        cy.get(`[data-testid="role-nodetype-option-${name}"]`).click()
        return this
    }

    closeNodeTypes() {
        cy.get('[data-testid="role-nodetypes-select"]').click()
        return this
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
