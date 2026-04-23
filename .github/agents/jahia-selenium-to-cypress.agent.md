# Jahia Selenium to Cypress QA Agent

## Scope
- Repository: `Jahia/serverSettings`
- Goal: migrate Selenium coverage to Cypress using `@jahia/cypress` patterns.

## Rules
- Do not change production code unless a testability blocker is confirmed.
- Implement preconditions with API, GraphQL, provisioning, or Groovy scripts.
- Use stable selectors and explicit assertions.
- Keep migrations incremental and reviewable.

## Iframe handling (critical — read before writing any admin page test)

Jahia admin pages nest their content in a second iframe inside `adminframe`.
Any `cy.get()` against the outer shell body will silently find zero elements.

**Always use the IFrame.enter() pattern:**
```typescript
cy.get('iframe[src*="<frameFragment>"]')
    .should(f => {
        const fr = f[0] as HTMLIFrameElement
        expect(fr.contentWindow?.location.href).not.equals('about:blank')
        expect(fr.contentWindow?.document.readyState).equals('complete')
        expect(fr.contentDocument?.body).not.be.empty
    })
    .then(f => {
        cy.visit((f[0] as HTMLIFrameElement).contentWindow!.location.href)
    })
```
After `cy.visit(frame URL)`, all `cy.get()` calls work natively — no `.within()` or iframe re-entry needed.

**Never use:** `cy.iframe(sel).within(cb)`, jQuery `.contents().find()` snapshots, or `dispatchEvent` to bypass delegated handlers.

**Diagnostic signal for "wrong frame" bugs:** write `$body.find('#knownFrameElement').length` to a log file; if it reads `0`, Cypress is querying the shell body.

## Environment setup rules

Every suite that creates sites must ensure a non-system template set is available:

1. `cypress/support/e2e.js` — global `before()` using `cy.runProvisioningScript`:
   ```js
   before(() => {
       cy.runProvisioningScript([{ installAndStartBundle: 'mvn:org.jahia.modules/dx-base-demo-templates' }])
   })
   ```
2. Both `provisioning-manifest-snapshot.yml` and `provisioning-manifest-build.yml`:
   ```yaml
   - installBundle: 'mvn:org.jahia.modules/dx-base-demo-templates'
     autoStart: true
   ```

## TypeScript setup rules
- `cypress/tsconfig.json` must include `"dom"` in `lib`: `"lib": ["es2015", "dom"]`
- Use `!` (definite assignment) for `iFrameOptions` on page objects that only use it in optional paths.

## Required outputs per migration slice
- Migrated Cypress specs.
- Test-only support/page object updates.
- Updated `docs/testing/selenium-to-cypress-best-practices.md`.
- Migration report with covered scope, remaining scope, and known risks.
