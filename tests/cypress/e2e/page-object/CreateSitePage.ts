import { BasePage } from '@jahia/cypress'
import IframeOptions = Cypress.IframeOptions
import { ProjectsPage } from './ProjectsPage'
import { webProjectsFrame } from './webProjectsIframe'

export interface SiteDefinition {
    title: string
    siteKey: string
    serverName: string
    serverNameAliases: string
}

/**
 * The "create web project" wizard: details -> modules -> summary.
 *
 * Each step submits a POST inside the admin iframe, which swaps its document. So every interaction
 * re-resolves the iframe body through a retryable query chain instead of holding one — a held body
 * goes stale on the first step change and the next step's fields are never found.
 */
export class CreateSitePage extends BasePage {
    iFrameOptions: IframeOptions

    private type(fieldId: string, value: string) {
        webProjectsFrame().find(`#${fieldId}`).clear().type(value, { parseSpecialCharSequences: false })
    }

    fillDetails(site: SiteDefinition) {
        webProjectsFrame().find('#createSiteForm').should('be.visible')
        this.type('title', site.title)
        this.type('siteKey', site.siteKey)
        this.type('serverName', site.serverName)
        this.type('serverNameAliases', site.serverNameAliases)
        webProjectsFrame().find('#createSiteForm [name="_eventId_next"]').click()
        return this
    }

    /**
     * Accepts the module-selection step as-is: #templateSet is a hidden input already holding the
     * default template set, so the step is valid without touching it.
     */
    acceptDefaultModules() {
        webProjectsFrame().find('#formSelectModule').should('be.visible')
        webProjectsFrame().find('#templateSet').should('not.have.value', '')
        webProjectsFrame().find('#formSelectModule [name="_eventId_next"]').click()
        return this
    }

    /** The template sets are offered as cards, each titled with the name of its template set. */
    expectTemplateSetCard(id: string, name: string) {
        webProjectsFrame().find(`.bs-card[data-templateset-id="${id}"] .bs-card-title`).should('have.text', name)
        return this
    }

    expectModuleOption(list: 'selectedModules' | 'unselectedModules', id: string, name: string) {
        webProjectsFrame().find(`#${list} option[value="${id}"]`).should('have.text', `${name} (${id})`)
        return this
    }

    /** Picks a template set and one module, then moves on to the summary. */
    chooseTemplateSetAndModule(templateSetId: string, moduleId: string) {
        webProjectsFrame().find(`.bs-card[data-templateset-id="${templateSetId}"]`).click()
        webProjectsFrame().find('#templateSet').should('have.value', templateSetId)
        webProjectsFrame()
            .find(`#unselectedModules option[value="${moduleId}"]`)
            .then(($option) => {
                $option.prop('selected', true)
            })
        webProjectsFrame().find('button[onclick="manageSelectedModules.select()"]').click()
        webProjectsFrame().find(`#selectedModules option[value="${moduleId}"]`).should('exist')
        webProjectsFrame().find('#formSelectModule [name="_eventId_next"]').click()
        return this
    }

    /** The summary names the template set as `<name> (<id>)` and lists each chosen module by name. */
    expectSummary(templateSetId: string, templateSetName: string, moduleToken: string, moduleName: string) {
        webProjectsFrame().find('[name="_eventId_previous"]').should('be.visible')
        webProjectsFrame().should('contain.text', `${templateSetName} (${templateSetId})`)
        webProjectsFrame()
            .find('span.label')
            .filter((_, el) => el.textContent.includes(moduleToken))
            .should('have.length', 1)
            .invoke('text')
            .should('equal', moduleName)
        return this
    }

    /**
     * Every step carries a `_eventId_next` button, so waiting on that alone would re-click the
     * previous step's button while its document is still being replaced. `_eventId_previous` exists
     * only on the summary, which makes it the unambiguous marker that this step is the one on screen.
     */
    confirmSummary() {
        webProjectsFrame().find('[name="_eventId_previous"]').should('be.visible')
        webProjectsFrame().find('[name="_eventId_next"]').click()
        return new ProjectsPage()
    }

    /** The whole happy path of the wizard, from the details form to the projects list. */
    createSite(site: SiteDefinition) {
        return this.fillDetails(site).acceptDefaultModules().confirmSummary()
    }
}
