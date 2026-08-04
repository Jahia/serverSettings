// Render scope of the server settings components. A component's access rule should travel with the
// component and hold on every render path, regardless of where the component is placed — not only on the
// settings template that normally hosts it. This spec renders one of these components through an ordinary
// resource and asserts that its web flow remains available only to a caller holding server administration,
// and in particular NOT to a site administrator, whose authority stops at one site.
//
// Non-vacuity: the negative assertions are paired with a POSITIVE CONTROL that goes through the exact
// same request shape and asserts the flow IS served to a server administrator, so a fixture that
// renders nothing cannot produce a false green. The site-administrator case doubles as a sharper
// control: that account is a real administrator of the hosting site and can read the page, so its
// refusal isolates the requirement to server administration rather than to "being logged in" or
// "being some kind of administrator".
//
// Fully self-contained: creates its own site, the accounts and the placed component in before();
// tears everything down in after().
import { createSite, deleteSite, createUser, deleteUser, grantRoles, addNode } from '@jahia/cypress'

describe('Server settings components - render scope', () => {
    const uniq = Date.now().toString(36)
    const site = 'srvRenderScope' + uniq

    const serverAdmin = 'srvscopeserver' + uniq // server administration, granted at the repository root
    const siteAdmin = 'srvscopesite' + uniq // administers the hosting site only
    const lowPriv = 'srvscopelow' + uniq // ordinary account, administers nothing

    const placed = 'placedCacheManagement' + uniq
    const area = `/sites/${site}/home/pagecontent`
    const pageUrl = `/cms/render/default/en/sites/${site}/home.html`

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
        // measures the component and not the site's read ACL
        grantRoles(`/sites/${site}`, ['editor'], serverAdmin, 'USER')

        addNode({ parentPathOrId: `/sites/${site}/home`, primaryNodeType: 'jnt:contentList', name: 'pagecontent' })
        addNode({ parentPathOrId: area, primaryNodeType: 'jnt:serverSettingsCacheManagement', name: placed })
    })

    after(() => {
        cy.login()
        deleteUser(serverAdmin)
        deleteUser(siteAdmin)
        deleteUser(lowPriv)
        deleteSite(site)
    })

    // Render the hosting page as whoever is logged in and report how many flow execution keys were
    // served. Without one there is no flow to drive.
    const flowsServed = (user: string) => {
        cy.login(user, 'password')
        return cy
            .request({ url: pageUrl, failOnStatusCode: false, qs: { ec: uniq + Math.floor(Math.random() * 1e6) } })
            .then((res) => {
                const body = typeof res.body === 'string' ? res.body : ''
                return { status: res.status, served: (body.match(/webflowexecution/g) || []).length }
            })
    }

    it('serves the flow of the placed component to a server administrator (positive control)', () => {
        flowsServed(serverAdmin).then(({ status, served }) => {
            expect(status, 'the server administrator must be able to read the hosting page').to.eq(200)
            expect(served, 'the server administrator must still be served the flow').to.be.greaterThan(0)
        })
    })

    it('does not serve the flow to an administrator of the hosting site only', () => {
        flowsServed(siteAdmin).then(({ status, served }) => {
            expect(status, 'the site administrator must be able to read the hosting page').to.eq(200)
            expect(served, 'a site administrator must not be served a server administration flow').to.eq(0)
        })
    })

    it('does not serve the flow to a caller that administers nothing', () => {
        flowsServed(lowPriv).then(({ status, served }) => {
            expect(status, 'the low-privilege account must be able to read the hosting page').to.eq(200)
            expect(served, 'no flow may be served to a caller that administers nothing').to.eq(0)
        })
    })
})
