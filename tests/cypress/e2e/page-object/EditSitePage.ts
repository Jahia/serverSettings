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
                cy.stub(win, 'confirm').as('confirm').returns(true)
            })
        webProjectsFrame().find('button.btn-primary').should('be.visible').click()
        return this
    }

    /** Reads the `confirm()` stub of the last {@link save}, which asks before a server name changes. */
    expectServerNameChangeConfirmed() {
        cy.get('@confirm')
            .should('have.been.calledOnce')
            .and('have.been.calledWithMatch', 'change the site server name')
        return this
    }

    expectNoConfirmation() {
        cy.get('@confirm').should('not.have.been.called')
        return this
    }

    /** After a successful save the flow returns to the projects list, which renders the banner. */
    expectSaveSuccess() {
        webProjectsFrame().find('.alert-success').should('exist')
        return this
    }

    /** The modules of the site are listed as labels; reads the one holding `token` as text. */
    expectModuleLabel(token: string, name: string) {
        webProjectsFrame()
            .find('span.label')
            .filter((_, el) => el.textContent.includes(token))
            .should('have.length', 1)
            .invoke('text')
            .should('equal', name)
        return this
    }

    /** Opens the module selection of the site, from the edit button beside its module labels. */
    editModules() {
        webProjectsFrame().find('button[id$="-editModules"]').click()
        return this
    }

    /** The module selection lists each module as `<name> (<id>)`, in the list it belongs to. */
    expectModuleOption(list: 'selectedModules' | 'unselectedModules', id: string, name: string) {
        webProjectsFrame().find(`#${list} option[value="${id}"]`).should('have.text', `${name} (${id})`)
        return this
    }

    expectServerNameConflict(conflictingName: string) {
        webProjectsFrame()
            .find('.alert-danger')
            .should('contain', `Server name is already used. Please choose another server name (${conflictingName}).`)
        return this
    }
}
