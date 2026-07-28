import { BasePage } from '@jahia/cypress'
import IframeOptions = Cypress.IframeOptions
import { WEB_PROJECTS_IFRAME, webProjectsFrame } from './webProjectsIframe'

/**
 * A single web project's detailed view (edit form).
 */
export class EditSitePage extends BasePage {
    iFrameOptions: IframeOptions

    private field(id: string) {
        return webProjectsFrame().find(`#${id}`)
    }

    expectTitle(title: string) {
        this.field('title').should('have.value', title)
        return this
    }

    expectServerName(serverName: string) {
        this.field('serverName').should('have.value', serverName)
        return this
    }

    expectServerNameAliases(serverNameAliases: string) {
        this.field('serverNameAliases').should('have.value', serverNameAliases)
        return this
    }

    setServerName(serverName: string) {
        this.field('serverName').clear().type(serverName, { parseSpecialCharSequences: false })
        return this
    }

    setServerNameAliases(serverNameAliases: string) {
        this.field('serverNameAliases').clear().type(serverNameAliases, { parseSpecialCharSequences: false })
        return this
    }

    /**
     * Submits the edit form.
     *
     * When the server name actually changed, editSite.jsp's submit handler asks for confirmation
     * through a native `confirm()` raised **inside the admin iframe**. Cypress only auto-accepts
     * dialogs on the top-level window under test, so an un-stubbed confirm here blocks the browser
     * itself: the run hangs indefinitely and no Cypress timeout fires. Stubbing it on the iframe's
     * own window is what keeps this test finite — the legacy Selenium test accepted the same dialog
     * explicitly (closeAlertAndGetItsText).
     */
    save() {
        cy.get(WEB_PROJECTS_IFRAME)
            .its('0.contentWindow')
            .then((win) => {
                cy.stub(win, 'confirm').returns(true)
            })
        webProjectsFrame().find('button.btn-primary').should('be.visible').click()
        return this
    }

    /** After a successful save the flow returns to the projects list, which renders the banner. */
    expectSaveSuccess() {
        webProjectsFrame().find('.alert-success').should('exist')
        return this
    }

    expectServerNameConflict(conflictingName: string) {
        webProjectsFrame()
            .find('.alert-danger')
            .should('contain', `Server name is already used. Please choose another server name (${conflictingName}).`)
        return this
    }
}
