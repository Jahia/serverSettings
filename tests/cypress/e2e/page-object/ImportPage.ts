import { BasePage } from '@jahia/cypress'
import { AdminFrameHelper } from './AdminFrameHelper'
import { ProjectsPage } from './ProjectsPage'

export class ImportPage extends BasePage {
    checkTextExists(text: string) {
        AdminFrameHelper.enterFrameBySrcFragment('webProjectSettings')
        cy.get(`input[id*="${text}"]`).should('exist')
        return this
    }

    setImportedSiteValues(siteData: { title: string; siteKey: string; serverName: string; serverNameAliases: string }) {
        cy.get('input[name*="siteTitle"]').first().should('be.visible').clear().type(siteData.title)
        cy.get('input[name*="siteKey"]').first().should('be.visible').clear().type(siteData.siteKey)
        cy.get('input[name*="siteServername"]').first().should('be.visible').clear().type(siteData.serverName)
        cy.get('input[name*="siteServernameAliases"]').first().should('be.visible').clear().type(siteData.serverNameAliases)
        return this
    }

    processImport() {
        cy.get('button[id$="-processImport"]').should('be.visible').click()
        return this
    }

    checkImportErrorContains(message: string) {
        cy.get('.alert-danger, .alert-info', { timeout: 30000 }).contains(message).should('be.visible')
        return this
    }

    waitUntilBackOnSitesList() {
        cy.get('#sitesTable', { timeout: 60000 }).should('be.visible')
        return new ProjectsPage()
    }
}
