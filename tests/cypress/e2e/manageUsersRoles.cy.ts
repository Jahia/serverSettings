import { context, createSite, deleteSite, createUser, deleteUser, grantRoles, jfaker } from '@jahia/cypress'
import { ManageUsersPage } from './page-object/ManageUsersPage'

/**
 * Migrated from the legacy Selenium suite: ManageUsersTest.verifyUsersLanguages and the role-dropdown
 * assertion inside emailNotification() (Jahia/selenium ManageUsersTest.java:83-85, 189-203).
 * Tracking issue: Jahia/selenium#1604 — FT-019, FT-020, FT-024.
 */
describe('Manage Users - role grants and the edit-form role selector', () => {
    const PASSWORD = 'test1234'
    const siteKey = jfaker.lorem.slug()

    const englishEditor = 'enEditor'
    const frenchEditor = 'frEditor'
    const enText = 'my projects'
    const frText = 'mes projets'

    before(() => {
        cy.login()
        createSite(siteKey, {
            languages: 'en,fr',
            templateSet: 'templates-system',
            serverName: 'localhost',
            locale: 'en',
        })
        createUser(englishEditor, PASSWORD, [{ name: 'preferredLanguage', value: 'en' }])
        createUser(frenchEditor, PASSWORD, [{ name: 'preferredLanguage', value: 'fr' }])
        // A site-scoped privileged role and a system-scoped privileged role, so the edit-form's
        // role selector (which lists grantable roles across both scopes) has one option of each kind.
        grantRoles(`/sites/${siteKey}`, ['editor'], englishEditor, 'USER')
        grantRoles(`/sites/${siteKey}`, ['editor'], frenchEditor, 'USER')
    })

    after(() => {
        deleteUser(englishEditor)
        deleteUser(frenchEditor)
        deleteSite(siteKey)
    })

    it('should show an English dashboard for a user granted the Editor role with English locale (FT-019)', () => {
        context.tag('user-management', 'roles', 'localization', 'dashboard', 'admin')
        cy.login(englishEditor, PASSWORD)
        cy.visit('/start')
        cy.get('body').should(($body) => {
            expect($body.text().toLowerCase()).to.contain(enText)
        })
    })

    it('should show a French dashboard for a user granted the Editor role with French locale (FT-020)', () => {
        context.tag('user-management', 'roles', 'localization', 'dashboard', 'admin')
        cy.login(frenchEditor, PASSWORD)
        cy.visit('/start')
        cy.get('body').should(($body) => {
            expect($body.text().toLowerCase()).to.contain(frText)
        })
    })

    it('should list the expected site-scoped and system-scoped role options on the edit form (FT-024)', () => {
        context.tag('user-management', 'roles', 'edit', 'admin')
        cy.login()
        // The admin screen server-truncates a long site key with ".." to fit its column.
        ManageUsersPage.visit()
            .openUser(englishEditor)
            .verifyRoleOptionContaining('site-privileged', siteKey.length > 15 ? `${siteKey.slice(0, 13)}..` : siteKey)
            .verifyRoleOptionContaining('privileged', 'System Site')
    })
})
