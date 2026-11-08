import { BasePage } from '@jahia/cypress'

export interface UserFormData {
    username?: string
    firstName?: string
    lastName?: string
    email?: string
    organization?: string
    password?: string
    passwordConfirm?: string
    preferredLanguage?: string
}

/** The five properties the "search in properties" filter can be scoped to (legacy UsersAndRoles.PROPERTY). */
export enum SearchProperty {
    USERNAME = 'propsUsersname',
    FIRSTNAME = 'propsFirstName',
    LASTNAME = 'propsLastName',
    EMAIL = 'propsEmail',
    ORGANISATION = 'propsOrganization',
}

export class ManageUsersPage extends BasePage {
    static readonly IFRAME_SELECTOR = 'iframe[src*="manageUsers"]'

    static visit(): ManageUsersPage {
        cy.visit('/jahia/administration/manageUsers')
        const page = new ManageUsersPage()
        cy.frameLoaded(ManageUsersPage.IFRAME_SELECTOR)
        return page
    }

    iframe() {
        return cy.iframe(ManageUsersPage.IFRAME_SELECTOR)
    }

    /*
     * Poll the iframe's live document until `selector` is present, instead of a
     * fixed delay. This reliably waits for the (re)loaded page after an action
     * that navigates the iframe. `selector` may be a grouped CSS selector
     * (e.g. "a, b") to wait for any one of several possible landing states.
     */
    private waitForIframeElement(selector: string, timeout = 10000): ManageUsersPage {
        cy.waitUntil(
            () =>
                cy.get(ManageUsersPage.IFRAME_SELECTOR).then(($iframe) => $iframe.contents().find(selector).length > 0),
            {
                errorMsg: `Timed out waiting for "${selector}" to appear in the iframe`,
                timeout,
                interval: 200,
            },
        )
        return this
    }

    /* Open the "Create new user" form. */
    openCreateForm(): ManageUsersPage {
        this.iframe().find('button[onclick*="addUser"]').click()
        return this.waitForIframeElement('#username')
    }

    /* Clear a field, then type into it only if there is something to type - cy.type('') throws. */
    private clearAndType(selector: string, value: string): void {
        const field = this.iframe().find(selector).clear()
        if (value !== '') {
            field.type(value)
        }
    }

    /* Fill the create/edit user form. Only provided fields are typed. */
    fillForm(data: UserFormData): ManageUsersPage {
        if (data.username !== undefined) {
            this.clearAndType('#username', data.username)
        }
        if (data.firstName !== undefined) {
            this.clearAndType('#firstName', data.firstName)
        }
        if (data.lastName !== undefined) {
            this.clearAndType('#lastName', data.lastName)
        }
        if (data.email !== undefined) {
            this.clearAndType('#email', data.email)
        }
        if (data.organization !== undefined) {
            this.clearAndType('#organization', data.organization)
        }
        if (data.password !== undefined) {
            this.clearAndType('#password', data.password)
        }
        if (data.passwordConfirm !== undefined) {
            this.clearAndType('#passwordConfirm', data.passwordConfirm)
        }
        if (data.preferredLanguage !== undefined) {
            this.iframe().find('#preferredLanguage').select(data.preferredLanguage)
        }
        return this
    }

    /* Submit the create-user form. */
    submitCreate(): ManageUsersPage {
        this.iframe().find('button[type="submit"][name="_eventId_add"]').click()
        // Success returns to the user list ("Create new user" button); a validation
        // error re-renders the form with an alert. Wait for either outcome.
        return this.waitForIframeElement('button[onclick*="addUser"], .alert-danger')
    }

    /* Submit the edit-user form. */
    submitUpdate(): ManageUsersPage {
        this.iframe().find('button[type="submit"][name="_eventId_update"]').click()
        return this.waitForIframeElement('button[onclick*="addUser"], .alert-danger')
    }

