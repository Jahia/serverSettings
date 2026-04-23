import { createSite, deleteSite } from '@jahia/cypress'
import { ProjectsPage } from '../page-object/ProjectsPage'
import { describeWithTags, itWithTags } from '../../support/testWrapper'
import { logTestProgress } from '../../support/progressLogger'

const testcaseId = 'FT-003'
const logFileName = 'ft003-progress.log'
const logProgress = (message: string) => logTestProgress({ testCaseId: testcaseId, scope: 'Spec', logFileName }, message)

describeWithTags(
    'Site creation tests',
    {
        id: 'create-sites-suite',
        tags: ['administration', 'site-management', 'site-editing'],
    },
    () => {
        const uniqueSuffix = Date.now().toString()
        const siteKey = `ft003${uniqueSuffix}`
        const newServerName = `www.ft003-updated-${uniqueSuffix}.example.com`
        const newServerAliases = `aaa.ft003-updated-${uniqueSuffix}.example.com, bbb.ft003-updated-${uniqueSuffix}.example.com`

        before(() => {
            logProgress('before: creating site to edit and logging in')
            deleteSite(siteKey)
            createSite(siteKey, {
                templateSet: 'dx-base-demo-templates',
                locale: 'en',
                languages: 'en',
                serverName: `www.ft003-initial-${uniqueSuffix}.example.com`,
            })
            cy.login()
        })

        after(() => {
            logProgress('after: deleting edited site and logging out')
            deleteSite(siteKey)
            cy.logout()
        })

        afterEach(function () {
            logProgress(`afterEach: test state is ${this.currentTest?.state ?? 'unknown'}`)
        })

        itWithTags(
            'FT-003 Site edit accepts new unique server name and aliases and shows success message',
            {
                id: testcaseId,
                tags: ['administration', 'site-management', 'site-editing'],
            },
            () => {
                logProgress('test start: opening site detailed view and updating server values')
                const projectsPage = ProjectsPage.visit()
                projectsPage
                    .enterWebProjectsFrame(testcaseId, logFileName)
                    .openSiteDetailedViewBySiteKey(siteKey)
                    .saveEditedServerSettings(newServerName, newServerAliases)
                    .checkSuccessMessageContains('Changes saved')

                ProjectsPage.visit()
                    .enterWebProjectsFrame(testcaseId, logFileName)
                    .openSiteDetailedViewBySiteKey(siteKey)
                    .checkDetailedServerSettings(newServerName, newServerAliases)

                logProgress('verification: success message and persisted values are correct')
            },
        )
    },
)
