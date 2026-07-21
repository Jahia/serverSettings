import { createUser, deleteUser, grantRoles } from '@jahia/cypress'
import { PasswordPolicyPage } from './page-object/PasswordPolicyPage'

describe('Password Policy Tests', () => {
    const RULES = {
        PREVENT_PASSWORD_CHANGE: 'Do not allow users to change their passwords',
        MIN_LENGTH: 'Minimum password length',
        MAX_LENGTH: 'Maximum password length',
        DIGITS_REQUIRED: 'Number of digits required',
        SPECIAL_CHARS_REQUIRED: 'Number of special characters required',
        PREVENT_SIMILAR_USERNAME: 'Prevent using password similar to the user name',
        PREVENT_REUSE: 'Prevent password reuse',
    }

    const TEST_USER = 'testPolicyUser'
    const TEST_USER_PASSWORD = 'TestPass12&'

    before(() => {
        cy.login()
        createUser(TEST_USER, TEST_USER_PASSWORD)
        grantRoles('/', ['server-administrator'], TEST_USER, 'USER')
    })

    afterEach(() => {
        // Reset all password policy rules
        cy.login()
        const policyPage = PasswordPolicyPage.visit()
        policyPage
            .uncheckRule(RULES.PREVENT_PASSWORD_CHANGE)
            .uncheckRule(RULES.MIN_LENGTH)
            .uncheckRule(RULES.MAX_LENGTH)
            .uncheckRule(RULES.DIGITS_REQUIRED)
            .uncheckRule(RULES.SPECIAL_CHARS_REQUIRED)
            .uncheckRule(RULES.PREVENT_SIMILAR_USERNAME)
            .uncheckRule(RULES.PREVENT_REUSE)
            .save()
    })

    after(() => {
        cy.login()
        deleteUser(TEST_USER)
    })

    it('should enforce password policy rules on user creation', () => {
        cy.login()

        // Configure password policy settings
        const policyPage = PasswordPolicyPage.visit()
        policyPage
            .checkRule(RULES.MIN_LENGTH)
            .setParameter(RULES.MIN_LENGTH, '6')
            .checkRule(RULES.MAX_LENGTH)
            .setParameter(RULES.MAX_LENGTH, '15')
            .checkRule(RULES.DIGITS_REQUIRED)
            .setParameter(RULES.DIGITS_REQUIRED, '2')
            .checkRule(RULES.SPECIAL_CHARS_REQUIRED)
            .setParameter(RULES.SPECIAL_CHARS_REQUIRED, '1', 0)
            .setParameter(RULES.SPECIAL_CHARS_REQUIRED, '_*+-&$!@', 1)
            .checkRule(RULES.PREVENT_SIMILAR_USERNAME)
            .save()

        cy.visit('/jahia/administration/manageUsers')

        const manageUsersIframe = 'iframe[src*="manageUsers"]'
        cy.frameLoaded(manageUsersIframe)

        // Click "Create new user" button
        cy.iframe(manageUsersIframe).find('button[onclick*="addUser"]').click()
        /* eslint-disable cypress/no-unnecessary-waiting */
        cy.wait(2000)

        function submitUserCreation(username: string, password: string) {
            cy.iframe(manageUsersIframe).find('#username').clear().type(username)
            cy.iframe(manageUsersIframe).find('#password').clear().type(password)
            cy.iframe(manageUsersIframe).find('#passwordConfirm').clear().type(password)
            cy.iframe(manageUsersIframe).find('button[type="submit"][name="_eventId_add"]').click()
            /* eslint-disable cypress/no-unnecessary-waiting */
            cy.wait(2000)
        }

        // Test: password too short (< 6 characters)
        submitUserCreation('newTestUser', 'pass')
        cy.iframe(manageUsersIframe)
            .find('.alert-danger')
            .should('contain', 'Password must contain at least 6 characters')

        // Test: password too long (> 15 characters)
        submitUserCreation('newTestUser', 'passwoooooooooooooooooooord')
        cy.iframe(manageUsersIframe)
            .find('.alert-danger')
            .should('contain', 'Password cannot be longer than 15 characters')

        // Test: password without digits
        submitUserCreation('newTestUser', 'password')
        cy.iframe(manageUsersIframe)
            .find('.alert-danger')
            .should('contain', 'Password must contain at least 2 digit(s)')

        // Test: password with non-allowed special char but no digits
        submitUserCreation('newTestUser', 'password.')
        cy.iframe(manageUsersIframe)
            .find('.alert-danger')
            .should('contain', 'Password must contain at least 2 digit(s)')

        // Test: password with 2 digits but no required special character
        submitUserCreation('newTestUser', 'password12')
        cy.iframe(manageUsersIframe)
            .find('.alert-danger')
            .should('contain', 'Password must contain at least 1 of the following characters: _*+-&$!@')

        // Test: password similar to username
        submitUserCreation('newTestUser', 'newTestUser12&')
        cy.iframe(manageUsersIframe)
            .find('.alert-danger')
            .should('contain', 'Password is not allowed to be similar to the user name')
    })

    it('should prevent non-root users from changing their passwords when rule is enabled', () => {
        cy.login()
        const policyPage = PasswordPolicyPage.visit()
        policyPage.checkRule(RULES.PREVENT_PASSWORD_CHANGE).save()
        cy.logout()

        // Log in as server-admin test user and attempt to change password via profile.
        // Use a validated, isolated session to avoid interference with other tests.
        cy.loginAndStoreSession(TEST_USER, TEST_USER_PASSWORD)
        cy.visit('/jahia/profile')
        const profileIframe = 'iframe[src*="me.html"]'
        cy.get(profileIframe, { timeout: 60000 }).should('exist')
        cy.frameLoaded(profileIframe, { timeout: 60000 })

        cy.iframe(profileIframe).find('#passwordRows #password button.btn-fab').click()
        cy.iframe(profileIframe).find('#oldPasswordField').clear().type(TEST_USER_PASSWORD)
        cy.iframe(profileIframe).find('#passwordField').clear().type('NewPass12&')
        cy.iframe(profileIframe).find('#passwordconfirm').clear().type('NewPass12&')
        cy.iframe(profileIframe).find('#passwordChangeButton').click()

        // Verify error message
        cy.iframe(profileIframe)
            .find('#passwordErrors', { timeout: 10000 })
            .should('be.visible')
            .and('contain', 'You are not allowed to change the password')
        cy.logout()
    })

    it('should prevent password reuse when rule is enabled', () => {
        cy.login()
        const policyPage = PasswordPolicyPage.visit()
        policyPage.checkRule(RULES.PREVENT_REUSE).setParameter(RULES.PREVENT_REUSE, '1').save()

        cy.visit('/jahia/administration/manageUsers')

        const manageUsersIframe = 'iframe[src*="manageUsers"]'
        cy.frameLoaded(manageUsersIframe)
        cy.iframe(manageUsersIframe).contains('a', TEST_USER).click()
        /* eslint-disable cypress/no-unnecessary-waiting */
        cy.wait(2000)

        // Change password first time
        cy.iframe(manageUsersIframe).find('#password').clear().type('ReusedPass12&')
        cy.iframe(manageUsersIframe).find('#passwordConfirm').clear().type('ReusedPass12&')
        cy.iframe(manageUsersIframe).find('button[type="submit"][name="_eventId_update"]').click()
        cy.wait(2000)

        // Try to reuse same password
        cy.iframe(manageUsersIframe).contains('a', TEST_USER).click()
        cy.wait(2000)
        cy.iframe(manageUsersIframe).find('#password').clear().type('ReusedPass12&')
        cy.iframe(manageUsersIframe).find('#passwordConfirm').clear().type('ReusedPass12&')
        cy.iframe(manageUsersIframe).find('button[type="submit"][name="_eventId_update"]').click()
        cy.wait(2000)

        cy.iframe(manageUsersIframe)
            .find('.alert-danger')
            .should('contain', 'It is not allowed to reuse last 1 passwords')
    })
})
