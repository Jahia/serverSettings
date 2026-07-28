import { context, deleteSite, jfaker } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'
import { SiteDefinition } from './page-object/CreateSitePage'

/**
 * Migrated from the legacy Selenium suite: CreateSitesTest.createSiteWithServerNames
 * (Jahia/selenium CreateSitesTest.java:77-111). Tracking issue: Jahia/selenium#1593
 * — FT-004, FT-005, FT-006, FT-007.
 *
 * The legacy chain reused the site created by createSiteSimple as the conflict source; here the
 * suite owns both sites so it stays independent of any other spec.
 */
describe('Web project server-name conflict validation', () => {
    context.tag('site-management', 'admin', 'server-name')

    let existing: SiteDefinition
    let edited: SiteDefinition
    let freeServerName: string
    let freeServerNameAliases: string

    before(function () {
        // Unique per run so two runs against the same instance cannot collide on the server names.
        const token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
        existing = {
            title: `Conflict Held Site ${token}`,
            siteKey: `conflictHeldSite${token}`,
            serverName: `www.conflict-held-${token}.example.com`,
            serverNameAliases: `aaa.conflict-held-${token}.example.com, bbb.conflict-held-${token}.example.com`,
        }
        edited = {
            title: `Conflict Edited Site ${token}`,
            siteKey: `conflictEditedSite${token}`,
            serverName: `www.conflict-edited-${token}.example.com`,
            serverNameAliases: `aaa.conflict-edited-${token}.example.com, bbb.conflict-edited-${token}.example.com`,
        }
        freeServerName = `www.conflict-free-${token}.example.com`
        freeServerNameAliases = `aaa.conflict-free-${token}.example.com, bbb.conflict-free-${token}.example.com`

        // GIVEN, through the UI: a first site holding the server name the edit will collide with.
        cy.login()
        ProjectsPage.visit().createSite().createSite(existing).expectSiteListed(existing.title)
    })

    after(function () {
        deleteSite(existing.siteKey)
        deleteSite(edited.siteKey)
    })

    it('should list a second newly created site in the projects list', function () {
        context.tag('create', 'site-list')
        cy.login()
        ProjectsPage.visit().createSite().createSite(edited).expectSiteListed(edited.title)
    })

    it('should show the second site server name and aliases in its detailed view', function () {
        context.tag('detail-view')
        cy.login()
        ProjectsPage.visit()
            .openDetailedView(edited.siteKey)
            .expectTitle(edited.title)
            .expectServerName(edited.serverName)
            .expectServerNameAliases(edited.serverNameAliases)
    })

    it('should report a conflict for a server name and each alias already used by another site', function () {
        context.tag('validation', 'conflict', 'error-message')
        cy.login()
        const [firstAlias, secondAlias] = existing.serverNameAliases.split(', ')
        ProjectsPage.visit()
            .openDetailedView(edited.siteKey)
            .setServerName(existing.serverName)
            .setServerNameAliases(existing.serverNameAliases)
            .save()
            .expectServerNameConflict(existing.serverName)
            .expectServerNameConflict(firstAlias)
            .expectServerNameConflict(secondAlias)
    })

    it('should save the edit once the server name and aliases are free', function () {
        context.tag('edit', 'success-message')
        cy.login()
        ProjectsPage.visit()
            .openDetailedView(edited.siteKey)
            .setServerName(freeServerName)
            .setServerNameAliases(freeServerNameAliases)
            .save()
            .expectSaveSuccess()

        // The banner alone would only prove the request answered — re-read the persisted values.
        ProjectsPage.visit()
            .openDetailedView(edited.siteKey)
            .expectServerName(freeServerName)
            .expectServerNameAliases(freeServerNameAliases)
    })
})
