import { createSite, deleteSite } from '@jahia/cypress'
import { ProjectsPage } from '../page-object/ProjectsPage'
import { describeWithTags, itWithTags } from '../../support/testWrapper'
import { logTestProgress } from '../../support/progressLogger'

const testcaseId = 'FT-004'
const logFileName = 'ft004-progress.log'
const logProgress = (message: string) => logTestProgress({ testCaseId: testcaseId, scope: 'Spec', logFileName }, message)

describeWithTags(
    'Site creation tests',
    {
        id: 'create-sites-suite',
        tags: ['administration', 'site-management', 'site-import'],
    },
    () => {
        const uniqueSuffix = Date.now().toString()
        const sourceSiteKey = `ft004source${uniqueSuffix}`
        const importedSiteKey = `myImportedSite${uniqueSuffix}`
        const importedSiteTitle = `Imported Site ${uniqueSuffix}`
        const importedServerName = `www.ft004-imported-${uniqueSuffix}.example.com`
        const importedServerAliases = `aaa.ft004-imported-${uniqueSuffix}.example.com, bbb.ft004-imported-${uniqueSuffix}.example.com`
        const zipPath = 'results/tmp/ft004-site-export.zip'

        before(() => {
            logProgress('before: creating source site for export/import scenario')
            deleteSite(sourceSiteKey)
            deleteSite(importedSiteKey)
            createSite(sourceSiteKey, {
                templateSet: 'dx-base-demo-templates',
                locale: 'en',
                languages: 'en',
                serverName: `www.ft004-source-${uniqueSuffix}.example.com`,
            })
            cy.login()
        })

        after(() => {
            logProgress('after: deleting source/imported sites and logging out')
            deleteSite(sourceSiteKey)
            deleteSite(importedSiteKey)
            cy.logout()
        })

        afterEach(function () {
            logProgress(`afterEach: test state is ${this.currentTest?.state ?? 'unknown'}`)
        })

        itWithTags(
            'FT-004 Import site archive creates a new site entry',
            {
                id: testcaseId,
                tags: ['administration', 'site-management', 'site-import'],
            },
            () => {
                logProgress('step 1: exporting source site archive from web project list')
                const projectsPage = ProjectsPage.visit()
                projectsPage.enterWebProjectsFrame(testcaseId, logFileName).selectSiteForBulkAction(sourceSiteKey)

                projectsPage.triggerSelectedSitesExportAndGetUrl().then(exportUrl => {
                    cy.request({ url: exportUrl, encoding: 'binary' }).then(response => {
                        const base64 = Cypress.Buffer.from(response.body, 'binary').toString('base64')
                        cy.task('writeBinaryFile', { filePath: zipPath, base64 })
                    })
                })

                logProgress('step 2: uploading archive and overriding imported site values')
                projectsPage
                    .importFile(zipPath)
                    .setImportedSiteValues({
                        title: importedSiteTitle,
                        siteKey: importedSiteKey,
                        serverName: importedServerName,
                        serverNameAliases: importedServerAliases,
                    })
                    .processImport()
                    .waitUntilBackOnSitesList()
                    .checkSiteListedBySiteKey(importedSiteKey)

                logProgress('verification: imported site is visible in site list')
            },
        )
    },
)
