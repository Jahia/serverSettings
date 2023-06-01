import { ProjectsPage } from './page-object/ProjectsPage'

describe('Basic tests for the server settings module', () => {
    it('Verify server settings page is displayed.', function () {
        cy.login()
        const projectPage = ProjectsPage.visit()
        projectPage.checkPageOpened()
    })
})
