// Render scope of the system information and About screens. Each of these screens states the permission
// it requires next to its own default view, so the requirement travels with the screen and holds on every
// render path, not only on the settings template that normally hosts it. This spec places each screen in
// an ordinary page area — a render path that does not go through that template — and asserts the screen is
// served only to a caller holding server administration.
//
// Non-vacuity: every negative assertion is paired with a POSITIVE CONTROL that goes through the exact same
// request shape and asserts the screen IS served to a server administrator. Without it, a fixture that
// renders nothing at all would produce a false green — the screen would be absent for the boring reason
// that it was never reachable. The control asserts a marker that only the screen itself can emit, and the
// negatives assert an empty fragment, which is stronger than "the marker is missing".
//
// The site administrator is the sharper of the two refusals: that account really does administer the
// hosting site, so its refusal isolates the requirement to server administration rather than to "being
// logged in" or "being some kind of administrator". It holds `site-admin`, which is a different permission
// branch from the `admin` these two screens require.
//
// Each screen is requested as its own resource rather than through the surrounding page, so the assertion
// reads the fragment the requirement governs and does not depend on what else the page template renders.
//
// Fully self-contained: creates its own site, the accounts and the placed screens in before(); tears
// everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles, addNode } from '@jahia/cypress'

/** A screen under test, and a marker only that screen's own view can emit. */
interface Screen {
    label: string
    nodeType: string
    /** Present in the served fragment; nothing else on this instance emits it. */
    marker: string
}

const screens: Screen[] = [
    // the screen lists the JVM's system properties, and every JVM defines java.vendor
    { label: 'system information', nodeType: 'jnt:serverSettingsSystemInfos', marker: 'java.vendor' },
    // the licence pane of the About screen
    { label: 'About', nodeType: 'jnt:serverSettingsAboutJahia', marker: 'id="jahiaLicense"' },
]

describe('Server settings screens - render scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'srvScreenScope' + uniq

    const serverAdmin = 'srvscreenserver' + uniq // administers the server, granted at the repository root
    const siteAdmin = 'srvscreensite' + uniq // administers the hosting site only
    const lowPriv = 'srvscreenlow' + uniq // edits the hosting site, administers nothing

    const area = `/sites/${site}/home/pagecontent`
    const placedName = (screen: Screen) => screen.nodeType.replace('jnt:', 'placed') + uniq

    // Every render gets its own cache-buster: a repeated one would let the fragment cache answer, and a
    // fragment cached for another caller reads exactly like a decision this spec never made.
    let probe = 0
    const ec = () => `${uniq}-${probe++}`

    /** Render one placed screen as the given caller and report the fragment it was served. */
    const fragment = (user: string, screen: Screen) => {
        cy.login(user, 'password')
        return cy
            .request({
                url: `/cms/render/default/en${area}/${placedName(screen)}.html.ajax`,
                qs: { ec: ec() },
                failOnStatusCode: false,
            })
            .then((res) => {
                // every caller here can read the placed node, so a refusal is always an empty fragment and
                // never an unreadable node
                expect(res.status, `${user} must be able to read the placed screen`).to.eq(200)
                return typeof res.body === 'string' ? res.body : ''
            })
    }

    before(() => {
        cy.login()
        createSite(site, { languages: 'en', templateSet: 'templates-system', serverName: 'localhost', locale: 'en' })

        createUser(serverAdmin, 'password')
        createUser(siteAdmin, 'password')
        createUser(lowPriv, 'password')

        grantRoles('/', ['server-administrator'], serverAdmin, 'USER')
        grantRoles(`/sites/${site}`, ['site-administrator'], siteAdmin, 'USER')
        grantRoles(`/sites/${site}`, ['editor'], lowPriv, 'USER')

        // the server administrator must also be able to read the hosting site, so the positive control
        // measures the screen and not the site's read ACL
        grantRoles(`/sites/${site}`, ['editor'], serverAdmin, 'USER')

        addNode({ parentPathOrId: `/sites/${site}/home`, primaryNodeType: 'jnt:contentList', name: 'pagecontent' })
        screens.forEach((screen) => {
            addNode({ parentPathOrId: area, primaryNodeType: screen.nodeType, name: placedName(screen) })
        })
    })

    after(() => {
        cy.login()
        deleteUser(serverAdmin)
        deleteUser(siteAdmin)
        deleteUser(lowPriv)
        deleteSite(site)
    })

    screens.forEach((screen) => {
        describe(`the ${screen.label} screen`, () => {
            it('is served to a server administrator (positive control)', () => {
                fragment(serverAdmin, screen).then((body) => {
                    expect(body, 'the server administrator must still be served the screen').to.contain(screen.marker)
                })
            })

            it('is not served to an administrator of the hosting site only', () => {
                fragment(siteAdmin, screen).then((body) => {
                    expect(body.trim(), 'a site administrator must not be served a server settings screen').to.eq('')
                })
            })

            it('is not served to a caller that administers nothing', () => {
                fragment(lowPriv, screen).then((body) => {
                    expect(body.trim(), 'no screen may be served to a caller that administers nothing').to.eq('')
                })
            })
        })
    })
})
