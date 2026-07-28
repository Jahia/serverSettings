import { context, deleteSite, jfaker } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'
import { SiteDefinition } from './page-object/CreateSitePage'

/**
 * Migrated from the legacy Selenium suite: CreateSitesTest.exportImportSiteWithServerNames and
 * CreateSitesTest.createSiteUsingImport (Jahia/selenium CreateSitesTest.java:57-61, 131-190).
 * Tracking issue: Jahia/selenium#1593 — FT-003, FT-008, FT-009, FT-010, FT-011, FT-012.
 *
 * The legacy suite imported a checked-in `acmespace` archive. These specs export a site they created
 * themselves instead, so no shared or pre-existing test site is involved and the archive always
 * matches the data under assertion.
 */
const DOWNLOADS = '/tmp'

// Unique per run so two runs against the same instance cannot collide on the server names.
const uniqueSite = (name: string, key: string): SiteDefinition => {
    const token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
    const host = `${key.toLowerCase()}-${token}`
    return {
        title: `${name} ${token}`,
        siteKey: `${key}${token}`,
        serverName: `www.${host}.example.com`,
        serverNameAliases: `aaa.${host}.example.com, bbb.${host}.example.com`,
    }
}

describe('Web project export, then re-import over the still-existing site', () => {
    context.tag('site-management', 'admin', 'export', 'import')

    let site: SiteDefinition
    let imported: SiteDefinition
    let archivePath: string

    before(function () {
        site = uniqueSite('Export Import Source Site', 'exportImportSource')
        imported = uniqueSite('Export Import Imported Site', 'exportImportImported')

        cy.login()
        ProjectsPage.visit().createSite().createSite(site).expectSiteListed(site.title)
    })

    after(function () {
        deleteSite(site.siteKey)
        deleteSite(imported.siteKey)
    })

    it('should produce a downloadable, non-empty archive when exporting a site', function () {
        context.tag('download')
        cy.login()
        ProjectsPage.visit().exportSiteStaging(site.siteKey)

        cy.task('findDownloadedArchive', { dir: DOWNLOADS, prefix: site.siteKey }, { timeout: 120000 }).then(
            (archive: { path: string; size: number }) => {
                expect(archive.size, 'exported archive size').to.be.greaterThan(0)
                archivePath = archive.path
            },
        )
    })

    it('should write the site server name and aliases into the exported site.properties', function () {
        context.tag('archive-contents')
        cy.wrap(archivePath, { log: false }).should('be.a', 'string')
        cy.task('readExportedSiteProperties', { archivePath, siteKey: site.siteKey }).then(
            (properties: Record<string, string>) => {
                expect(properties.siteservername, 'siteservername').to.equal(site.serverName)
                // The export does not promise alias ordering, so compare as a set.
                const exported = (properties.siteservernamealiases || '')
                    .split(',')
                    .map((alias) => alias.trim())
                    .sort()
                expect(exported, 'siteservernamealiases').to.deep.equal(
                    site.serverNameAliases
                        .split(',')
                        .map((alias) => alias.trim())
                        .sort(),
                )
            },
        )
    })

    it('should report conflicts on site key, server name and aliases when re-importing', function () {
        context.tag('validation', 'conflict')
        const [firstAlias, secondAlias] = site.serverNameAliases.split(', ')
        cy.login()
        ProjectsPage.visit()
            .importFile(archivePath)
            .expectSiteKeyConflict()
            .expectServerNameConflict(site.serverName)
            .expectServerNameConflict(firstAlias)
            .expectServerNameConflict(secondAlias)
    })

    it('should complete the import once the identity is corrected, and list the new site', function () {
        context.tag('success')
        cy.login()
        ProjectsPage.visit()
            .importFile(archivePath)
            .correctSite(site.siteKey, imported)
            .processImport()
            .expectSiteListed(imported.title)
    })

    it('should show the imported site title, server name and aliases in its detailed view', function () {
        context.tag('detail-view')
        cy.login()
        ProjectsPage.visit()
            .openDetailedView(imported.siteKey)
            .expectTitle(imported.title)
            .expectServerName(imported.serverName)
            .expectServerNameAliases(imported.serverNameAliases)
    })
})

describe('Web project import of an archive that conflicts with nothing', () => {
    context.tag('site-management', 'admin', 'import', 'archive')

    let site: SiteDefinition
    let archivePath: string

    before(function () {
        site = uniqueSite('Import Clean Archive Site', 'importCleanArchive')

        // GIVEN a valid archive of a site that no longer exists: create it, export it, delete it.
        // That is what makes this the happy path rather than the re-import conflict path above, without
        // depending on a checked-in legacy archive.
        cy.login()
        ProjectsPage.visit().createSite().createSite(site).expectSiteListed(site.title)
        ProjectsPage.visit().exportSiteStaging(site.siteKey)
        cy.task('findDownloadedArchive', { dir: DOWNLOADS, prefix: site.siteKey }, { timeout: 120000 }).then(
            (archive: { path: string }) => {
                archivePath = archive.path
                deleteSite(site.siteKey)
            },
        )
    })

    after(function () {
        deleteSite(site.siteKey)
    })

    it('should show no error when importing a valid site archive', function () {
        cy.login()
        ProjectsPage.visit().importFile(archivePath).expectImportFormFor(site.siteKey).expectNoError()
    })
})
