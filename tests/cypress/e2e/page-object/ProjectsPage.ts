import { BasePage } from '@jahia/cypress'
import IframeOptions = Cypress.IframeOptions
import { ImportPage } from './ImportPage'

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
}
