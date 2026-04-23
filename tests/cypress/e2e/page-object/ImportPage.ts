import { BasePage } from '@jahia/cypress'
import { AdminFrameHelper } from './AdminFrameHelper'

export class ImportPage extends BasePage {
    checkTextExists(text: string) {
        AdminFrameHelper.enterFrameBySrcFragment('webProjectSettings')
        cy.get(`input[id*="${text}"]`).should('exist')
        return this
    }
}
