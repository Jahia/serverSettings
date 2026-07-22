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

    /* Fill the create/edit user form. Only provided fields are typed. */
    fillForm(data: UserFormData): ManageUsersPage {
        if (data.username !== undefined) {
            this.iframe().find('#username').clear().type(data.username)
        }
        if (data.firstName !== undefined) {
            this.iframe().find('#firstName').clear().type(data.firstName)
        }
        if (data.lastName !== undefined) {
            this.iframe().find('#lastName').clear().type(data.lastName)
        }
        if (data.email !== undefined) {
            this.iframe().find('#email').clear().type(data.email)
        }
        if (data.organization !== undefined) {
            this.iframe().find('#organization').clear().type(data.organization)
        }
        if (data.password !== undefined) {
            this.iframe().find('#password').clear().type(data.password)
        }
        if (data.passwordConfirm !== undefined) {
            this.iframe().find('#passwordConfirm').clear().type(data.passwordConfirm)
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
        this.iframe().find('input[name="searchString"]').clear().type(term)
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
}
