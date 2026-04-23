import { createSite, deleteSite } from '@jahia/cypress'
import { ProjectsPage } from '../page-object/ProjectsPage'
import { describeWithTags, itWithTags } from '../../support/testWrapper'
import { logTestProgress } from '../../support/progressLogger'

const testcaseId = 'FT-005'
const logFileName = 'ft005-progress.log'
const logProgress = (message: string) => logTestProgress({ testCaseId: testcaseId, scope: 'Spec', logFileName }, message)

describeWithTags(
    'Site creation tests',
    {
        id: 'create-sites-suite',
        tags: ['administration', 'site-management', 'site-export', 'site-import', 'validation'],
    },
    () => {
        const uniqueSuffix = Date.now().toString()
        const sourceSiteKey = `ft005source${uniqueSuffix}`
        const sourceServerName = `www.ft005-source-${uniqueSuffix}.example.com`
        const sourceServerAliases = `aaa.ft005-source-${uniqueSuffix}.example.com, bbb.ft005-source-${uniqueSuffix}.example.com`
        const importedSiteKey = `ft005imported${uniqueSuffix}`
        const importedServerName = `www.ft005-imported-${uniqueSuffix}.example.com`
        const importedServerAliases = `aaa.ft005-imported-${uniqueSuffix}.example.com, bbb.ft005-imported-${uniqueSuffix}.example.com`
        const zipPath = 'results/tmp/ft005-site-export.zip'

        before(() => {
            logProgress('before: creating source site with known server values')
            deleteSite(sourceSiteKey)
            deleteSite(importedSiteKey)
            createSite(sourceSiteKey, {
                templateSet: 'dx-base-demo-templates',
                locale: 'en',
                languages: 'en',
                serverName: sourceServerName,
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
            'FT-005 Exported site archive contains correct server values and re-import validation behaves correctly',
            {
                id: testcaseId,
                tags: ['administration', 'site-management', 'site-export', 'site-import', 'validation'],
            },
            () => {
                logProgress('step 1: exporting source site archive and reading site.properties')
                const projectsPage = ProjectsPage.visit()
                projectsPage.enterWebProjectsFrame(testcaseId, logFileName).selectSiteForBulkAction(sourceSiteKey)

                projectsPage.triggerSelectedSitesExportAndGetUrl().then(exportUrl => {
                    cy.request({ url: exportUrl, encoding: 'binary' }).then(response => {
                        const base64 = Cypress.Buffer.from(response.body, 'binary').toString('base64')
                        cy.task('extractSitePropertiesFromZipBuffer', base64).then(siteProps => {
                            const typedSiteProps = siteProps as Record<string, string>
                            expect(typedSiteProps.siteservername).to.eq(sourceServerName)
                        })
                        cy.task('writeBinaryFile', { filePath: zipPath, base64 })
                    })
                })

                logProgress('step 2: importing same archive and checking duplicate validation messages')
                const importPage = projectsPage
                    .importFile(zipPath)
                    .processImport()
                    .checkImportErrorContains('Site key is already used.')
                    .checkImportErrorContains('Server name is already used')

                logProgress('step 3: updating import values to unique values and finishing import')
                importPage
                    .setImportedSiteValues({
                        title: `Imported FT005 ${uniqueSuffix}`,
                        siteKey: importedSiteKey,
                        serverName: importedServerName,
                        serverNameAliases: importedServerAliases,
                    })
                    .processImport()
                    .waitUntilBackOnSitesList()
                    .openSiteDetailedViewBySiteKey(importedSiteKey)
                    .checkDetailedServerSettings(importedServerName, importedServerAliases)

                logProgress('verification: export content and post-import detailed values are correct')
            },
        )
    },
)
