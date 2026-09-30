import { context, createUser, deleteUser, jfaker } from '@jahia/cypress'
import { ManageUsersPage } from './page-object/ManageUsersPage'

/**
 * Migrated from the legacy Selenium suite: ManageUsersTest.verifyDeletion
 * (Jahia/selenium ManageUsersTest.java:156-187). Tracking issue: Jahia/selenium#1604
 * — FT-022, FT-023.
 */
describe('Manage Users - bulk removal', () => {
    const PASSWORD = 'test1234'
    const usernames = Array.from({ length: 4 }, () => jfaker.internet.username());

    before(() => {
        usernames.forEach((username) => createUser(username, PASSWORD))
    })

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        // Defensive: if the bulk-delete test itself failed partway, these may already be gone.
        usernames.forEach((username) => {
            deleteUser(username)
        })
    })

    it('should show a confirmation screen listing the selected users before removal (FT-022)', () => {
        context.tag('user-management', 'delete', 'bulk', 'confirmation', 'admin')
        // Leave the confirmation unconfirmed here; FT-023 below performs the actual removal.
        ManageUsersPage.visit().selectUsersForRemoval(usernames).submitBulkRemove().verifyBulkConfirmationScreen(usernames)
    })

    it('should delete every selected user on confirmation, with a success message per user (FT-023)', () => {
        context.tag('user-management', 'delete', 'bulk', 'admin')
        const page = ManageUsersPage.visit().selectUsersForRemoval(usernames).submitBulkRemove()
        page.confirmBulkRemove().verifyBulkRemovalSuccess(usernames)
        // Ensure none of usernames remain
        usernames.forEach((username) => {page.search(username).verifyUserNotListed(username)})
    })
})
