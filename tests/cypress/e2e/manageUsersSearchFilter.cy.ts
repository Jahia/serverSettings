import { context, createUser, deleteUser } from '@jahia/cypress'
import { ManageUsersPage, SearchProperty } from './page-object/ManageUsersPage'

/**
 * Migrated from the legacy Selenium suite: ManageUsersTest.searchFilteredWord
 * (Jahia/selenium ManageUsersTest.java:237-267). Tracking issue: Jahia/selenium#1604
 * — FT-007, FT-008, FT-009, FT-010, FT-011, FT-012.
 */
describe('Manage Users - property-filtered search', () => {
    const PASSWORD = 'TestPass12&'
    const FILTER_USER = 'filterTestUser'
    const PROFILE = {
        firstName: 'Filterable',
        lastName: 'Discoverable',
        email: 'filterable.discoverable@jahia.invalid',
        organization: 'JahiaFilterOrg',
    }

    const removeLastChar = (value: string) => value.substring(0, value.length - 1)

    before(() => {
        createUser(FILTER_USER, PASSWORD, [
            { name: 'j:firstName', value: PROFILE.firstName },
            { name: 'j:lastName', value: PROFILE.lastName },
            { name: 'j:email', value: PROFILE.email },
            { name: 'j:organization', value: PROFILE.organization },
        ])
    })

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        deleteUser(FILTER_USER)
    })

    // property under test, the value that matches, and the value that must NOT match under it
    const cases: Array<{ ft: string; property: SearchProperty; match: string; nonMatch: string; tag: string }> = [
        {ft: 'FT-007', property: SearchProperty.USERNAME, match: FILTER_USER, nonMatch: PROFILE.organization, tag: 'username'},
        {ft: 'FT-008', property: SearchProperty.FIRSTNAME, match: PROFILE.firstName, nonMatch: PROFILE.organization, tag: 'first-name'},
        {ft: 'FT-009', property: SearchProperty.LASTNAME, match: PROFILE.lastName, nonMatch: PROFILE.organization, tag: 'last-name'},
        {ft: 'FT-010', property: SearchProperty.EMAIL, match: PROFILE.email, nonMatch: PROFILE.organization, tag: 'email'},
        {ft: 'FT-011', property: SearchProperty.ORGANISATION, match: PROFILE.organization, nonMatch: PROFILE.lastName, tag: 'organisation'}
    ]

    cases.forEach(({ ft, property, match, nonMatch, tag }) => {
        it(`should match only on ${tag} when the ${tag} filter is scoped (${ft})`, () => {
            context.tag('user-management', 'search', 'filter', tag, 'admin')
            let page = ManageUsersPage.visit().filterSearchProperties([property])
            page.search(match).verifyUserListed(FILTER_USER)

            page = ManageUsersPage.visit().filterSearchProperties([property])
            page.search(nonMatch).verifyUserNotListed(FILTER_USER)

            page = ManageUsersPage.visit().filterSearchProperties([property])
            page.search(removeLastChar(match)).verifyUserListed(FILTER_USER)
        })
    })

    it('should keep a Last-name-filtered search scoped despite other filter checkboxes being toggled first (FT-012)', () => {
        context.tag('user-management', 'search', 'filter', 'ui-state', 'admin')

        // Pass 1: also has First name checked before scoping to Last name.
        let page = ManageUsersPage.visit().filterSearchProperties([SearchProperty.FIRSTNAME, SearchProperty.LASTNAME])
        page.search(PROFILE.lastName).verifyUserListed(FILTER_USER)
        page = ManageUsersPage.visit().filterSearchProperties([SearchProperty.FIRSTNAME, SearchProperty.LASTNAME])
        page.search(PROFILE.organization).verifyUserNotListed(FILTER_USER)

        // Pass 2: First name + Email also checked.
        page = ManageUsersPage.visit().filterSearchProperties([SearchProperty.FIRSTNAME, SearchProperty.EMAIL, SearchProperty.LASTNAME])
        page.search(removeLastChar(PROFILE.lastName)).verifyUserListed(FILTER_USER)

        // Pass 3: First name + Email + Organisation also checked.
        page = ManageUsersPage.visit().filterSearchProperties([
            SearchProperty.FIRSTNAME,
            SearchProperty.EMAIL,
            SearchProperty.ORGANISATION,
            SearchProperty.LASTNAME,
        ])
        page.search(PROFILE.lastName).verifyUserListed(FILTER_USER)
    })
})
