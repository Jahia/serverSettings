// Write scope of the administration-properties screen. The screen edits the root account, and every
// property it writes carries the same administration requirement, so the requirement holds for the save
// as a whole. This spec drives the screen's save transition through its administration route and asserts
// that the root account only ever changes when the caller administers the server.
//
// Non-vacuity: the negative assertion is paired with a POSITIVE CONTROL that goes through the exact same
// request shape and asserts the save DOES land for a server administrator. Without it, a fixture that
// fails to submit anything at all would produce a false green — the root account would be unchanged for
// the boring reason that nothing was ever driven. The negative case also pins the account to its exact
// pre-attempt value rather than merely "not the attempted one", which a failed read would satisfy too.
//
// The low-privilege account is a real editor of a throwaway site, which is what makes it an ordinary
// authenticated account rather than one that holds nothing at all, and it proves that session through
// currentUser before being refused. So its refusal is a decision about administering the server, not a
// failure to hold a session. The two callers differ in nothing but what they administer, and they drive
// the same URL.
//
// State is read back THROUGH THE SCREEN, as an administrator, rather than through a content API: the
// rendered form is populated from the stored root account, so it observes the same state with nothing but
// the mechanism already under test — no second API surface to be gated or shaped differently.
//
// A settings component placed outside its settings container is served to no caller at all; that is the
// invariant of settingsComponentRenderScope.cy.ts and is deliberately not re-asserted here.
//
// Fully self-contained: creates its own site and accounts in before(); restores the root account and
// tears everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles } from '@jahia/cypress'

/** What the screen did with a submitted save: was a flow served at all, and did it acknowledge a save. */
interface SubmitOutcome {
    served: boolean
    saved: boolean
}

describe('Administration properties - write scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'admPropScope' + uniq

    const serverAdmin = 'admpropserver' + uniq // administers the server
    const lowPriv = 'admproplow' + uniq // edits the throwaway site, administers nothing

    // the screen reached through the administration route that declares its requirement
    const screenUrl = '/cms/adminframe/default/en/settings.adminProperties.html'

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
            .request({ url: screenUrl, qs: { ec: ec() }, failOnStatusCode: false })
            .then((res) => (typeof res.body === 'string' ? res.body : ''))
    }

    // The email the screen currently holds for the root account, as seen by a caller who may see it.
    const storedEmail = (user: string) =>
        render(user).then((body) => {
            const field = /name="email"[^>]*value="([^"]*)"/.exec(body)
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
        // an ordinary grant, so the refused caller is a real authenticated account and not one holding
        // nothing at all — the session it proves below is what makes its refusal about authority
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
        cy.login(lowPriv, 'password')
        cy.request({
            method: 'POST',
            url: '/modules/graphql',
            headers: { Origin: Cypress.config().baseUrl as string },
            body: { query: '{currentUser{name}}' },
        }).then((res) => {
            expect(res.body?.data?.currentUser?.name, 'the refused caller must hold a session of its own').to.eq(
                lowPriv,
            )
        })

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
