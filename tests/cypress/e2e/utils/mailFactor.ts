/**
 * Thin wrapper around the `cypress-mailpit` commands, following the pattern established in
 * Jahia/user-password-authentication's `tests/cypress/e2e/utils/emailFactor.ts`. If this repo and
 * that one both need it, it is a candidate to lift into a shared `@jahia/cypress` helper instead of
 * a third copy — see the migration PR description for Jahia/selenium#1604.
 */

export function deleteAllEmails() {
    cy.mailpitDeleteAllEmails()
}

/**
 * Waits for an email matching the given subject and recipient, then returns its HTML body.
 * @param to the recipient email address to search for.
 * @param subject the exact email subject to search for.
 */
export function getEmailBody(to: string, subject: string): Cypress.Chainable<string> {
    return cy
        .mailpitHasEmailsBySearch(`Subject:${subject} to:${to}`, undefined, undefined, {
            timeout: 15000,
            interval: 500,
        })
        .should((result) => {
            expect(result).to.have.property('total').and.to.be.greaterThan(0)
            expect(result).to.have.property('messages').and.to.be.an('array').and.to.have.length.greaterThan(0)
        })
        .then((result) => result.messages[0])
        .mailpitGetMailHTMlBody()
}

/**
 * Asserts that no email matching the given subject and recipient has arrived after letting
 * `waitMs` elapse. Absence cannot be retry-asserted the way `getEmailBody` retries-until-found
 * (a "the count is zero" assertion is trivially true at t=0) — the window has to actually elapse
 * for the negative to mean anything, so this is the one deliberate exception to "no cy.wait(ms)"
 * in this suite: it is a fixed wait to make a negative meaningful, not a poll for a known-eventual
 * state, which is the only place jahia-cypress-testing allows one.
 */
export function expectNoEmail(to: string, subject: string, waitMs = 8000): void {
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(waitMs)
    cy.mailpitHasEmailsBySearch(`Subject:${subject} to:${to}`).then((result) => {
        expect(result.total, `expected no email with subject "${subject}" to ${to}`).to.eq(0)
    })
}
