/**
 * The web-project settings screens all render inside this admin iframe.
 */
export const WEB_PROJECTS_IFRAME = 'iframe[src*="webProjectSettings.html"]'

/**
 * Resolves the admin iframe's body as a **retryable query chain**.
 *
 * Every step of these screens is a POST that swaps the iframe's document, so any held reference goes
 * stale. `cy.iframe()` (cypress-iframe) is a *command*, so Cypress cannot requery it and a swap
 * surfaces as "the subject is no longer attached to the DOM". `cy.get()` and `.its()` are *queries*:
 * the whole chain — including the `.find()` appended by the caller — is retried until it settles,
 * which is what makes navigation inside the iframe survivable.
 *
 * Deliberately no assertion here: a `.should()` inside this helper would end the retryable query
 * group and freeze the body, reintroducing the exact staleness it exists to avoid. The caller's own
 * assertion is what drives the retry.
 */
export const webProjectsFrame = () => cy.get(WEB_PROJECTS_IFRAME, { timeout: 30000 }).its('0.contentDocument.body')
