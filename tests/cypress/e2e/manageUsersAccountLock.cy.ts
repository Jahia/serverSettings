import { context, createUser, deleteUser, jfaker } from '@jahia/cypress'
import { ManageUsersPage } from './page-object/ManageUsersPage'

/**
 * Migrated from the legacy Selenium suite: ManageUsersTest.lockImportUsers
 * (Jahia/selenium ManageUsersTest.java:109-135). Tracking issue: Jahia/selenium#1604
 * — FT-027, FT-028. (The CSV-import portion of that legacy method is FT-029/030,
 * migrated separately into the Jahia/bulk-create-users repo.)
 */
describe('Manage Users - account lock / unlock', () => {
    const PASSWORD = 'TestPass12&'
    const token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
    const LOCK_USER = `murLock${token}`
    // The legacy Selenium constant (Contents.LOCKED_ACCOUNT_ERROR_MESSAGE) is all-caps, but a live
    // run shows the rendered login-error text is sentence case - matching what's actually served,
    // not the legacy constant's casing.
    const LOCKED_ACCOUNT_ERROR_MESSAGE =
        'Your user account is currently locked out. Please contact the system administrator to reset it.'

    before(() => {
        cy.login()
        createUser(LOCK_USER, PASSWORD)
    })

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        cy.login()
        deleteUser(LOCK_USER)
    })

    it('should block login while the account is locked, with the locked-account message (FT-027)', () => {
        context.tag('user-management', 'account-lock', 'login', 'admin')
        ManageUsersPage.visit().openUser(LOCK_USER).setAccountLocked(true).submitUpdate()

        cy.request({
            method: 'POST',
            form: true,
            url: '/cms/login',
            body: { username: LOCK_USER, password: PASSWORD },
            failOnStatusCode: false,
        }).then((res) => {
            expect(res.status, 'a locked account must not be granted a session').to.not.eq(302)
            expect(res.body).to.contain(LOCKED_ACCOUNT_ERROR_MESSAGE)
        })
    })

    it('should restore login once the account is unlocked (FT-028)', () => {
        context.tag('user-management', 'account-unlock', 'login', 'admin')
        ManageUsersPage.visit().openUser(LOCK_USER).setAccountLocked(false).submitUpdate()

        cy.login(LOCK_USER, PASSWORD)
    })
})
