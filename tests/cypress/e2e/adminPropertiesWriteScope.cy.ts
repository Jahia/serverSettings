// Write scope of the administration-properties screen. The screen edits the root account, and every
// property it writes carries the same administration requirement, so the requirement holds for the save
// as a whole. This spec drives the screen through the administration route it is reached by, and asserts
// that the root account only ever changes when the caller administers the server.
//
// Non-vacuity: the negative assertion is paired with a POSITIVE CONTROL that goes through the exact same
// request shape and asserts the save DOES land for a server administrator. Without it, a fixture that
// fails to submit anything at all would produce a false green — the root account would be unchanged for
// the boring reason that nothing was ever driven. The negative case also pins the account to its exact
// pre-attempt value rather than merely "not the attempted one", which a failed read would satisfy too.
//
// Both cases are driven at the same URL with the same form body, so who is calling is the only thing that
// varies between them. The negative case asserts the outcome a customer is owed — the root account is
// untouched — and holds wherever along that route a caller administering nothing is turned away.
//
// The low-privilege account is a real editor of a site, so its refusal is a decision about a caller that
// administers nothing, and not about an account that holds nothing at all.
//
// State is read back THROUGH THE SCREEN, as an administrator, rather than through a content API: the
// rendered form is populated from the stored root account, so it observes the same state with nothing but
// the mechanism already under test — no second API surface to be gated or shaped differently.
//
// Fully self-contained: creates its own site and the accounts in before(); restores the root account and
// tears everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles } from '@jahia/cypress'

/** Where the administration-properties screen is reached. */
const SCREEN_URL = '/cms/adminframe/default/en/settings.adminProperties.html'

/** What the screen did with a submitted save: was a flow served at all, and did it acknowledge a save. */
interface SubmitOutcome {
    served: boolean
    saved: boolean
}

describe('Administration properties - write scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'admPropScope' + uniq

    const serverAdmin = 'admpropserver' + uniq // administers the server
    const lowPriv = 'admproplow' + uniq // edits a site, administers nothing

    // Captured before anything is driven and put back in after(), so a failing run cannot leave the
    // instance's root account rewritten.
    let originalEmail = ''

    // Every render gets its own cache-buster: a repeated one would let the fragment cache answer, and a
    // stale fragment reads exactly like "the value did not change".
    let probe = 0
    const ec = () => `${uniq}-${probe++}`

    const render = (user: string) => {
        cy.login(user, 'password')
        return cy
            .request({ url: SCREEN_URL, qs: { ec: ec() }, failOnStatusCode: false })
            .then((res) => (typeof res.body === 'string' ? res.body : ''))
    }

    // The screen's own form, isolated from the rest of the page it is served in, so that a field read out
    // of it is the screen's field and not a same-named one belonging to something else on the page.
    const screenForm = (body: string) => /<form[^>]*id="adminProperties"[\s\S]*?<\/form>/.exec(body)?.[0] ?? null

    // The email the screen currently holds for the root account, as seen by a caller who may see it.
    const storedEmail = (user: string) =>
        render(user).then((body) => {
            const form = screenForm(body)
            expect(form, `the screen must be served to ${user}`).to.not.eq(null)
            const field = /<input[^>]*id="email"[^>]*value="([^"]*)"/.exec(form)
            expect(field, `the screen must render its email field to ${user}`).to.not.eq(null)
            return Cypress.$('<textarea/>').html(field[1]).text()
        })

    // Render the screen as the given user, then submit its save transition with the supplied email.
    // Reports whether a flow was served at all and whether the screen acknowledged a save, so a refused
    // render and a refused save are told apart.
    const submitEmail = (user: string, email: string): Cypress.Chainable<SubmitOutcome> =>
        render(user).then((body) => {
            const action = /<form[^>]*id="adminProperties"[^>]*action="([^"]+)"/.exec(body)
            if (!action) {
                return cy.wrap<SubmitOutcome>({ served: false, saved: false }, { log: false })
            }

            return cy
                .request({
                    method: 'POST',
                    url: action[1].replace(/&amp;/g, '&'),
                    form: true,
                    failOnStatusCode: false,
                    body: {
                        firstName: '',
                        lastName: '',
                        organization: '',
                        email,
                        _emailNotificationsDisabled: 'on',
                        preferredLanguage: 'en',
                        _eventId_submit: 'Save',
                    },
                })
                .then((submit): SubmitOutcome => {
                    const out = typeof submit.body === 'string' ? submit.body : ''
                    return { served: true, saved: /alert-success/.test(out) }
                })
        })

    before(() => {
        cy.login()
        createSite(site, { languages: 'en', templateSet: 'templates-system', serverName: 'localhost', locale: 'en' })

        createUser(serverAdmin, 'password')
        createUser(lowPriv, 'password')

        grantRoles('/', ['server-administrator'], serverAdmin, 'USER')
        // a real editor of a site, so its refusal is about administering nothing rather than holding nothing
        grantRoles(`/sites/${site}`, ['editor'], lowPriv, 'USER')

        storedEmail(serverAdmin).then((value) => {
            originalEmail = value
        })
    })

    after(() => {
        // put the account back the way it was found, through the same screen
        submitEmail(serverAdmin, originalEmail)
        cy.login()
        deleteUser(serverAdmin)
        deleteUser(lowPriv)
        deleteSite(site)
    })

    it('lets a server administrator save the root account (positive control)', () => {
        const email = `admprop-control-${uniq}@jahia.invalid`
        submitEmail(serverAdmin, email).then((result) => {
            expect(result.served, 'the server administrator must be served the flow').to.eq(true)
            expect(result.saved, 'the server administrator must be able to save').to.eq(true)
        })
        storedEmail(serverAdmin).should('eq', email)
    })

    it('does not let a caller that administers nothing rewrite the root account', () => {
        const email = `admprop-attempt-${uniq}@jahia.invalid`
        storedEmail(serverAdmin).then((before) => {
            submitEmail(lowPriv, email).then((result) => {
                expect(result.saved, 'a caller that administers nothing must not be able to save').to.eq(false)
            })
            // pinned to the exact pre-attempt value: "not the attempted one" would also pass on a failed read
            storedEmail(serverAdmin).should('eq', before)
        })
    })
})
