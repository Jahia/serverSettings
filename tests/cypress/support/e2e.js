// ***********************************************************
// This example support/index.js is processed and
// loaded automatically before your test files.
//
// This is a great place to put global configuration and
// behavior that modifies Cypress.
//
// You can change the location of this file or turn off
// automatically serving support files with the
// 'supportFile' configuration option.
//
// You can read more here:
// https://on.cypress.io/configuration
// ***********************************************************

// Import commands.js using ES2015 syntax:
import './commands'
import 'cypress-wait-until'
// eslint-disable-next-line @typescript-eslint/no-var-requires
require('@jahia/cypress/dist/support/registerSupport').registerSupport()

// Global setup: ensure the dx-base-demo-templates template set is available before any spec runs.
// This is idempotent — Jahia skips the install if the bundle is already active.
// In CI this is also covered by the provisioning manifests; this guard handles local runs.
before(() => {
    cy.runProvisioningScript([
        { installAndStartBundle: 'mvn:org.jahia.modules/dx-base-demo-templates' }
    ], undefined, undefined, { log: true }, 120000)
})

Cypress.on('uncaught:exception', () => {
    // returning false here prevents Cypress from
    // failing the test
    return false
})
if (Cypress.browser.family === 'chromium') {
    Cypress.automation('remote:debugger:protocol', {
        command: 'Network.enable',
        params: {},
    })
    Cypress.automation('remote:debugger:protocol', {
        command: 'Network.setCacheDisabled',
        params: { cacheDisabled: true },
    })
}
