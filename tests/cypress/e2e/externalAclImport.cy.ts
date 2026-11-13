import { context, createUser, deleteSite, deleteUser } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'

/**
 * The "accept external ACLs" option of a legacy site import.
 *
 * The archive is a minimal Jahia 6.6 export whose only page grants a write role to a global user. The import screen
 * refuses it before it creates the site, so the archive does not need to hold content that the legacy import can apply.
 */
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
        deleteSite(FOREIGN_SITE.siteKey)
        deleteUser(FOREIGN_GRANTEE)
    })

    it('holds back an archive that grants a role outside the site', function () {
        ProjectsPage.visit()
            .importFile(FOREIGN_ARCHIVE)
            .expectImportFormFor(FOREIGN_SITE.siteKey)
            .processRefusedImport()
            .expectExternalAclRefused(`u:${FOREIGN_GRANTEE}`)
            .expectImportFormFor(FOREIGN_SITE.siteKey)
    })
})