    verifyErrorMessage(message: string): ManageUsersPage {
        this.iframe().find('.alert-danger').should('contain', message)
        return this
    }

    verifyUserListed(username: string): ManageUsersPage {
        this.iframe().contains('a', username).should('exist')
        return this
    }

    verifyUserNotListed(username: string): ManageUsersPage {
        this.iframe().contains('a', username).should('not.exist')
        return this
    }

    /* Type a term in the search box and submit the search. */
    search(term: string): ManageUsersPage {
        const field = this.iframe().find('input[name="searchString"]').clear()
        if (term !== '') {
            field.type(term)
        }
        this.iframe().find('button[name="_eventId_search"]').click()
        // Wait for the results list to be rendered again.
        return this.waitForIframeElement('button[onclick*="addUser"]')
    }

    /* Open an existing user for editing by clicking its link. */
    openUser(username: string): ManageUsersPage {
        this.iframe().contains('a', username).click()
        // Wait for the edit form to load.
        return this.waitForIframeElement('#organization')
    }

    /* Click the "Export or Remove" fab button for the given user. */
    openExportOrRemove(username: string): ManageUsersPage {
        this.iframe().find(`a[title="Export or Remove"][onclick*="/${username}'"]`).click()
        // Wait for the Export/Remove page to load.
        return this.waitForIframeElement('button[data-target="#confirmDeleteModal"]')
    }

    /* On the Export/Remove page, verify all input fields are disabled. */
    verifyAllFieldsDisabled(): ManageUsersPage {
        this.iframe()
            .find('input.form-control')
            .each(($el) => {
                cy.wrap($el).should('be.disabled')
            })
        return this
    }

    /* Trigger the delete confirmation modal and confirm the deletion. */
    deleteFromRemovePage(): ManageUsersPage {
        this.iframe().find('button[data-target="#confirmDeleteModal"]').click()
        // The confirmation modal is toggled by JS; assert it is visible (retries).
        this.iframe().find('#confirmDeleteModal').should('be.visible')
        this.iframe()
            .find('#confirmDeleteModal')
            .find('button[name="_eventId_delete"], button.btn-danger, a.btn-danger')
            .last()
            .click()
        // Deletion returns to the user list.
        return this.waitForIframeElement('button[onclick*="addUser"]')
    }

    /* On the Export/Remove page, verify the Export link points to the export archive. */
    verifyExportLink(username: string): ManageUsersPage {
        this.iframe()
            .find('a.pull-right')
            .filter(`[href*="/cms/export/"][href*="/${username}.zip"]`)
            .should('have.attr', 'href')
            .and('include', `/${username}.zip`)
        return this
    }

    /* Cancel an in-progress create/edit form without saving. */
    cancel(): ManageUsersPage {
        this.iframe().find('button[type="submit"][name="_eventId_cancel"], a[name="_eventId_cancel"]').click()
        return this.waitForIframeElement('button[onclick*="addUser"]')
    }

    /* Verify a form field currently shows the given value (used to confirm cancel discarded an edit). */
    verifyFieldValue(field: string, value: string): ManageUsersPage {
        this.iframe().find(`#${field}`).should('have.value', value)
        return this
    }

    verifyNoUsersFoundMessage(): ManageUsersPage {
        this.iframe().should('contain', 'No users found.')
        return this
    }

