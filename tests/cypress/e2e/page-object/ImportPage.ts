import { BasePage } from '@jahia/cypress'
import { ProjectsPage } from './ProjectsPage'
import { SiteDefinition } from './CreateSitePage'
import { webProjectsFrame } from './webProjectsIframe'

export class ImportPage extends BasePage {
    /**
     * Asserts that the preview drew one row per archive entry, and that every entry name is
     * readable in its row.
     *
     * Rows are matched on the checkbox class rather than on any id, because this has to hold
     * whatever the rows are identified by — it is the liveness half of the two assertions that
     * follow, both of which a preview that rendered nothing would satisfy by default. The names
     * are read out of the rendered labels and compared here, rather than pushed into a
     * `:contains()` selector, because a name holding a quote cannot be written into one.
     */
    expectEntryNamesListed(entryNames: string[]) {
        webProjectsFrame()
            .find('input.importCheckbox')
            .should('have.length', entryNames.length)
            .then(($inputs) => {
                const rendered = $inputs.toArray().map((el) => el.closest('label')?.textContent ?? '')
                entryNames.forEach((name) => expect(rendered.join('\n')).to.include(name))
            })
        return this
    }

    /**
     * Asserts that nothing on the screen carries an attribute of this name.
     *
     * Entry names come from whoever built the archive, and the screen writes them into attribute
     * values. A name is only ever content, so an attribute the archive named can exist solely
     * because a value ended early and the rest of the name was parsed as markup. Reading the
     * attribute back through the browser therefore tests the parse rather than the served bytes,
     * which is the only place the difference shows.
     */
    expectNoAttributeNamed(attribute: string) {
        webProjectsFrame().find(`[${attribute}]`).should('not.exist')
        return this
    }

    /**
     * Asserts that each row carries a label whose `for` names a generated id, and a checkbox
     * bearing that same id.
     *
     * The ids are generated from the row's position, `importEntry0` upward, rather than taken
     * from the entry name. An entry name cannot serve as an id: two entries may share one, and a
     * name is free to hold characters that no id or selector accepts. A label keyed on the name
     * can therefore end up addressing another row's checkbox, or nothing at all.
     */
    expectRowLabelsBoundToGeneratedIds(rowCount: number) {
        for (let row = 0; row < rowCount; row++) {
            const id = `importEntry${row}`
            webProjectsFrame().find(`label[for="${id}"]`).should('exist')
            webProjectsFrame().find(`input#${id}.importCheckbox`).should('exist')
        }
        return this
    }

    /**
     * Asserts that the row reported a blocking validation result and drew its detail panel.
     *
     * Matched on the blocking class and on the panel's id prefix, neither of which depends on how
     * the panel is keyed, because this has to hold whatever the keying is. It is the liveness
     * guard for the two assertions that follow: a preview that drew no panel would satisfy both
     * of them by having nothing to read.
     */
    expectBlockingValidation() {
        webProjectsFrame().find('input.importCheckbox.importBlocking').should('exist')
        webProjectsFrame().find('[id^="validationErrorsDetails"]').should('exist')
        return this
    }

    /**
     * Asserts that the "show all" handler survived the node path it carries.
     *
     * That handler is a script inside an attribute, and the paths written into it come from the
     * archive. A path holding an apostrophe ends the attribute unless it was escaped for the
     * attribute as well as for the script, and the rest of the handler is then parsed as markup.
     * Reading the attribute back and requiring its closing statement is what tells the two apart,
     * because a truncated handler loses its tail.
     */
    expectShowAllHandlerIntact() {
        webProjectsFrame()
            .find('a[onclick*="alert("]')
            .should('have.length.at.least', 1)
            .each(($a) => {
                expect($a.attr('onclick')).to.match(/return false;$/)
            })
        return this
    }

    /**
     * Asserts that the constraints panel drew, and that a node path in it introduced no element.
     *
     * That panel lists node paths from the archive in element text, where an angle bracket needs
     * no attribute to break out of. Asking the browser whether an element by that name exists
     * reads its parse of the page rather than the bytes the server sent, which is the only place
     * the difference shows.
     */
    expectConstraintsPanelRendersPathsAsText(elementName: string) {
        webProjectsFrame().find('[id^="validationErrorsDetailsConstraints"]').should('exist')
        webProjectsFrame().find(elementName).should('not.exist')
        return this
    }

    /**
     * Asserts that the detail panels are keyed to the row rather than to the archive's site key.
     *
     * A site key is read out of the archive and may be empty or shared, so two rows can key their
     * panels alike and the toggle then opens another row's panel.
     */
    expectDetailPanelsKeyedToRow(rowIndex: number) {
        webProjectsFrame().find(`[id^="validationErrorsDetails"][id$="importEntry${rowIndex}"]`).should('exist')
        return this
    }

    /** The screen that lists what the archive contains, per site, before the import is processed. */
    expectImportFormFor(siteKey: string) {
        webProjectsFrame().find(`#${siteKey}siteKey`).should('be.visible')
        return this
    }

    expectNoError() {
        webProjectsFrame().find('.alert-danger').should('not.exist')
        return this
    }

    expectSiteKeyConflict() {
        webProjectsFrame().find('.alert-danger').should('contain', 'Site key is already used.')
        return this
    }

    expectServerNameConflict(conflictingName: string) {
        webProjectsFrame()
            .find('.alert-danger')
            .should('contain', `Server name is already used. Please choose another server name (${conflictingName}).`)
        return this
    }

    /**
     * Rewrites the conflicting identity of the site being imported. The fields are keyed by the site
     * key found *in the archive*, which is why the original key is needed alongside the new values.
     */
    correctSite(archivedSiteKey: string, site: SiteDefinition) {
        const type = (suffix: string, value: string) =>
            webProjectsFrame()
                .find(`#${archivedSiteKey}${suffix}`)
                .clear()
                .type(value, { parseSpecialCharSequences: false })

        type('siteTitle', site.title)
        type('siteKey', site.siteKey)
        type('siteServerName', site.serverName)
        type('siteServerNameAliases', site.serverNameAliases)
        return this
    }

    processImport() {
        webProjectsFrame().find('[name="_eventId_processImport"]').should('be.visible').click()
        return new ProjectsPage()
    }
}
