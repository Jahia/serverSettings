import { createSite, deleteSite } from '@jahia/cypress'
import { ProjectsPage } from '../page-object/ProjectsPage'
import { describeWithTags, itWithTags } from '../../support/testWrapper'
import { logTestProgress } from '../../support/progressLogger'

const testcaseId = 'FT-002'
const logFileName = 'ft002-progress.log'
const logProgress = (message: string) => logTestProgress({ testCaseId: testcaseId, scope: 'Spec', logFileName }, message)

describeWithTags(
    'Site creation tests',
    {
        id: 'create-sites-suite',
        tags: ['administration', 'site-management', 'validation', 'server-name'],
    },
    () => {
        const uniqueSuffix = Date.now().toString()
        const firstSiteKey = `ft002a${uniqueSuffix}`
        const secondSiteKey = `ft002b${uniqueSuffix}`
        const firstServerName = `www.ft002-source-${uniqueSuffix}.example.com`
        const firstServerAliases = `aaa.ft002-source-${uniqueSuffix}.example.com, bbb.ft002-source-${uniqueSuffix}.example.com`

        before(() => {
            logProgress('before: creating two sites for duplicate validation scenario')
            deleteSite(firstSiteKey)
            deleteSite(secondSiteKey)
            createSite(firstSiteKey, {
                templateSet: 'dx-base-demo-templates',
                locale: 'en',
                languages: 'en',
                serverName: firstServerName,
            })
            createSite(secondSiteKey, {
                templateSet: 'dx-base-demo-templates',
                locale: 'en',
                languages: 'en',
                serverName: `www.ft002-target-${uniqueSuffix}.example.com`,
            })
            cy.login()
        })

        after(() => {
            logProgress('after: deleting created sites and logging out')
            deleteSite(firstSiteKey)
            deleteSite(secondSiteKey)
            cy.logout()
        })

        afterEach(function () {
            logProgress(`afterEach: test state is ${this.currentTest?.state ?? 'unknown'}`)
        })

        itWithTags(
            'FT-002 Site edit rejects duplicate server name and alias values with proper error messages',
            {
                id: testcaseId,
                tags: ['administration', 'site-management', 'validation', 'server-name'],
            },
            () => {
                logProgress('test start: opening second site and attempting duplicate server values')
                const projectsPage = ProjectsPage.visit()
                projectsPage
                    .enterWebProjectsFrame(testcaseId, logFileName)
                    .openSiteDetailedViewBySiteKey(secondSiteKey)
                    .saveEditedServerSettings(firstServerName, firstServerAliases)
                    .checkValidationMessageContains('Server name is already used')

                logProgress('verification: duplicate server validation message displayed')
            },
        )
    },
)
