import { context } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'
import { ImportPage } from './page-object/ImportPage'

/**
 * The import preview draws a detail panel for an archive the validator rejects, listing the node
 * paths behind each problem. Nothing else in this suite reaches that panel, because every other
 * fixture validates cleanly.
 *
 * The archive declares five nodes on a node type the instance does not carry, which makes the
 * result blocking and takes the path list past the three the "show all" link needs. One of those
 * names is spelled `node_x0027_quote`, which is how ISO9075 writes an apostrophe in an XML name:
 * the validator decodes it before recording the path, so a path holding a character an HTML
 * attribute ends on reaches that link.
 *
 * A sixth node declares `jnt:ace` and none of its three mandatory properties, which is what the
 * constraints validator reports. Its name decodes to `<probe>`, so the constraints panel receives
 * a path holding angle brackets, which are what matter where a value lands in element text.
 *
 * One assertion per test, each on its own upload: a single chain stops at its first failure, which
 * would leave the later properties unmeasured on a build that breaks an earlier one.
 */
const ARCHIVE = 'cypress/fixtures/testData/validationErrors.zip'

const previewRejectedArchive = (): ImportPage => ProjectsPage.visit().importFile(ARCHIVE).expectBlockingValidation()

describe('Import preview, for an archive the validator rejects', () => {
    context.tag('site-management', 'admin', 'import')

    beforeEach(() => {
        cy.login()
    })

    it('draws the detail panel', function () {
        previewRejectedArchive()
    })

    it('keeps the show-all handler whole', function () {
        previewRejectedArchive().expectShowAllHandlerIntact()
    })

    it('renders a constraint path as text', function () {
        previewRejectedArchive().expectConstraintsPanelRendersPathsAsText('probe')
    })

    it('keys the detail panels to the row', function () {
        previewRejectedArchive().expectDetailPanelsKeyedToRow(0)
    })
})
