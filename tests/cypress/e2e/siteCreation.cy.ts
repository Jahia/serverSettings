import { context, deleteSite, jfaker } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'
import { SiteDefinition } from './page-object/CreateSitePage'

/**
 * Migrated from the legacy Selenium suite: CreateSitesTest.createSiteSimple
 * (Jahia/selenium CreateSitesTest.java:44-51). Tracking issue: Jahia/selenium#1593
 * — FT-001, FT-002.
 */
describe('Web project creation through the admin wizard', () => {
    context.tag('site-management', 'admin', 'create', 'site-list')

    let site: SiteDefinition

    before(function () {
        // Unique per run so two runs against the same instance cannot collide on the server names.
        const token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
        site = {
            title: `Site Creation Test ${token}`,
            siteKey: `siteCreationTest${token}`,
            serverName: `www.site-creation-test-${token}.example.com`,
            serverNameAliases: `aaa.site-creation-test-${token}.example.com, bbb.site-creation-test-${token}.example.com`,
        }
    })

    after(function () {
        deleteSite(site.siteKey)
    })

    it('should list a newly created site in the projects list', function () {
        cy.login()
        ProjectsPage.visit().createSite().createSite(site).expectSiteListed(site.title)
    })

    it('should show the server name and aliases set at creation in the detailed view', function () {
        context.tag('server-name', 'detail-view')
        cy.login()
        ProjectsPage.visit()
            .openDetailedView(site.siteKey)
            .expectTitle(site.title)
            .expectServerName(site.serverName)
            .expectServerNameAliases(site.serverNameAliases)
    })
})
