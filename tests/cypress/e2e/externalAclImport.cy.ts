import { context, createUser, deleteSite, deleteUser } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'

/**
 * The "accept external ACLs" option of a legacy site import.
 *
 * Each archive is a Jahia 6.6 export of one site whose only page declares one ACL entry. The local archive grants
 * a role to `site-administrators`, a group the site creation adds. The foreign archive grants a write role to a
 * global user, which the import screen refuses until the administrator ticks the option.
 */
const LOCAL_ARCHIVE = 'cypress/fixtures/testData/externalAclLocal.zip'
const LOCAL_SITE = { siteKey: 'externalAclLocal', title: 'External ACL Local' }
const FOREIGN_ARCHIVE = 'cypress/fixtures/testData/externalAclForeign.zip'
const FOREIGN_SITE = { siteKey: 'externalAclForeign', title: 'External ACL Foreign' }
const FOREIGN_GRANTEE = 'externalAclGrantee'

describe('Legacy site import, with the external ACLs it declares', () => {
    context.tag('site-management', 'admin', 'import')

    before(() => {
        createUser(FOREIGN_GRANTEE, 'password')
    })

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        deleteSite(LOCAL_SITE.siteKey)
        deleteSite(FOREIGN_SITE.siteKey)
        deleteUser(FOREIGN_GRANTEE)
    })

    it('imports an archive whose ACL stays within the site', function () {
        ProjectsPage.visit()
            .importFile(LOCAL_ARCHIVE)
            .expectImportFormFor(LOCAL_SITE.siteKey)
            .processImport()
            .expectSiteListed(LOCAL_SITE.title)
    })

    it('holds back an archive that grants a role outside the site', function () {
        ProjectsPage.visit()
            .importFile(FOREIGN_ARCHIVE)
            .expectImportFormFor(FOREIGN_SITE.siteKey)
            .processRefusedImport()
            .expectExternalAclRefused(`u:${FOREIGN_GRANTEE}`)
            .expectImportFormFor(FOREIGN_SITE.siteKey)
    })

    it('imports the same archive once the external ACLs are accepted', function () {
        ProjectsPage.visit()
            .importFile(FOREIGN_ARCHIVE)
            .expectImportFormFor(FOREIGN_SITE.siteKey)
            .acceptExternalAcl(FOREIGN_SITE.siteKey)
            .processImport()
            .expectSiteListed(FOREIGN_SITE.title)
    })
})
