import { context, deleteSite, jfaker } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'
import { SiteDefinition } from './page-object/CreateSitePage'

/**
 * The edit form of a web project asks for confirmation before it saves a new server name, and saves
 * an unchanged one without asking. A server name may hold an apostrophe, so each case runs on a
 * server name holding one, beside a plain server name.
 */
describe('Web project server-name change confirmation', () => {
    context.tag('site-management', 'admin', 'server-name')

    const kinds = ['plain', 'apostrophe'] as const
    type Kind = typeof kinds[number]

    const sites = {} as Record<Kind, SiteDefinition>
    const nextServerNames = {} as Record<Kind, string>

    before(function () {
        // Unique per run so two runs against the same instance cannot collide on the server names.
        const token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
        const serverNames: Record<Kind, (step: string) => string> = {
            plain: (step) => `www.${step}-plain-${token}.example.com`,
            apostrophe: (step) => `www.o'${step}-${token}.example.com`,
        }

        cy.login()
        kinds.forEach((kind) => {
            sites[kind] = {
                title: `Server Name Change ${kind} ${token}`,
                siteKey: `serverNameChange${kind}${token}`,
                serverName: serverNames[kind]('first'),
                serverNameAliases: `alias-${kind}-${token}.example.com`,
            }
            nextServerNames[kind] = serverNames[kind]('next')
            ProjectsPage.visit().createSite().createSite(sites[kind]).expectSiteListed(sites[kind].title)
        })
    })

    after(function () {
        kinds.forEach((kind) => deleteSite(sites[kind].siteKey))
    })

    kinds.forEach((kind) => {
        it(`saves an unchanged ${kind} server name without asking for confirmation`, function () {
            context.tag('edit', kind)
            cy.login()
            ProjectsPage.visit()
                .openDetailedView(sites[kind].siteKey)
                .expectServerName(sites[kind].serverName)
                .save()
                .expectNoConfirmation()
                .expectSaveSuccess()
        })

        it(`asks for confirmation before saving a new ${kind} server name`, function () {
            context.tag('edit', 'confirmation', kind)
            cy.login()
            ProjectsPage.visit()
                .openDetailedView(sites[kind].siteKey)
                .setServerName(nextServerNames[kind])
                .save()
                .expectServerNameChangeConfirmed()
                .expectSaveSuccess()

            ProjectsPage.visit().openDetailedView(sites[kind].siteKey).expectServerName(nextServerNames[kind])
        })
    })
})
