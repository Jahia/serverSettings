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

    function submitPasswordChange(password: string) {
        cy.iframe('iframe[src*="adminProperties.html"]').find('#password').clear().type(password)
        cy.iframe('iframe[src*="adminProperties.html"]').find('#passwordConfirm').clear().type(password)
        cy.iframe('iframe[src*="adminProperties.html"]').find('#submit').click()
        /* eslint-disable cypress/no-unnecessary-waiting */
        cy.wait(2000)
    }

    function verifyPasswordError(message: string) {
        cy.iframe('iframe[src*="adminProperties.html"]').find('.alert-danger').should('contain', message)
    }

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

    it('should configure password policy and enforce rules on password changes', () => {
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

        cy.visit('/jahia/administration/adminProperties')

        // Test: password too short (< 6 characters)
        submitPasswordChange('pass')
        verifyPasswordError('Password must contain at least 6 characters')

        // Test: password too long (> 15 characters)
        submitPasswordChange('passwoooooooooooooooooooord')
        verifyPasswordError('Password cannot be longer than 15 characters')

        // Test: password without digits
        submitPasswordChange('password')
        verifyPasswordError('Password must contain at least 2 digit(s)')

        // Test: password with non-allowed special char but no digits
        submitPasswordChange('password.')
        verifyPasswordError('Password must contain at least 2 digit(s)')

        // Test: password with 2 digits but no required special character
        submitPasswordChange('password12')
        verifyPasswordError('Password must contain at least 1 of the following characters: _*+-&$!@')

        // Test: password similar to username (root)
        submitPasswordChange('root1234&')
        verifyPasswordError('Password is not allowed to be similar to the user name')
    })

    it('should prevent password reuse when rule is enabled', () => {
        cy.login()
        const policyPage = PasswordPolicyPage.visit()
        policyPage
            .checkRule(RULES.PREVENT_REUSE)
            .setParameter(RULES.PREVENT_REUSE, '1')
            .save()

        cy.visit('/jahia/administration/adminProperties')

        submitPasswordChange('ReusedPass12&')
        submitPasswordChange('ReusedPass12&')
        verifyPasswordError('It is not allowed to reuse last 1 passwords')

        // Re-set root password
        submitPasswordChange('root1234')
    })

    it('should prevent non-root users from changing their passwords when rule is enabled', () => {
        cy.login()
        const policyPage = PasswordPolicyPage.visit()
        policyPage
            .checkRule(RULES.PREVENT_PASSWORD_CHANGE)
            .save()
        cy.logout()

        // Log in as server-admin test user and attempt to change password via profile
        cy.login(TEST_USER, TEST_USER_PASSWORD)
        cy.visit('/jahia/profile')
        const profileIframe = 'iframe[src*="me.html"]'
        cy.frameLoaded(profileIframe)

        cy.iframe(profileIframe).find('#passwordRows #password button.btn-fab').click()
        cy.iframe(profileIframe).find('#oldPasswordField').clear().type(TEST_USER_PASSWORD)
        cy.iframe(profileIframe).find('#passwordField').clear().type('NewPass12&')
        cy.iframe(profileIframe).find('#passwordconfirm').clear().type('NewPass12&')
        cy.iframe(profileIframe).find('#passwordChangeButton').click()

        // Verify error message
        cy.iframe(profileIframe).find('#passwordErrors', { timeout: 10000 })
            .should('be.visible')
            .and('contain', 'You are not allowed to change the password')
        cy.logout()
    })
})
