import { context, createSite, deleteSite, jfaker } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'

/**
 * The edit form of a web project asks for confirmation before it saves a new server name, and saves
 * an unchanged one without asking. A server name may hold an apostrophe, so each case runs on a
 * server name holding one, beside a plain server name. Each test owns its site.
 */
describe('Web project server-name change confirmation', () => {
    context.tag('site-management', 'admin', 'server-name')

    const kinds = ['plain', 'apostrophe'] as const
    type Kind = typeof kinds[number]

    const serverNames: Record<Kind, (token: string, step: string) => string> = {
        plain: (token, step) => `www.${step}-plain-${token}.example.com`,
        apostrophe: (token, step) => `www.o'${step}-${token}.example.com`,
    }

    let siteKey: string
    let token: string

    beforeEach(function () {
        // Unique per test so no two tests, or two runs on the same instance, share a site or a server name.
        token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
        siteKey = `serverNameChange${token}`
    })

    afterEach(function () {
        deleteSite(siteKey)
    })

    function givenSite(kind: Kind) {
        const serverName = serverNames[kind](token, 'first')
        createSite(siteKey, { languages: 'en', templateSet: 'templates-system', serverName, locale: 'en' })
        return serverName
    }

    kinds.forEach((kind) => {
        it(`saves an unchanged ${kind} server name without asking for confirmation`, function () {
            context.tag('edit', kind)
            const serverName = givenSite(kind)
            cy.login()
            ProjectsPage.visit()
                .openDetailedView(siteKey)
                .expectServerName(serverName)
                .save()
                .expectNoConfirmation()
                .expectSaveSuccess()
        })

        it(`asks for confirmation before saving a new ${kind} server name`, function () {
            context.tag('edit', 'confirmation', kind)
            givenSite(kind)
            const nextServerName = serverNames[kind](token, 'next')
            cy.login()
            ProjectsPage.visit()
                .openDetailedView(siteKey)
                .setServerName(nextServerName)
                .save()
                .expectServerNameChangeConfirmed()
                .expectSaveSuccess()

            ProjectsPage.visit().openDetailedView(siteKey).expectServerName(nextServerName)
        })
    })
})
