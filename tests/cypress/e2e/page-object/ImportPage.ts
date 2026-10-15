import { BasePage } from '@jahia/cypress'
import IframeOptions = Cypress.IframeOptions

export class ImportPage extends BasePage {
    iFrameOptions: IframeOptions

    private within(fn: () => void) {
        cy.iframe('iframe[src*="webProjectSettings.html"]', this.iFrameOptions).within(fn)
    }

    /**
     * Asserts that the preview drew one row per archive entry, and that every entry name is
     * readable in its row.
     *
     * Rows are matched on the checkbox class rather than on any id, because this has to hold
     * whatever the rows are identified by. It is the liveness guard for the two assertions that
     * follow, both of which a preview that rendered nothing would satisfy by default. The names
     * are read out of the rendered labels and compared here, rather than pushed into a
     * `:contains()` selector, because a name holding a quote cannot be written into one.
     */
    expectEntryNamesListed(entryNames: string[]) {
        this.within(() => {
            cy.get('input.importCheckbox')
                .should('have.length', entryNames.length)
                .then(($inputs) => {
                    const rendered = $inputs.toArray().map((el) => el.closest('label')?.textContent ?? '')
                    entryNames.forEach((name) => expect(rendered.join('\n')).to.include(name))
                })
        })
    }

    /**
     * Asserts that nothing on the screen carries an attribute of this name.
     *
     * Entry names come from whoever built the archive, and the screen writes them into attribute
     * values. A name is only ever content, so an attribute the archive named can exist solely
     * because a value ended early and the rest of the name was parsed as markup. Reading the
     * attribute back through the browser therefore tests the parse rather than the served bytes.
     */
    expectNoAttributeNamed(attribute: string) {
        this.within(() => {
            cy.get(`[${attribute}]`).should('not.exist')
        })
    }

    /**
     * Asserts that each row carries a label whose `for` names a generated id, and a checkbox
     * bearing that same id.
     *
     * The ids are generated from the row's position, `importEntry0` upward, rather than taken
     * from the entry name. An entry name cannot serve as an id, because it is free to hold
     * characters that no id or selector accepts. A label keyed on such a name addresses nothing.
     */
    expectRowLabelsBoundToGeneratedIds(rowCount: number) {
        this.within(() => {
            for (let row = 0; row < rowCount; row++) {
                cy.get(`label[for="importEntry${row}"]`).should('exist')
                cy.get(`input#importEntry${row}.importCheckbox`).should('exist')
            }
        })
    }
}
