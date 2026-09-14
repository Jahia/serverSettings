import {context, createUser, deleteUser, jfaker} from '@jahia/cypress'
import { ManageUsersPage, SearchProperty } from './page-object/ManageUsersPage'

/**
 * Migrated from the legacy Selenium suite: ManageUsersTest.searchFilteredWord
 * (Jahia/selenium ManageUsersTest.java:237-267). Tracking issue: Jahia/selenium#1604
 * — FT-007, FT-008, FT-009, FT-010, FT-011, FT-012.
 */
describe('Manage Users - property-filtered search', () => {
    const FILTER_USER = {
        username: jfaker.internet.username(),
        password: 'test1234',
        firstName: jfaker.person.firstName(),
        lastName: jfaker.person.lastName(),
        email: jfaker.internet.email(),
        organization: jfaker.company.name()
    }

    const removeLastChar = (value: string) => value.substring(0, value.length - 1)

    before(() => {
        createUser(FILTER_USER.username, FILTER_USER.password, [
            { name: 'j:firstName', value: FILTER_USER.firstName },
            { name: 'j:lastName', value: FILTER_USER.lastName },
            { name: 'j:email', value: FILTER_USER.email },
            { name: 'j:organization', value: FILTER_USER.organization },
        ])
    })

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        deleteUser(FILTER_USER.username)
    })

    // property under test, the value that matches, and the value that must NOT match under it
    const cases: Array<{ ft: string; property: SearchProperty; match: string; nonMatch: string; tag: string }> = [
        {ft: 'FT-007', property: SearchProperty.USERNAME, match: FILTER_USER.username, nonMatch: FILTER_USER.organization, tag: 'username'},
        {ft: 'FT-008', property: SearchProperty.FIRSTNAME, match: FILTER_USER.firstName, nonMatch: FILTER_USER.organization, tag: 'first-name'},
        {ft: 'FT-009', property: SearchProperty.LASTNAME, match: FILTER_USER.lastName, nonMatch: FILTER_USER.organization, tag: 'last-name'},
        {ft: 'FT-010', property: SearchProperty.EMAIL, match: FILTER_USER.email, nonMatch: FILTER_USER.organization, tag: 'email'},
        {ft: 'FT-011', property: SearchProperty.ORGANISATION, match: FILTER_USER.organization, nonMatch: FILTER_USER.lastName, tag: 'organisation'}
    ]

    cases.forEach(({ ft, property, match, nonMatch, tag }) => {
        it(`should match only on ${tag} when the ${tag} filter is scoped (${ft})`, () => {
            context.tag('user-management', 'search', 'filter', tag, 'admin')
            let page = ManageUsersPage.visit().filterSearchProperties([property])
            page.search(match).verifyUserListed(FILTER_USER.username)

            page = ManageUsersPage.visit().filterSearchProperties([property])
            page.search(nonMatch).verifyUserNotListed(FILTER_USER.username)

            page = ManageUsersPage.visit().filterSearchProperties([property])
            page.search(removeLastChar(match)).verifyUserListed(FILTER_USER.username)
        })
    })

    it('should keep a Last-name-filtered search scoped despite other filter checkboxes being toggled first (FT-012)', () => {
        context.tag('user-management', 'search', 'filter', 'ui-state', 'admin')

        // Pass 1: also has First name checked before scoping to Last name.
        let page = ManageUsersPage.visit().filterSearchProperties([SearchProperty.FIRSTNAME, SearchProperty.LASTNAME])
        page.search(FILTER_USER.lastName).verifyUserListed(FILTER_USER.username)
        page = ManageUsersPage.visit().filterSearchProperties([SearchProperty.FIRSTNAME, SearchProperty.LASTNAME])
        page.search(FILTER_USER.organization).verifyUserNotListed(FILTER_USER.username)

        // Pass 2: First name + Email also checked.
        page = ManageUsersPage.visit().filterSearchProperties([SearchProperty.FIRSTNAME, SearchProperty.EMAIL, SearchProperty.LASTNAME])
        page.search(removeLastChar(FILTER_USER.lastName)).verifyUserListed(FILTER_USER.username)

        // Pass 3: First name + Email + Organisation also checked.
        page = ManageUsersPage.visit().filterSearchProperties([
            SearchProperty.FIRSTNAME,
            SearchProperty.EMAIL,
            SearchProperty.ORGANISATION,
            SearchProperty.LASTNAME,
        ])
        page.search(FILTER_USER.lastName).verifyUserListed(FILTER_USER.username)
    })
})
