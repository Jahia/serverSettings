/**
 * Thin wrapper around the `cypress-mailpit` commands.
 */
export function deleteAllEmails() {
    return cy.mailpitDeleteAllEmails()
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
 * Asserts that no email matching the given subject and recipient has received.
 */
export function expectNoEmail(to: string, subject: string): void {
    // Wait for the events sync up
    // eslint-disable-next-line cypress/no-unnecessary-waiting
    cy.wait(5000).then(() => {
        cy.mailpitNotHasEmailsBySearch(`Subject:${subject} to:${to}`, 0, 1, {timeout: 1000, interval: 500}).then((result) => {
            expect(result.total, `expected no email with subject "${subject}" to ${to}`).to.eq(0)
        })
    })
}
