import {PasswordPolicyPage} from './page-object/PasswordPolicyPage'

describe('Password Policy Tests', () => {
    const RULES = {
        PREVENT_PASSWORD_CHANGE: 'Do not allow users to change their passwords',
        MIN_LENGTH: 'Minimum password length',
        MAX_LENGTH: 'Maximum password length',
        DIGITS_REQUIRED: 'Number of digits required',
        SPECIAL_CHARS_REQUIRED: 'Number of special characters required',
        PREVENT_SIMILAR_USERNAME: 'Prevent using password similar to the user name',
        PREVENT_REUSE: 'Prevent password reuse'
    }

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

    after(() => {
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

    it('should configure password policy and enforce rules on password changes', () => {
        cy.login()

        // Step 1: Configure password policy settings
        const policyPage = PasswordPolicyPage.visit()
        policyPage
            .checkRule(RULES.PREVENT_PASSWORD_CHANGE)
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
            .checkRule(RULES.PREVENT_REUSE)
            .setParameter(RULES.PREVENT_REUSE, '3')
            .save()

        // Step 2: Verify settings are persisted after page reload
        const verifyPage = PasswordPolicyPage.visit()
        verifyPage
            .verifyRuleChecked(RULES.PREVENT_PASSWORD_CHANGE)
            .verifyRuleChecked(RULES.MIN_LENGTH)
            .verifyParameterValue(RULES.MIN_LENGTH, '6')
            .verifyRuleChecked(RULES.MAX_LENGTH)
            .verifyParameterValue(RULES.MAX_LENGTH, '15')
            .verifyRuleChecked(RULES.DIGITS_REQUIRED)
            .verifyParameterValue(RULES.DIGITS_REQUIRED, '2')
            .verifyRuleChecked(RULES.SPECIAL_CHARS_REQUIRED)
            .verifyParameterValue(RULES.SPECIAL_CHARS_REQUIRED, '1', 0)
            .verifyParameterValue(RULES.SPECIAL_CHARS_REQUIRED, '_*+-&$!@', 1)
            .verifyRuleChecked(RULES.PREVENT_SIMILAR_USERNAME)
            .verifyRuleChecked(RULES.PREVENT_REUSE)
            .verifyParameterValue(RULES.PREVENT_REUSE, '3')

        // Step 3: Test password policy enforcement via admin properties
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
})
