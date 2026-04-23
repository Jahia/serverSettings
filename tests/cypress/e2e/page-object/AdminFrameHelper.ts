export class AdminFrameHelper {
    /**
     * Enters an administration iframe by resolving its live URL and visiting it directly.
     * This is the recommended @jahia/cypress IFrame.enter() pattern.
     */
    static enterFrameBySrcFragment(frameSrcFragment: string) {
        cy.location('href').then(href => {
            // The Jahia admin shell URL pattern is /jahia/administration/… and contains an iframe.
            // When we have already visited the frame directly, the path will not include /administration/.
            // In that case, skip the iframe lookup and continue interacting with the current page.
            if (!href.includes('/administration/')) {
                return
            }

            cy.get(`iframe[src*="${frameSrcFragment}"]`)
                .should(f => {
                    const fr = f[0] as HTMLIFrameElement
                    expect(fr.contentWindow?.location.href, 'frame href').not.equals('about:blank')
                    expect(fr.contentWindow?.document.readyState, 'frame readyState').equals('complete')
                    expect(fr.contentDocument?.body, 'frame body').not.be.empty
                })
                .then(f => {
                    const fr = f[0] as HTMLIFrameElement
                    cy.visit(fr.contentWindow!.location.href)
                })
        })
    }
}