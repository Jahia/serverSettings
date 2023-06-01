import { BasePage } from '@jahia/cypress'

export class ProjectsPage extends BasePage {
    static visit() {
        cy.visit('/jahia/administration/webProjectSettings')
        return new ProjectsPage()
    }

    checkPageOpened() {
        cy.contains('Projects').should('exist')
    }
}
