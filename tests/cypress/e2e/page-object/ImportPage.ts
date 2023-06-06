import { BasePage } from '@jahia/cypress'
import IframeOptions = Cypress.IframeOptions

export class ImportPage extends BasePage {
    iFrameOptions: IframeOptions

    checkTextExists(text: string) {
        cy.iframe('iframe[src*="webProjectSettings.html"]', this.iFrameOptions).within(() => {
            cy.get(`input[id*="${text}"]`).should('exist')
        })
    }
}
