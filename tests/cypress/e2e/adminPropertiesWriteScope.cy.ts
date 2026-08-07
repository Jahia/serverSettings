// Write scope of the administration-properties screen. The screen edits the root account, and every
// property it writes carries the same administration requirement, so the requirement holds for the save
// as a whole. This spec drives the screen's save transition through a component placed on an ordinary
// page and asserts that the root account only ever changes when the caller administers the server.
//
// Non-vacuity: the negative assertion is paired with a POSITIVE CONTROL that goes through the exact same
// request shape and asserts the save DOES land for a server administrator. Without it, a fixture that
// fails to submit anything at all would produce a false green — the root account would be unchanged for
// the boring reason that nothing was ever driven.
//
// The low-privilege account is a real editor of the hosting site, so it can read the page. That makes its
// refusal a decision about administering the server, and not about being unable to reach the screen.
//
// Fully self-contained: creates its own site, the accounts and the placed component in before(); restores
// the root account and tears everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles, addNode } from '@jahia/cypress'

/** What the screen did with a submitted save: was a flow served at all, and did it acknowledge a save. */
interface SubmitOutcome {
    served: boolean
    saved: boolean
}

describe('Administration properties - write scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'admPropScope' + uniq

    const serverAdmin = 'admpropserver' + uniq // administers the server
    const lowPriv = 'admproplow' + uniq // edits the hosting site, administers nothing

    const placed = 'placedAdminProperties' + uniq
    const area = `/sites/${site}/home/pagecontent`
    const componentUrl = `/cms/render/default/en${area}/${placed}.html.ajax`

    // Captured before anything is driven and put back in after(), so a failing run cannot leave the
    // instance's root account rewritten.
    let originalEmail = ''

    const graphql = (query: string, variables: Record<string, unknown> = {}) =>
        cy
            .request({ method: 'POST', url: '/modules/graphql', body: { query, variables } })
            .then((r) => r.body?.data)

    const rootEmail = () =>
        graphql(`{ jcr { nodeByPath(path: "/users/root") { property(name: "j:email") { value } } } }`).then(
            (data) => (data?.jcr?.nodeByPath?.property?.value as string) ?? '',
        )

    const setRootEmail = (value: string) =>
        graphql(
            `mutation setRootEmail($value: String!) {
                jcr { mutateNode(pathOrId: "/users/root") { mutateProperty(name: "j:email") { setValue(value: $value) } } }
            }`,
            { value },
        )

    // Render the placed component as the given user, then submit its save transition with the supplied
    // email. Reports whether a flow was served at all and whether the screen acknowledged a save, so a
    // refused render and a refused save are told apart.
    const submitEmail = (user: string, email: string): Cypress.Chainable<SubmitOutcome> => {
        cy.login(user, 'password')
        return cy.request({ url: componentUrl, qs: { ec: uniq }, failOnStatusCode: false }).then((render) => {
            const body = typeof render.body === 'string' ? render.body : ''
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
    }

    before(() => {
        cy.login()
        createSite(site, { languages: 'en', templateSet: 'templates-system', serverName: 'localhost', locale: 'en' })

        createUser(serverAdmin, 'password')
        createUser(lowPriv, 'password')

        grantRoles('/', ['server-administrator'], serverAdmin, 'USER')
        // both accounts must be able to read the hosting page, so a refusal is never just an unreadable node
        grantRoles(`/sites/${site}`, ['editor'], serverAdmin, 'USER')
        grantRoles(`/sites/${site}`, ['editor'], lowPriv, 'USER')

        addNode({ parentPathOrId: `/sites/${site}/home`, primaryNodeType: 'jnt:contentList', name: 'pagecontent' })
        addNode({ parentPathOrId: area, primaryNodeType: 'jnt:serverSettingsAdminProperties', name: placed })

        rootEmail().then((value) => {
            originalEmail = value
        })
    })

    after(() => {
        cy.login()
        setRootEmail(originalEmail)
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
        cy.login()
        rootEmail().should('eq', email)
    })

    it('does not let a caller that administers nothing rewrite the root account', () => {
        const email = `admprop-attempt-${uniq}@jahia.invalid`
        submitEmail(lowPriv, email)
        cy.login()
        // whether the render was refused or the save was, the account must be untouched
        rootEmail().should('not.eq', email)
    })
})
