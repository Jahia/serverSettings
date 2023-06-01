import { ProjectsPage } from './page-object/ProjectsPage'

describe('Tests to check XSS vulnerability', () => {
    it('Should prevent XSS issue when importing site.', function () {
        cy.login()
        const projectPage = ProjectsPage.visit()
        const importPage = projectPage.importFile('cypress/fixtures/testData/XSS.zip')

        /* eslint-disable cypress/no-unnecessary-waiting */
        cy.wait(3000)
        importPage.checkTextExists("img src=1 onerror=alert('Hello')>.png")
    })
})
