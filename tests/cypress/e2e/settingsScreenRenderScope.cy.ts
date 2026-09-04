// Render scope of the system information and About screens. TWO DIFFERENT RULES govern them, and this
// spec keeps them apart, because they refuse for different reasons and are therefore falsified by
// different assertions.
//
// THE SYSTEM INFORMATION SCREEN — the permission rule, which is what this spec was written for. The
// screen states the permission it requires next to its own default view, so the requirement travels with
// the screen and holds on every render path, not only the settings template that normally hosts it. It is
// placed in an ordinary page area — a render path that does not go through that template — and asserted
// to be served only to a caller holding server administration.
//
// THE ABOUT SCREEN — the placement rule, which now decides before any permission is consulted.
// `serverSettings-ee` ships a Spring WebFlow view for `jnt:serverSettingsAboutJahia` while this module
// ships the JSP, which makes the TYPE webflow-backed; core's `TemplateOnlyComponentFilter` renders a
// webflow-backed `jmix:studioOnly` component only from inside `/modules/<module>/<version>/templates/...`
// and serves an empty body anywhere else. Being webflow-backed is a property of the type and not of the
// view a given render resolved, so the rule holds even on a render that resolves this module's JSP.
//
// WHAT THIS SPEC NO LONGER COVERS, and why that is not a gap to close here. The placement rule is
// caller-independent, so outside a module's template definitions the About screen is served to nobody and
// its own `requirePermissions` cannot make a difference there. Inside them, the only route to the screen
// is `/cms/adminframe/**`, whose `adminmode` edit configuration already requires `administrationAccess` at
// the repository root — the same permission the screen declares. No render path can therefore separate
// the screen's own requirement from the frame's, and the assertions below deliberately do not claim to:
// the two refusals on that route assert that a caller who does not administer the server cannot reach the
// screen, which is the outcome owed, and not that the component's own property is what turned them away.
// The property stays where #234 put it as defence in depth, one layer behind a rule that happens to
// subsume it for this screen; it is simply no longer observable from outside, and a spec claiming to
// observe it would be claiming more than it can see.
//
// Non-vacuity: every negative assertion is paired with a POSITIVE CONTROL that goes through the exact
// same request shape and asserts the screen IS served to a server administrator. Without it, a fixture
// that renders nothing at all would produce a false green — the screen would be absent for the boring
// reason that it was never reachable. The About screen's page-area refusal is the one negative with no
// control on its own path, since no caller is served there, so two other facts carry it: that render
// asserts 200, and a missing or unreadable placed node answers 404 there, so the status alone proves the
// node resolved; and the route positive control proves this instance's About view emits the marker for
// that same account. Marker on the route, nothing in the page area, same type and same caller.
//
// The site administrator is the sharper of the two refusals: that account really does administer the
// hosting site, so its refusal isolates the requirement to server administration rather than to "being
// logged in" or "being some kind of administrator". It holds `site-admin`, which is a different
// permission branch from the `admin` these two screens require.
//
// What a refusal LOOKS like differs by path, and the assertions differ with it. A page-area render is the
// screen's own fragment, so a refusal there is an empty body, which is stronger than "the marker is
// missing". The administration route serves a whole settings frame, so a refusal there is asserted as the
// route answering 403 and the screen's own marker being absent from the body — the status so that the
// absence is a decision and not an accident, the marker because that is the requirement.
//
// THE MEMORY SCREEN — the placement rule again, and this module is what makes it apply. The flow for
// `jnt:serverSettingsManageMemory` ships here, so the type is webflow-backed wherever this module is, and
// the case below needs no other module installed. The screen states its own permission requirement the way
// the system information screen does, and for the same reason. That requirement is not separately
// observable either: the placement rule refuses the page area to every caller, before a permission could
// tell two of them apart. So the assertion below claims only the outcome owed, which is that the screen and
// the operations its flow drives are served to nobody in an ordinary page area.
//
// PRECONDITION for the About screen's page-area case: `serverSettings-ee` must be installed, because it
// is the module that makes the type webflow-backed. Every CI lane for this module runs an EE
// distribution, so it holds there. On a community-only instance no module ships the flow, the placement
// rule does not fire, and that one test fails for a reason that has nothing to do with this module.
//
// Fully self-contained: creates its own site, the accounts and the placed screens in before(); tears
// everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles, addNode } from '@jahia/cypress'

/** A screen under test, and a marker only that screen's own view can emit. */
interface Screen {
    nodeType: string
    /** Present in the served output; nothing else on this instance emits it. */
    marker: string
}

// Not webflow-backed by any module, so placement leaves it alone and its permission is what decides.
const systemInfo: Screen = {
    nodeType: 'jnt:serverSettingsSystemInfos',
    // the screen lists the JVM's system properties, and every JVM defines java.vendor
    marker: 'java.vendor',
}

// Webflow-backed by this module's own flow, so placement decides on every instance carrying the module.
// It carries no marker, because it is only rendered in the page area, where a refusal is an empty body.
const manageMemory: Pick<Screen, 'nodeType'> = {
    nodeType: 'jnt:serverSettingsManageMemory',
}

// Webflow-backed through `serverSettings-ee`, so placement decides first and the permission only after.
const about: Screen = {
    nodeType: 'jnt:serverSettingsAboutJahia',
    // the licence pane of the About screen
    marker: 'id="jahiaLicense"',
}

