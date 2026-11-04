import { context, createSite, deleteSite, enableModule, jfaker } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'

/**
 * The Web projects screens show the name of each module and template set, as its own manifest
 * declares it. A name holding quotes, an ampersand, angle brackets, an apostrophe or accents is
 * displayed exactly as declared, in every screen of the flow: the module labels of a site, the module selection of a site, and the template-set cards,
 * the module selection and the summary of the create wizard.
 *
 * The module and the template set are manifest-only bundles built by the `buildModuleJar` task. They
 * carry different names, because modules that share a name are listed once.
 */
describe('Web project screens, for modules whose names hold special characters', () => {
    context.tag('site-management', 'admin', 'modules')

    const token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
    const siteKey = `moduleNames${token}`
    const moduleId = `module-names-${token}`
    const templateSetId = `template-set-names-${token}`
    const moduleName = `Labels "quoted" & <kept> l'été ${token}`
    const templateSetName = `Theme "quoted" & <kept> l'été ${token}`

    const install = (symbolicName: string, name: string, moduleType: 'module' | 'templatesSet') => {
        cy.task('buildModuleJar', { symbolicName, name, moduleType }).then((jar: string) => {
            cy.runProvisioningScript({
                script: {
                    fileContent: `- installBundle: "${symbolicName}.jar"\n  autoStart: true`,
                    type: 'application/yaml',
                },
                files: [{ fileName: `${symbolicName}.jar`, fileContent: jar, type: 'application/java-archive' }],
            })
        })
    }

    const uninstall = (symbolicName: string) => {
        cy.runProvisioningScript({
            script: { fileContent: `- uninstallBundle: "${symbolicName}/1.0.0"`, type: 'application/yaml' },
        })
    }

    before(function () {
        install(moduleId, moduleName, 'module')
        install(templateSetId, templateSetName, 'templatesSet')
        createSite(siteKey, {
            languages: 'en',
            templateSet: 'templates-system',
            serverName: `${siteKey}.example.com`,
            locale: 'en',
        })
        enableModule(moduleId, siteKey)
    })

    after(function () {
        deleteSite(siteKey)
        uninstall(moduleId)
        uninstall(templateSetId)
    })

    beforeEach(function () {
        cy.login()
    })

    it('shows the module labels of a site and its module selection as declared', function () {
        context.tag('edit')
        ProjectsPage.visit()
            .openDetailedView(siteKey)
            .expectModuleLabel(token, moduleName)
            .editModules()
            .expectModuleOption('selectedModules', moduleId, moduleName)
    })

    it('shows the template sets, the modules and the summary of the create wizard as declared', function () {
        context.tag('create')
        const newSiteKey = `moduleNamesWizard${token}`
        ProjectsPage.visit()
            .createSite()
            .fillDetails({
                title: newSiteKey,
                siteKey: newSiteKey,
                serverName: `${newSiteKey}.example.com`,
                serverNameAliases: `alias-${newSiteKey}.example.com`,
            })
            .expectTemplateSetCard(templateSetId, templateSetName)
            .expectModuleOption('unselectedModules', moduleId, moduleName)
            .chooseTemplateSetAndModule(templateSetId, moduleId)
            .expectSummary(templateSetId, templateSetName, token, moduleName)
    })
})
