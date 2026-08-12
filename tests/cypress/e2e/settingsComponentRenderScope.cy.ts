// Render scope of the server settings components. A settings component renders from the settings template
// that declares its access rule, for a caller who holds that rule on the resource the request is made
// against. This spec asserts both halves: the flow of a component placed in an ordinary content area is
// served to no caller, and the flow of the same screen reached through its administration route is served
// to the administrators the template's own requirement names — including a role that names that requirement
// directly rather than through an ancestor permission.
//
// Non-vacuity: the negative assertions and the positive control go through the same detector and the same
// request shape, so a fixture that renders nothing cannot produce a false green. The site-administrator case
// is the sharper negative: that account is a real administrator of the hosting site and can read the page,
// so its refusal isolates the requirement to server administration rather than to "being logged in" or
// "being some kind of administrator". The screen-scoped role asserts its own grants through hasPermission
// before rendering anything, so that test measures the render condition and not a mis-built fixture.
//
// Fully self-contained: creates its own site, the accounts, the screen-scoped role and the placed component
// in before(); tears everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles, addNode, deleteNode } from '@jahia/cypress'

describe('Server settings components - render scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'srvRenderScope' + uniq

    const serverAdmin = 'srvscopeserver' + uniq // server administration, granted at the repository root
    const scopedAdmin = 'srvscopescoped' + uniq // administers one screen of the server
    const siteAdmin = 'srvscopesite' + uniq // administers the hosting site only
    const lowPriv = 'srvscopelow' + uniq // ordinary account, administers nothing

    // A server-administration role that names the cache screen's own permission directly, alongside what any
    // server administrator needs to reach the administration route. It deliberately does NOT name the ancestor
    // permission that aggregates the per-screen ones, which is what makes it the case a per-screen requirement
    // has to keep working for.
    const scopedRole = 'srvscopecacheonly' + uniq
    const scopedRolePermissions = ['administrationAccess', 'adminCache', 'repository-permissions', 'publish']

    const placed = 'placedCacheManagement' + uniq
    const area = `/sites/${site}/home/pagecontent`
    // the page that hosts it — this is the URL that gets rendered
    const pageUrl = `/cms/render/default/en/sites/${site}/home.html`
    // the same screen reached through the administration route that declares its requirement
    const settingsUrl = '/cms/adminframe/default/en/settings.cacheManagement.html'

    before(() => {
        cy.login()
        createSite(site, { languages: 'en', templateSet: 'templates-system', serverName: 'localhost', locale: 'en' })

        createUser(serverAdmin, 'password')
        createUser(scopedAdmin, 'password')
        createUser(siteAdmin, 'password')
        createUser(lowPriv, 'password')

        addNode({
            parentPathOrId: '/roles',
            primaryNodeType: 'jnt:role',
            name: scopedRole,
            properties: [
                { name: 'j:roleGroup', value: 'server-role' },
                { name: 'j:privilegedAccess', value: 'true' },
                { name: 'j:permissionNames', values: scopedRolePermissions },
            ],
        })

        grantRoles('/', ['server-administrator'], serverAdmin, 'USER')
        grantRoles('/', [scopedRole], scopedAdmin, 'USER')
        grantRoles(`/sites/${site}`, ['site-administrator'], siteAdmin, 'USER')
        grantRoles(`/sites/${site}`, ['editor'], lowPriv, 'USER')

        // the server administrator must also be able to read the hosting site, so the off-route case
        // measures the component and not the site's read ACL
        grantRoles(`/sites/${site}`, ['editor'], serverAdmin, 'USER')

        addNode({ parentPathOrId: `/sites/${site}/home`, primaryNodeType: 'jnt:contentList', name: 'pagecontent' })
        addNode({ parentPathOrId: area, primaryNodeType: 'jnt:serverSettingsCacheManagement', name: placed })
    })

    after(() => {
        cy.login()
        deleteUser(serverAdmin)
        deleteUser(scopedAdmin)
        deleteUser(siteAdmin)
        deleteUser(lowPriv)
        deleteNode(`/roles/${scopedRole}`)
        deleteSite(site)
    })

    // Render a URL as whoever is logged in and report how many flow execution keys were served. Without one
    // there is no flow to drive.
    const flowsServed = (user: string, url: string) => {
        cy.login(user, 'password')
        return cy
            .request({ url, failOnStatusCode: false, qs: { ec: uniq + Math.floor(Math.random() * 1e6) } })
            .then((res) => {
                const body = typeof res.body === 'string' ? res.body : ''
                return { status: res.status, served: (body.match(/webflowexecution/g) || []).length }
            })
    }

    const holdsPermission = (path: string, permission: string) =>
        cy
            .request({
                method: 'POST',
                url: '/modules/graphql',
                headers: { Origin: Cypress.config().baseUrl as string },
                body: {
                    query: `{jcr(workspace:EDIT){nodeByPath(path:"${path}"){hasPermission(permissionName:"${permission}")}}}`,
                },
            })
            .then((res) => res.body?.data?.jcr?.nodeByPath?.hasPermission as boolean)

    it('serves the screen on its administration route to a server administrator (positive control)', () => {
        flowsServed(serverAdmin, settingsUrl).then(({ served }) => {
            expect(
                served,
                'the server administrator must be served the flow on the administration route',
            ).to.be.greaterThan(0)
        })
    })

    it('serves the screen on its administration route to a role naming that screen only', () => {
        cy.login(scopedAdmin, 'password')
        holdsPermission('/settings', 'adminCache').then((held) => {
            expect(held, 'the fixture role must grant the cache screen its own permission').to.be.true
        })
        holdsPermission('/settings', 'admin').then((held) => {
            expect(held, 'the fixture role must not grant the ancestor permission').to.be.false
        })
        flowsServed(scopedAdmin, settingsUrl).then(({ served }) => {
            expect(served, 'a role naming the screen must be served that screen').to.be.greaterThan(0)
        })
    })

    it('serves the placed component to no server administrator', () => {
        flowsServed(serverAdmin, pageUrl).then(({ status, served }) => {
            expect(status, 'the server administrator must be able to read the hosting page').to.eq(200)
            expect(served, 'no flow may be served from an ordinary content area').to.eq(0)
        })
    })

    it('serves the placed component to no administrator of the hosting site', () => {
        flowsServed(siteAdmin, pageUrl).then(({ status, served }) => {
            expect(status, 'the site administrator must be able to read the hosting page').to.eq(200)
            expect(served, 'no flow may be served from an ordinary content area').to.eq(0)
        })
    })

    it('serves the placed component to no caller that administers nothing', () => {
        flowsServed(lowPriv, pageUrl).then(({ status, served }) => {
            expect(status, 'the low-privilege account must be able to read the hosting page').to.eq(200)
            expect(served, 'no flow may be served from an ordinary content area').to.eq(0)
        })
    })
})
