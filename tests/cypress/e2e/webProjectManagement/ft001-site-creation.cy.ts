import { deleteSite } from '@jahia/cypress'
import { ProjectsPage } from '../page-object/ProjectsPage'
import { describeWithTags, itWithTags } from '../../support/testWrapper'
import { logTestProgress } from '../../support/progressLogger'

const testcaseId = 'FT-001'
const logFileName = 'ft001-progress.log'

const logProgress = (message: string) => logTestProgress({ testCaseId: testcaseId, scope: 'Spec', logFileName }, message)

describeWithTags(
    'Site creation tests',
    {
        id: 'create-sites-suite',
        tags: ['administration', 'site-management', 'site-creation', 'validation'],
    },
    () => {
        const siteTitle = 'My site'
        const siteKey = 'mySite'
        const uniqueSuffix = Date.now().toString()
        const serverName = `www.mysite-ft001-${uniqueSuffix}.com`
        const serverNameAliases = `aaa.mysite-ft001-${uniqueSuffix}.com, bbb.mysite-ft001-${uniqueSuffix}.com`

        before(() => {
            logProgress('before: cleaning target site and logging in')
            // Given: no existing site with key "mySite".
            deleteSite(siteKey)
            cy.login()
        })

        after(() => {
            logProgress('after: cleaning target site and logging out')
            deleteSite(siteKey)
            cy.logout()
        })

        afterEach(function () {
            logProgress(`afterEach: test state is ${this.currentTest?.state ?? 'unknown'}`)
        })

        itWithTags(
            'FT-001 Newly created site appears in Web Project Management with correct server name and aliases',
            {
                id: 'FT-001',
                tags: ['administration', 'site-management', 'site-creation', 'validation'],
            },
            () => {
                logProgress('test start: creating site and opening detailed view')
                // When: create a site in Administration > Web Project Management and open its detailed view.
                const projectsPage = ProjectsPage.visit()
                projectsPage
                    .createSiteWithServerNames({
                        title: siteTitle,
                        siteKey,
                        serverName,
                        serverNameAliases,
                    }, testcaseId, logFileName)
                    .checkSiteListed(siteTitle)
                    .openSiteDetailedView(siteTitle)

                logProgress('verification: asserting detailed server settings values')
                // Then: site details show exactly the entered server name and aliases.
                projectsPage.checkDetailedServerSettings(serverName, serverNameAliases)
                logProgress('test completed: all assertions passed')
            },
        )
    },
)
