import { deleteNodeProperty, setNodeProperty } from '@jahia/cypress'

/**
 * The settings frame writes the description of the settings tree and the keywords of its ancestors
 * into the metadata of its page head. Each value is read back from the served head and compared with
 * what was stored, so quotes, angle brackets, an ampersand and accents reach the head as typed.
 *
 * The frame is requested with basic authentication and no session, the way this module's template
 * serves it.
 */
const DESCRIPTION = 'Server "settings" <b>description</b> & café'
const KEYWORD = 'Keyword "one" <i>tag</i> & été'
const ROUTE = '/cms/adminframe/default/en/settings.aboutJahia.html'

describe('Settings frame, head metadata', () => {
    let probe = 0

    before(() => {
        cy.login()
        setNodeProperty('/settings', 'jcr:description', DESCRIPTION, 'en')
        setNodeProperty('/', 'j:keywords', [KEYWORD], 'en')
    })

    after(() => {
        cy.login()
        deleteNodeProperty('/settings', 'jcr:description', 'en')
        deleteNodeProperty('/', 'j:keywords', 'en')
    })

    /** The content of each meta element of the given name, in the head the settings frame serves. */
    const metaContent = (name: string): Cypress.Chainable<string[]> => {
        cy.clearCookies()
        return cy
            .request({
                url: ROUTE,
                qs: { ec: `head-${Date.now()}-${probe++}` },
                auth: { username: 'root', password: Cypress.env('SUPER_USER_PASSWORD') },
            })
            .then((res) => {
                expect(res.status, 'the settings frame must be served').to.eq(200)
                expect(res.body, 'the frame must render through this module').to.contain('admin-server-settings.css')
                const doc = new DOMParser().parseFromString(res.body, 'text/html')
                return Array.from(doc.head.querySelectorAll(`meta[name="${name}"]`)).map((meta) =>
                    meta.getAttribute('content'),
                )
            })
    }

    it('shows the description as stored', () => {
        metaContent('description').then((contents) => {
            expect(contents).to.deep.eq([DESCRIPTION])
        })
    })

    it('shows the keywords as stored', () => {
        metaContent('keywords').then((contents) => {
            expect(contents).to.deep.eq([KEYWORD])
        })
    })
})
