import { BasePage } from '@jahia/cypress'
import IframeOptions = Cypress.IframeOptions
import { ImportPage } from './ImportPage'
import { CreateSitePage } from './CreateSitePage'
import { EditSitePage } from './EditSitePage'
import { webProjectsFrame } from './webProjectsIframe'

export class ProjectsPage extends BasePage {
    iFrameOptions: IframeOptions

    static visit() {
        cy.visit('/jahia/administration/webProjectSettings')
        return new ProjectsPage()
    }

    checkPageOpened() {
        cy.contains('Projects').should('exist')
    }

    importFile(fileLocation: string) {
        cy.iframe('iframe[src*="webProjectSettings.html"]', this.iFrameOptions).within(() => {
            cy.get('#importForm').find('input[name="importFile"]').selectFile(fileLocation)
            /* eslint-disable cypress/no-unnecessary-waiting */
            cy.wait(2000)
            cy.get('#importForm').find('button:contains("Upload")').click()
        })
        return new ImportPage()
    }

    /**
     * Opens the create-web-project wizard.
     *
     * The button is an anchor, and the submit behind it runs from the `a.sitesAction` handler the screen
     * binds in a document-ready callback. A click landing before that callback has run is a **lost
     * one-shot event**: the retry that follows re-queries the DOM but never re-fires the click, so the
     * wizard can never open however long the wait.
     *
     * The screen calls `dataTablesSettings.init` on the sites table from a *second* ready callback, and
     * jQuery runs them in registration order — so the wrapper DataTables puts around the table is proof
     * that the click already has a handler to run. Waiting on it also fails in the right direction: a
     * screen whose scripts never run at all times out here instead of taking a click into the void.
     */
    createSite() {
        webProjectsFrame().find('#sitesTable_wrapper', { timeout: 30000 }).should('exist')
        webProjectsFrame().find('#createSite').click()
        return new CreateSitePage()
    }

    /**
     * Triggers a staging export for one site.
     *
     * Export is a **toolbar** action over the checked rows, not a per-row one: view.jsp does declare
     * per-row export anchors, but they are absent from the rendered page, whereas #exportStagingSites
     * is always present (merely hidden by `sitesAction-hide` until a row is selected). It opens
     * `/cms/export/default/<key>_staging_export_<date>.zip`, which Cypress stores in downloadsFolder.
     *
     * The checkbox is visually replaced by a Material span, so the real input needs `force`.
     */
    exportSiteStaging(siteKey: string) {
        webProjectsFrame().find(`input[name="selectedSites"][value="${siteKey}"]`).check({ force: true })
        webProjectsFrame().find('#exportStagingSites').click({ force: true })
        return this
    }

    /** Site creation runs server-side after the wizard, so the row can take a while to appear. */
    expectSiteListed(title: string) {
        webProjectsFrame().find('#sitesTable', { timeout: 120000 }).should('contain', title)
        return this
    }

    /**
     * Opens a site's detailed view. Targets the row's editSite action by site key rather than by
     * link text, so two rows sharing a title cannot make this ambiguous.
     */
    openDetailedView(siteKey: string) {
        webProjectsFrame().find(`#sitesTable a[onclick*="'editSite', '${siteKey}'"]`).first().click()
        return new EditSitePage()
    }
}