    /*
     * Toggle "search in properties" and scope the search to exactly the given properties.
     * Passing no properties unchecks the master toggle (unscoped search).
     */
    filterSearchProperties(properties: SearchProperty[]): ManageUsersPage {
        // These checkboxes are styled via CSS (the native <input> has zero visible size, a
        // sibling element carries the visible icon), so Cypress's actionability check on the
        // input itself always fails - {force: true} is required, matching why the legacy
        // Selenium suite routed every checkbox click through its own
        // functions.getCheckableElementLocator() helper instead of a plain click.
        const searchInProperties = this.iframe().find('#searchInProperties')
        if (properties.length === 0) {
            searchInProperties.then(($el) => {
                if (($el as unknown as HTMLInputElement[])[0]?.checked) {
                    cy.wrap($el).click({ force: true })
                }
            })
            return this
        }
        searchInProperties.then(($el) => {
            if (!($el as unknown as HTMLInputElement[])[0]?.checked) {
                cy.wrap($el).click({ force: true })
            }
        })
        properties.forEach((prop) => {
            this.iframe()
                .find(`#${prop}`)
                .then(($el) => {
                    if (!($el as unknown as HTMLInputElement[])[0]?.checked) {
                        cy.wrap($el).click({ force: true })
                    }
                })
        })
        return this
    }

    /* Select every visible bulk-delete checkbox for the given usernames. */
    selectUsersForRemoval(usernames: string[]): ManageUsersPage {
        usernames.forEach((username) => {
            this.iframe().find(`input.userCheckbox[value*="/${username}"]`).click({ force: true })
        })
        return this
    }

    /* Click "Remove selected users" to reach the bulk-delete confirmation screen. */
    submitBulkRemove(): ManageUsersPage {
        this.iframe().find('button').contains('Remove selected users').click()
        return this.waitForIframeElement('button[name="_eventId_confirm"]')
    }

    verifyBulkConfirmationScreen(usernames: string[]): ManageUsersPage {
        this.iframe().should('contain', 'Name')
        usernames.forEach((username) => {
            this.iframe().should('contain', username)
        })
        return this
    }

    /* Confirm the bulk removal shown on the confirmation screen. */
    confirmBulkRemove(): ManageUsersPage {
        this.iframe().find('button[name="_eventId_confirm"]').click()
        return this.waitForIframeElement('button[onclick*="addUser"]')
    }

    verifyBulkRemovalSuccess(usernames: string[]): ManageUsersPage {
        usernames.forEach((username) => {
            this.iframe().should('contain', `Successfully removed ${username}.`)
        })
        return this
    }

    /*
     * Each role <select> option's own text is a single "|"-joined, fixed-width-padded row -
     * e.g. "site-privileged     | <siteKey>| (site-administrator)" - not one option per column.
     * Verify one option's text contains every given substring.
     */
    verifyRoleOptionContaining(...substrings: string[]): ManageUsersPage {
        this.iframe()
            .find('select#roles option, select[name="roles"] option, select[name="selectMember"] option')
            .then(($options) => {
                // The column padding uses non-breaking spaces (and runs of them), which don't
                // equal a literal ' ' in a plain substring like "System Site" - collapse all
                // whitespace (regex \s matches NBSP too) to a single regular space first.
                const texts = $options.toArray().map((o) => (o.textContent || '').replace(/\s+/g, ' '))
                const match = texts.some((text) => substrings.every((s) => text.includes(s)))
                expect(
                    match,
                    `expected an option containing [${substrings.join(', ')}] among: ${JSON.stringify(texts)}`,
                ).to.eq(true)
            })
        return this
    }

    /* Toggle the "Account locked" checkbox on the currently open edit-user form. */
    setAccountLocked(locked: boolean): ManageUsersPage {
        this.iframe()
            .find('input[name="accountLocked"]')
            .then(($el) => {
                const isChecked = ($el as unknown as HTMLInputElement[])[0]?.checked
                if (isChecked !== locked) {
                    cy.wrap($el).click({ force: true })
                }
            })
        return this
    }

    /* Toggle the "Email notifications disabled" checkbox on the currently open edit-user form. */
    setEmailNotificationsDisabled(disabled: boolean): ManageUsersPage {
        this.iframe()
            .find('input[name="emailNotificationsDisabled"]')
            .then(($el) => {
                const isChecked = ($el as unknown as HTMLInputElement[])[0]?.checked
                if (isChecked !== disabled) {
                    cy.wrap($el).click({ force: true })
                }
            })
        return this
    }
}
