import { BasePage } from '@jahia/cypress'
import { ImportPage } from './ImportPage'
import { AdminFrameHelper } from './AdminFrameHelper'
import { logTestProgress } from '../../support/progressLogger'

export interface SiteCreationData {
    title: string
    siteKey: string
    serverName: string
    serverNameAliases: string
    templateSetId?: string
}

export class ProjectsPage extends BasePage {
    private logProgress(testCaseId: string, step: string, logFileName?: string) {
        logTestProgress({ testCaseId, scope: 'ProjectsPage', logFileName }, step)
    }

    static visit() {
        cy.visit('/jahia/administration/webProjectSettings')
        return new ProjectsPage()
    }

    enterWebProjectsFrame(testCaseId = 'SITE-CREATION', logFileName?: string) {
        this.logProgress(testCaseId, 'entering web project settings frame', logFileName)
        AdminFrameHelper.enterFrameBySrcFragment('webProjectSettings')
        cy.get('#sitesTable', { timeout: 30000 }).should('be.visible')
        return this
    }

    checkPageOpened() {
        cy.contains('Projects').should('exist')
    }

    createSiteWithServerNames(siteData: SiteCreationData, testCaseId = 'FT-001', logFileName?: string) {
        this.logProgress(testCaseId, 'step 1: entering web project settings frame', logFileName)
        // 1. Enter the webProjectSettings iframe by visiting its URL directly.
        //    This is the jahia-cypress IFrame.enter() pattern: resolve the live URL from the
        //    frame's contentWindow and cy.visit() it so all subsequent cy.get() calls run
        //    against the frame document with no iframe scoping needed.
        AdminFrameHelper.enterFrameBySrcFragment('webProjectSettings')

        this.logProgress(testCaseId, 'step 2: clicking create site action', logFileName)
        // 2. Click the Create button. The anchor uses a jQuery delegated handler
        //    (submitSiteForm) – a real Cypress .click() triggers it correctly.
        cy.get('a#createSite.sitesAction').should('be.visible').click()

        this.logProgress(testCaseId, 'step 3: filling create site form', logFileName)
        // 3. Step 1 – Site details.
        //    The page now shows the createSite WebFlow step inline. Wait for the title
        //    input before interacting so we don't race the server-side navigation.
        cy.get('input#title', { timeout: 30000 }).should('be.visible')
        cy.get('input#siteKey').should('be.visible')
        cy.get('input#serverName').should('be.visible')
        cy.get('input#serverNameAliases').should('exist')

        cy.get('input#title').clear().type(siteData.title)
        cy.get('input#siteKey').clear().type(siteData.siteKey)
        cy.get('input#serverName').clear().type(siteData.serverName)
        cy.get('input#serverNameAliases').clear().type(siteData.serverNameAliases)
        cy.get('input#createAdmin').uncheck({ force: true })
        cy.get('button[name="_eventId_next"]').should('be.visible').click()

        this.logProgress(testCaseId, 'step 4: selecting template set and proceeding', logFileName)
        // 4. Step 2 – Template / modules selection.
        cy.get('#templateSet', { timeout: 30000 }).should('exist').then($templateSet => {
            if ($templateSet.is('select')) {
                if (siteData.templateSetId) {
                    cy.wrap($templateSet).select(siteData.templateSetId)
                } else {
                    cy.wrap($templateSet).find('option').first().then($option => {
                        cy.wrap($templateSet).select($option.val() as string)
                    })
                }
            } else if (siteData.templateSetId) {
                cy.wrap($templateSet).invoke('val', siteData.templateSetId)
            }
        })
        cy.get('button[name="_eventId_next"]').should('be.visible').click()

        this.logProgress(testCaseId, 'step 5: confirming site summary', logFileName)
        // 5. Step 3 – Summary confirmation.
        cy.contains(siteData.title, { timeout: 30000 }).should('exist')
        cy.contains(siteData.siteKey).should('exist')
        cy.contains(siteData.serverName).should('exist')
        cy.get('button[name="_eventId_next"]').should('be.visible').click()

        this.logProgress(testCaseId, 'step 6: verifying site list is visible', logFileName)
        // 6. Back at the list – creation complete.
        cy.get('#sitesTable', { timeout: 60000 }).should('be.visible')

        return this
    }

    checkSiteListed(siteTitle: string) {
        cy.get('#sitesTable').contains('td a', siteTitle).should('be.visible')

        return this
    }

    checkSiteListedBySiteKey(siteKey: string) {
        cy.get('#sitesTable').contains('td', siteKey).should('be.visible')
        return this
    }

    openSiteDetailedView(siteTitle: string) {
        cy.get('#sitesTable').contains('td a', siteTitle).should('be.visible').click()
        cy.get('input#serverName', { timeout: 30000 }).should('be.visible')
        cy.get('input#serverNameAliases').should('be.visible')

        return this
    }

    openSiteDetailedViewBySiteKey(siteKey: string) {
        cy.get('#sitesTable')
            .contains('td', siteKey)
            .parents('tr')
            .find('td a')
            .first()
            .should('be.visible')
            .click()
        cy.get('input#serverName', { timeout: 30000 }).should('be.visible')
        cy.get('input#serverNameAliases').should('be.visible')
        return this
    }

    checkDetailedServerSettings(serverName: string, serverNameAliases: string) {
        cy.get('input#serverName').should('have.value', serverName)
        cy.get('input#serverNameAliases').should('have.value', serverNameAliases)

        return this
    }

    saveEditedServerSettings(serverName: string, serverNameAliases: string) {
        cy.get('input#serverName', { timeout: 30000 }).should('be.visible').clear().type(serverName)
        cy.get('input#serverNameAliases').should('be.visible').clear().type(serverNameAliases)
        cy.get('button[id$="-next"]').should('be.visible').click()
        return this
    }

    checkValidationMessageContains(expectedMessage: string) {
        cy.get('.alert-danger, .validationError', { timeout: 30000 }).contains(expectedMessage).should('be.visible')
        return this
    }

    checkSuccessMessageContains(expectedMessage: string) {
        cy.get('.alert-success', { timeout: 30000 }).contains(expectedMessage).should('be.visible')
        return this
    }

    importFile(fileLocation: string) {
        AdminFrameHelper.enterFrameBySrcFragment('webProjectSettings')
        cy.get('#importForm').find('input[name="importFile"]').selectFile(fileLocation)
        cy.get('#importForm').find('button[onclick*="validateUploadForm"]').click()
        return new ImportPage()
    }

    selectSiteForBulkAction(siteKey: string) {
        cy.get('#sitesTable')
            .contains('td', siteKey)
            .parents('tr')
            .find('input[name="selectedSites"]')
            .check({ force: true })
        return this
    }

    triggerSelectedSitesExportAndGetUrl() {
        let exportUrl = ''
        cy.window().then(win => {
            const openStub = cy.stub(win, 'open')
                .callsFake(url => {
                    exportUrl = String(url)
                    return null
                })
            cy.wrap(openStub).as('exportWindowOpen')
        })
        cy.get('a#exportSites').should('be.visible').click()
        return cy.get('@exportWindowOpen').then(() => {
            expect(exportUrl).not.to.equal('')
            return exportUrl
        })
    }
}
