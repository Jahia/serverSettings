import { context, createUser, deleteUser, jfaker } from '@jahia/cypress'
import { ManageUsersPage } from './page-object/ManageUsersPage'

/**
 * Migrated from the legacy Selenium suite: ManageUsersTest.lockImportUsers
 * (Jahia/selenium ManageUsersTest.java:109-135). Tracking issue: Jahia/selenium#1604
 * — FT-027, FT-028. (The CSV-import portion of that legacy method is FT-029/030,
 * migrated separately into the Jahia/bulk-create-users repo.)
 */
describe('Manage Users - account lock / unlock', () => {
    const PASSWORD = 'test1234'
    const LOCK_USER = jfaker.internet.username()
    const LOCKED_ACCOUNT_ERROR_MESSAGE =
        'Your user account is currently locked out. Please contact the system administrator to reset it.'

    before(() => {
        createUser(LOCK_USER, PASSWORD)
    })

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        deleteUser(LOCK_USER)
    })

    it('should block login while the account is locked, with the locked-account message (FT-027)', () => {
        context.tag('user-management', 'account-lock', 'login', 'admin')

        // Lock the account
        ManageUsersPage.visit().openUser(LOCK_USER).setAccountLocked(true).submitUpdate()
        // Expect lock message during the log in
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

        // Unlock the account
        ManageUsersPage.visit().openUser(LOCK_USER).setAccountLocked(false).submitUpdate()
        // Expect successful login
        cy.login(LOCK_USER, PASSWORD)
    })
})
