// Realm scope of the administration-properties screen. The screen administers the SERVER, and the
// container that carries that realm is `jnt:globalSettings` — the node the administration route renders
// on. This spec drives the screen's own save transition against a render whose main resource is an
// ordinary page instead, and asserts the root account is not written from there.
//
// WHY THE MAIN RESOURCE IS THE CALLER'S TO CHOOSE, and therefore worth pinning. Core routes ANY render
// request carrying a `webflowexecution*` parameter to its webflow action, and the main resource of that
// render is whatever the URL path resolves to — the parameter only names the component whose flow is
// resumed. So the same flow, minted on the administration route, can have its transition submitted
// against any other URL the caller may render, and the handler then answers a question about a page
// while writing the server's root account. Pinning the realm is what makes the screen's authority a
// property of the render it administers rather than of the URL the submission happened to carry.
//
// Non-vacuity: the negative assertion is paired with a POSITIVE CONTROL that goes through the exact same
// flow, the same form body and the same account, and asserts the save DOES land on the administration
// route. Without it a fixture that submits nothing at all would produce a false green — the account
// would be unchanged for the boring reason that nothing was ever driven. The negative case pins the
// account to its exact pre-attempt value rather than merely "not the attempted one", which a failed read
// would satisfy too.
//
// THE CALLER IS A SERVER ADMINISTRATOR ON PURPOSE, and what this spec claims is about the realm alone.
// That account holds every permission the screen has ever asked for, on the page as much as on the
// settings node, so it is the caller that separates the realm question from the permission question:
// what turns it away here is the realm and nothing else. A caller administering less is already refused
// by the permission, and would leave this spec unable to say which of the two rules answered.
//
// READ THE ACCOUNT BACK IN A CLEAN SESSION. A refused submission still populates the flow's own form
// model, and the conversation stays alive in the session that submitted it, so the very next render of
// the screen in that session echoes the REJECTED value straight back into the field. Reading it there
// would report a write that never happened. Clearing the cookies first forces a new flow, which is
// populated from the stored account and nothing else.
//
// State is read back THROUGH THE SCREEN, as an administrator, rather than through a content API: the
// rendered form is populated from the stored root account, so it observes the same state with nothing
// but the mechanism already under test — no second API surface to be gated or shaped differently.
//
// Fully self-contained: creates its own site and account in before(); restores the root account and
// tears everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles } from '@jahia/cypress'

/** Where the screen is reached — a render on `jnt:globalSettings`, the realm it administers. */
const ADMIN_ROUTE = '/cms/adminframe/default/en/settings.adminProperties.html'

describe('Administration properties - realm scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'admPropRealm' + uniq

    // administers the server, so the permission half of the requirement is satisfied everywhere and the
    // realm half is the only thing left that can refuse
    const serverAdmin = 'admpropRealmAdmin' + uniq

    // Captured before anything is driven and put back in after(), so a failing run cannot leave the
    // instance's root account rewritten.
    let originalEmail = ''

    // Every render gets its own cache-buster: a repeated one would let the fragment cache answer, and a
    // stale fragment reads exactly like "the value did not change".
    let probe = 0
    const ec = () => `${uniq}-${probe++}`

    /** A render whose main resource is an ordinary page — carrying no administration realm. */
    const foreignRoute = () => `/cms/render/default/en/sites/${site}/home.html`

    /** Render the screen on its administration route, in a session freshly minted for `user`. */
    const render = (user: string) => {
        cy.clearCookies() // a live conversation would answer with its own model; see the header
        cy.login(user, 'password')
        return cy
            .request({ url: ADMIN_ROUTE, qs: { ec: ec() }, failOnStatusCode: false })
            .then((res) => (typeof res.body === 'string' ? res.body : ''))
    }

    // The screen's own form, isolated from the rest of the page it is served in, so that a field read out
    // of it is the screen's field and not a same-named one belonging to something else on the page.
    const screenForm = (body: string) => /<form[^>]*id="adminProperties"[\s\S]*?<\/form>/.exec(body)?.[0] ?? null

    /** The email the screen currently holds for the root account, as stored. */
    const storedEmail = (user: string) =>
        render(user).then((body) => {
            const form = screenForm(body)
            expect(form, `the screen must be served to ${user}`).to.not.eq(null)
            const field = /<input[^>]*id="email"[^>]*value="([^"]*)"/.exec(form)
            expect(field, `the screen must render its email field to ${user}`).to.not.eq(null)
            return Cypress.$('<textarea/>').html(field[1]).text()
        })

    /** The flow's own submit target, as the screen itself emitted it. */
    const submitTarget = (body: string) =>
        /<form[^>]*id="adminProperties"[^>]*action="([^"]+)"/.exec(body)?.[1].replace(/&amp;/g, '&') ?? null

    const formBody = (email: string) => ({
        firstName: '',
        lastName: '',
        organization: '',
        email,
        _emailNotificationsDisabled: 'on',
        preferredLanguage: 'en',
        _eventId_submit: 'Save',
    })

    /**
     * Mint the flow on the administration route, then submit its save transition — at the screen's own
     * target when `route` is omitted, or at the same flow re-pointed at another render when it is given.
     * Returns whether the screen acknowledged a save, which only the administration route answers with.
     */
    const submitEmail = (user: string, email: string, route?: string): Cypress.Chainable<boolean> =>
        render(user).then((body) => {
            const action = submitTarget(body)
            expect(action, `the screen must offer ${user} a save target`).to.not.eq(null)
            // the query string carries the flow token and the execution key; only the path before it says
            // which render the transition is answered on
            const url = route ? route + action.slice(action.indexOf('?')) : action
            return cy
                .request({ method: 'POST', url, form: true, failOnStatusCode: false, body: formBody(email) })
                .then((submit) => /alert-success/.test(typeof submit.body === 'string' ? submit.body : ''))
        })

    before(() => {
        cy.login()
        createSite(site, { languages: 'en', templateSet: 'templates-system', serverName: 'localhost', locale: 'en' })
        createUser(serverAdmin, 'password')
        grantRoles('/', ['server-administrator'], serverAdmin, 'USER')
        // it must also be able to render the site's home page, so the negative case measures the realm and
        // not the site's read ACL
        grantRoles(`/sites/${site}`, ['editor'], serverAdmin, 'USER')

        storedEmail(serverAdmin).then((value) => {
            originalEmail = value
        })
    })

    after(() => {
        // put the account back the way it was found, through the same screen
        submitEmail(serverAdmin, originalEmail)
        cy.clearCookies()
        cy.login()
        deleteUser(serverAdmin)
        deleteSite(site)
    })

    it('saves the root account from the administration route (positive control)', () => {
        const email = `admprop-realm-control-${uniq}@jahia.invalid`
        submitEmail(serverAdmin, email).should('eq', true)
        storedEmail(serverAdmin).should('eq', email)
    })

    it('does not save the root account from a render that carries no administration realm', () => {
        const email = `admprop-realm-attempt-${uniq}@jahia.invalid`
        storedEmail(serverAdmin).then((before) => {
            // The transition answers this route with a redirect and no body, so the screen says nothing
            // either way here and its acknowledgement is not evidence — asserting its absence would pass
            // for the boring reason that there was never a body to read it in. The account itself is the
            // only witness, and it is the one the customer is owed.
            submitEmail(serverAdmin, email, foreignRoute())
            // pinned to the exact pre-attempt value: "not the attempted one" would also pass on a failed read
            storedEmail(serverAdmin).should('eq', before)
        })
    })
})
