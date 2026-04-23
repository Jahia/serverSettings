# Selenium to Cypress Best Practices (Jahia Server Settings)

## Migration patterns
- Map Selenium test intent to Given/When/Then and implement each phase explicitly in Cypress.
- Keep preconditions in `before`/`after` hooks with API or script helpers, not UI setup.
- Use page objects for repeated UI flows and keep assertions close to business behavior.
- Prefer `@jahia/cypress` primitives (`createSite`, `deleteSite`, `addNode`, `executeGroovy`) before writing custom commands.

## Anti-patterns
- Do not create test preconditions by clicking through admin UIs unless no API/script alternative exists.
- Do not use static waits for state transitions if an element or request-based assertion is possible.
- Do not hardcode brittle selectors based on CSS hierarchy or translated labels when stable IDs/names exist.
- Do not mix setup, action, and verification in a single opaque helper.
- **Do not use `cy.get()` inside a `.within()` block to interact with iframe content** — the subject stays bound to the iframe element wrapper, not the frame document. Use the IFrame.enter() pattern instead (see below).

## Iframe handling — the IFrame.enter() pattern

Jahia administration pages embed their content inside a nested iframe (e.g. `adminframe` → `webProjectSettings`). Any `cy.get()` call that runs against the outer shell body will silently find zero elements — there is no Cypress error, just a timeout.

**Confirmed root cause diagnostic signal:**
```json
{ "hasCreateSite": 0, "hasSitesForm": 0, "hasTitleInput": 0 }
```
If these are all zero, Cypress is querying the shell body, not the frame document.

**The correct pattern (from `@jahia/cypress` `IFrame.enter()`):**
```typescript
cy.get('iframe[src*="webProjectSettings"]')
    .should(f => {
        const fr = f[0] as HTMLIFrameElement
        expect(fr.contentWindow?.location.href).not.equals('about:blank')
        expect(fr.contentWindow?.document.readyState).equals('complete')
        expect(fr.contentDocument?.body).not.be.empty
    })
    .then(f => {
        const fr = f[0] as HTMLIFrameElement
        cy.visit(fr.contentWindow!.location.href)
    })
```
After `cy.visit(frame.contentWindow.location.href)`, all subsequent `cy.get()` calls run against the frame document with no scoping needed — exactly like a normal page test.

**Approaches that do NOT work for Jahia admin iframes:**
- `cy.iframe(selector).within(cb)` — within() block does not scope cy.get() to the frame document
- `cy.get('iframe').then($f => cy.wrap($f.contents().find(...)))` — jQuery snapshots go stale across step navigations
- `dispatchEvent(new MouseEvent('click'))` — bypasses jQuery delegated handlers
- `cy.window().then(win => win.submitSiteForm(...))` — runs against the shell window, not the frame window

## Selector strategy and flake prevention
- Prefer stable selectors in this order: `data-*` hooks, IDs, input names, and deterministic table anchors.
- Assert `be.visible` (not just `exist`) on inputs before `.clear().type()` to ensure the WebFlow step has fully rendered.
- Use explicit `{ timeout: 30000 }` on the first element of each WebFlow step — server-side navigation between steps takes 2–5 s.
- Use unique runtime suffixes (`Date.now()`) for server names and aliases when global uniqueness matters for site creation.
- Use deterministic assertions (`have.value`, `contains`, `exist`) for final state verification.

## Global test environment setup

Any test suite that creates Jahia sites requires at least one non-system template set to be installed.
Guard this in two places:

**1. `cypress/support/e2e.js` — covers local runs (idempotent):**
```js
before(() => {
    cy.runProvisioningScript([
        { installAndStartBundle: 'mvn:org.jahia.modules/dx-base-demo-templates' }
    ])
})
```

**2. Provisioning manifests — covers CI:**
```yaml
- installBundle: 'mvn:org.jahia.modules/dx-base-demo-templates'
  autoStart: true
```
Add this to both `provisioning-manifest-snapshot.yml` and `provisioning-manifest-build.yml`.

> `cy.runProvisioningScript` uses `Cypress.env('SUPER_USER_PASSWORD')` and `Cypress.config().baseUrl` by default.
> Jahia's provisioning API skips the install if the bundle is already active, so this is safe to run on every test run.

## Jahia-specific @jahia/cypress guidance
- Use `deleteSite(siteKey)` in Given steps to enforce a clean state for the target site key.
- Use `cy.login()` or `cy.loginAndStoreSession()` only for the UI phase (When/Then).
- Use `cy.runProvisioningScript([{ installAndStartBundle: 'mvn:...' }])` for idempotent module setup in `before()` hooks.
- Prefer `cy.executeGroovy(...)` for bulk setup/cleanup when needed across test suites.
- Keep reusable setup utilities in support files and promote broadly useful ones to `@jahia/cypress`.
- Add `"dom"` to `lib` in `cypress/tsconfig.json` (`"lib": ["es2015", "dom"]`) — required for `HTMLIFrameElement` and other DOM types.

## Tagged test wrapper guidance
- Wrap each migrated test with metadata (`id`, `tags`) to enable downstream coverage analytics.
- Store tags in Cypress test config `env` for future centralized reporting.
- Keep tags domain-focused and stable over time.

## PR readiness checklist
- Preconditions are API/script based and avoid UI setup.
- Test uses stable selectors and explicit assertions.
- If the spec touches admin pages with iframes: IFrame.enter() pattern used, not `.within()`.
- Required modules/template sets are provisioned in both `e2e.js` and the provisioning manifests.
- `cypress/tsconfig.json` includes `"dom"` in `lib`.
- Site/data cleanup is implemented in `after()`.
- Lint passes for updated Cypress files.
- Targeted spec execution attempted and result captured.
- Migration notes added or updated in this document.
