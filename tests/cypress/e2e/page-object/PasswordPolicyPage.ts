import {BasePage} from '@jahia/cypress'

export class PasswordPolicyPage extends BasePage {
    static readonly IFRAME_SELECTOR = 'iframe[src*="passwordPolicy.html"]'

    static visit(): PasswordPolicyPage {
        cy.visit('/jahia/administration/passwordPolicy')
        return new PasswordPolicyPage()
    }

    private iframe() {
        return cy.iframe(PasswordPolicyPage.IFRAME_SELECTOR)
    }

    checkRule(ruleLabel: string): PasswordPolicyPage {
        this.iframe().contains('tr', ruleLabel).find('input[type="checkbox"]').check({force: true})
        return this
    }

    uncheckRule(ruleLabel: string): PasswordPolicyPage {
        this.iframe().contains('tr', ruleLabel).find('input[type="checkbox"]').uncheck({force: true})
        return this
    }

    setParameter(ruleLabel: string, value: string, paramIndex = 0): PasswordPolicyPage {
        this.iframe().contains('tr', ruleLabel).find('input.form-control').eq(paramIndex).clear().type(value)
        return this
    }

    save(): PasswordPolicyPage {
        this.iframe().find('button[name="_eventId_submitPwdPolicy"]').click()
        return this
    }

    verifyRuleChecked(ruleLabel: string): PasswordPolicyPage {
        this.iframe().contains('tr', ruleLabel).find('input[type="checkbox"]').should('be.checked')
        return this
    }

    verifyParameterValue(ruleLabel: string, expectedValue: string, paramIndex = 0): PasswordPolicyPage {
        this.iframe().contains('tr', ruleLabel).find('input.form-control').eq(paramIndex).should('have.value', expectedValue)
        return this
    }
}
