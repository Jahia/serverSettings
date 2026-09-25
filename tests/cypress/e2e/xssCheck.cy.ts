import { context } from '@jahia/cypress'
import { ProjectsPage } from './page-object/ProjectsPage'

/**
 * The import preview lists one row per entry of an uploaded archive, labelled with that entry's
 * name. The name is written by whoever built the archive, so the screen has to render it as
 * content whatever characters it holds.
 *
 * The fixture carries two entry names, and the difference between them is the point:
 *
 *  - the first opens on U+201C, a typographic quote, which is an ordinary character everywhere in
 *    markup and can be rendered verbatim without consequence;
 *  - the second holds a straight double quote, which is what an attribute value ends on, followed
 *    by text shaped like an attribute of its own.
 *
 * A screen that writes the second name into an attribute therefore produces an element carrying a
 * `data-injected` attribute, which is read back below. Assert both rows, so a preview that failed
 * to render cannot satisfy the negative assertion by drawing nothing at all.
 */
const ENTRY_TYPOGRAPHIC_QUOTE = "“><img src=1 onerror=alert('Hello')>.png"
const ENTRY_STRAIGHT_QUOTE = 'probe" data-injected="yes.png'

describe('Import preview, for an archive whose entry names hold markup characters', () => {
    context.tag('site-management', 'admin', 'import')

    it('renders both entry names as text, and lets neither introduce an attribute', function () {
        cy.login()

        const importPage = ProjectsPage.visit().importFile('cypress/fixtures/testData/XSS.zip')

        importPage
            .expectEntryNamesListed([ENTRY_TYPOGRAPHIC_QUOTE, ENTRY_STRAIGHT_QUOTE])
            .expectNoAttributeNamed('data-injected')
            .expectRowLabelsBoundToGeneratedIds(2)
    })
})
