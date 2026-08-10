import { BasePage } from '@jahia/cypress'
import IframeOptions = Cypress.IframeOptions
import { ProjectsPage } from './ProjectsPage'
import { SiteDefinition } from './CreateSitePage'
import { webProjectsFrame } from './webProjectsIframe'

export class ImportPage extends BasePage {
    iFrameOptions: IframeOptions

    checkTextExists(text: string) {
        cy.iframe('iframe[src*="webProjectSettings.html"]', this.iFrameOptions).within(() => {
            cy.get(`input[id*="${text}"]`).should('exist')
        })
    }

    /** The screen that lists what the archive contains, per site, before the import is processed. */
    expectImportFormFor(siteKey: string) {
        webProjectsFrame().find(`#${siteKey}siteKey`).should('be.visible')
        return this
    }

    expectNoError() {
        webProjectsFrame().find('.alert-danger').should('not.exist')
        return this
    }

    expectSiteKeyConflict() {
        webProjectsFrame().find('.alert-danger').should('contain', 'Site key is already used.')
        return this
    }

    expectServerNameConflict(conflictingName: string) {
        webProjectsFrame()
            .find('.alert-danger')
            .should('contain', `Server name is already used. Please choose another server name (${conflictingName}).`)
        return this
    }

    /**
     * Rewrites the conflicting identity of the site being imported. The fields are keyed by the site
     * key found *in the archive*, which is why the original key is needed alongside the new values.
     */
    correctSite(archivedSiteKey: string, site: SiteDefinition) {
        const type = (suffix: string, value: string) =>
            webProjectsFrame()
                .find(`#${archivedSiteKey}${suffix}`)
                .clear()
                .type(value, { parseSpecialCharSequences: false })

        type('siteTitle', site.title)
        type('siteKey', site.siteKey)
        type('siteServerName', site.serverName)
        type('siteServerNameAliases', site.serverNameAliases)
        return this
    }

    processImport() {
        webProjectsFrame().find('[name="_eventId_processImport"]').should('be.visible').click()
        return new ProjectsPage()
    }
}