/** Where the About screen is reached. Inside the module's template definitions, so placement allows it. */
const ABOUT_ROUTE = '/cms/adminframe/default/en/settings.aboutJahia.html'

describe('Server settings screens - render scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'srvScreenScope' + uniq

    const serverAdmin = 'srvscreenserver' + uniq // administers the server, granted at the repository root
    const siteAdmin = 'srvscreensite' + uniq // administers the hosting site only
    const lowPriv = 'srvscreenlow' + uniq // edits the hosting site, administers nothing

    const area = `/sites/${site}/home/pagecontent`
    const placedName = (screen: Pick<Screen, 'nodeType'>) => screen.nodeType.replace('jnt:', 'placed') + uniq

    // Every render gets its own cache-buster: a repeated one would let the fragment cache answer, and a
    // fragment cached for another caller reads exactly like a decision this spec never made.
    let probe = 0
    const ec = () => `${uniq}-${probe++}`

    /** Render one placed screen in the ordinary page area, as the given caller. */
    const fragment = (user: string, screen: Pick<Screen, 'nodeType'>) => {
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

    /** What the administration route did with a caller: the status it answered, and the body it served. */
    interface RouteOutcome {
        status: number
        body: string
    }

    /** Reach the About screen through its administration route, as the given caller. */
    const adminRoute = (user: string): Cypress.Chainable<RouteOutcome> => {
        cy.login(user, 'password')
        return cy
            .request({ url: ABOUT_ROUTE, qs: { ec: ec() }, failOnStatusCode: false })
            .then((res) => ({ status: res.status, body: typeof res.body === 'string' ? res.body : '' }))
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
        ;[systemInfo, about, manageMemory].forEach((screen) => {
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

    describe('the system information screen, placed in an ordinary page area', () => {
        it('is served to a server administrator (positive control)', () => {
            fragment(serverAdmin, systemInfo).then((body) => {
                expect(body, 'the server administrator must still be served the screen').to.contain(systemInfo.marker)
            })
        })

        it('is not served to an administrator of the hosting site only', () => {
            fragment(siteAdmin, systemInfo).then((body) => {
                expect(body.trim(), 'a site administrator must not be served a server settings screen').to.eq('')
            })
        })

        it('is not served to a caller that administers nothing', () => {
            fragment(lowPriv, systemInfo).then((body) => {
                expect(body.trim(), 'no screen may be served to a caller that administers nothing').to.eq('')
            })
        })
    })

    describe('the About screen, on its administration route', () => {
        // Each refusal is asserted twice over: the route turned the caller away, and the screen's marker is
        // nowhere in what came back. The status says the absence is a decision rather than an accident; the
        // marker is the requirement, and it is what would still have to hold if the route ever answered a
        // refusal some other way. The 403 comes from the `adminmode` edit configuration, which requires
        // `administrationAccess` at the repository root for every URL under this route — so this pair
        // asserts that a caller who does not administer the server cannot reach the screen, and not which
        // of the layers requiring that permission is the one that said no. See the note in the header.
        const refused = (user: string, why: string) =>
            adminRoute(user).then(({ status, body }) => {
                expect(status, `the route must turn ${user} away`).to.eq(403)
                expect(body, why).to.not.contain(about.marker)
            })

        it('is served to a server administrator (positive control)', () => {
            adminRoute(serverAdmin).then(({ status, body }) => {
                expect(status, 'the server administrator must be served the route').to.eq(200)
                expect(body, 'the server administrator must still be served the screen').to.contain(about.marker)
            })
        })

        it('is not served to an administrator of the hosting site only', () => {
            refused(siteAdmin, 'a site administrator must not be served a server settings screen')
        })

        it('is not served to a caller that administers nothing', () => {
            refused(lowPriv, 'no screen may be served to a caller that administers nothing')
        })
    })

    describe('the About screen, placed in an ordinary page area', () => {
        // Placement, not permission: the caller here holds everything the screen asks for and is still
        // served nothing, which is what makes this an assertion about where the component may render.
        // Not vacuous, on two facts that need no control of their own on this path: `fragment` asserts 200,
        // and a placed node that went missing answers 404 here, so the status proves the node resolved;
        // and the route control above proves this account is served the marker elsewhere on this instance.
        // Requires `serverSettings-ee` to be installed — see the precondition note in the header.
        it('is served to nobody there, not even a server administrator', () => {
            fragment(serverAdmin, about).then((body) => {
                expect(body.trim(), 'a webflow-backed screen must not render outside a template').to.eq('')
            })
        })
    })

    describe('the memory screen, placed in an ordinary page area', () => {
        // Placement again, and the same two facts carry it that carry the About case. `fragment` asserts
        // 200, and a placed node that went missing answers 404 there, so the status proves the node
        // resolved. The caller holds everything the screen asks for, so a refusal here is about where the
        // component may render. The flow drives the JVM's thread and heap dumps, which is what makes the
        // route this screen is served on worth pinning.
        //
        // `TemplateOnlyComponentFilter` is what refuses here, and not the screen's own
        // `requirePermissions`. `serverAdmin` holds `adminManageMemory` at the repository root, so it
        // clears `TemplatePermissionCheckFilter` on either arm. The property is what states the
        // requirement on the component, and it decides on a render path that placement allows.
        it('is served to nobody there, not even a server administrator', () => {
            fragment(serverAdmin, manageMemory).then((body) => {
                expect(body.trim(), 'a webflow-backed screen must not render outside a template').to.eq('')
            })
        })
    })
})
