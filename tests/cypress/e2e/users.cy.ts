import { createUser, deleteUser } from '@jahia/cypress'
import { ManageUsersPage } from './page-object/ManageUsersPage'

describe('Manage Users - Create / Search / Edit / Delete Tests', () => {
    const PASSWORD = 'TestPass12&'
    const createdUsers: string[] = []
    const EXISTING_USER = 'existingTestUser'
    const SEARCH_USER = 'searchTestUser'
    const EDIT_USER = 'editTestUser'
    const DELETE_USER = 'deleteTestUser'
    const REMOVE_USER = 'removeTestUser'
    const EXPORT_USER = 'exportTestUser'

    before(() => {
        cy.login()
        createUser(EXISTING_USER, PASSWORD)
        createUser(SEARCH_USER, PASSWORD)
        createUser(EDIT_USER, PASSWORD)
        createUser(DELETE_USER, PASSWORD)
        createUser(REMOVE_USER, PASSWORD)
        createUser(EXPORT_USER, PASSWORD)
    })

    beforeEach(() => {
        cy.login()
    })

    after(() => {
        cy.login()
        ;[EXISTING_USER, SEARCH_USER, EDIT_USER, DELETE_USER, REMOVE_USER, EXPORT_USER, ...createdUsers].forEach(
            (user) => {
                deleteUser(user)
            },
        )
    })

    it('should create a user with all profile fields filled', () => {
        const username = 'fullUser01'
        createdUsers.push(username)

        const page = ManageUsersPage.visit()
        page.openCreateForm()
            .fillForm({
                username,
                firstName: 'John',
                lastName: 'Doe',
                email: 'john.doe@jahia.com',
                organization: 'Jahia',
                password: PASSWORD,
                passwordConfirm: PASSWORD,
            })
            .submitCreate()
            .verifyUserListed(username)
    })

    it('should create a user with allowed special characters in the username', () => {
        const username = 'user_-.@{}01'
        createdUsers.push(username)

        const page = ManageUsersPage.visit()
        page.openCreateForm()
            .fillForm({
                username,
                password: PASSWORD,
                passwordConfirm: PASSWORD,
            })
            .submitCreate()
            .verifyUserListed(username)
    })

    it('should reject a username with not allowed special characters', () => {
        const username = 'invalid#user!'

        const page = ManageUsersPage.visit()
        page.openCreateForm()
            .fillForm({
                username,
                password: PASSWORD,
                passwordConfirm: PASSWORD,
            })
            .submitCreate()
            .verifyErrorMessage("only characters (a..z, A..Z, 0..9, _, -, ., @, '{', '}') are valid for the user name.")
    })

    it('should reject when password confirmation does not match', () => {
        const username = 'mismatchUser01'

        const page = ManageUsersPage.visit()
        page.openCreateForm()
            .fillForm({
                username,
                password: PASSWORD,
                passwordConfirm: 'DifferentPass12&',
            })
            .submitCreate()
            .verifyErrorMessage('Password confirmation does not match. Please try again.')
    })

    it('should create a user with preferred language set to French', () => {
        const username = 'frenchUser01'
        createdUsers.push(username)

        const page = ManageUsersPage.visit()
        page.openCreateForm()
            .fillForm({
                username,
                password: PASSWORD,
                passwordConfirm: PASSWORD,
                preferredLanguage: 'fr',
            })
            .submitCreate()
            .verifyUserListed(username)
    })

    it('should reject a username that already exists', () => {
        const page = ManageUsersPage.visit()
        page.openCreateForm()
            .fillForm({
                username: EXISTING_USER,
                password: PASSWORD,
                passwordConfirm: PASSWORD,
            })
            .submitCreate()
            .verifyErrorMessage(`Username '${EXISTING_USER}' already exists`)
    })

    it('should search for a user and list it', () => {
        const page = ManageUsersPage.visit()
        page.search(SEARCH_USER).verifyUserListed(SEARCH_USER)
    })

    it('should delete a user so it no longer appears in the list', () => {
        const page = ManageUsersPage.visit()
        page.openExportOrRemove(DELETE_USER).deleteFromRemovePage()

        ManageUsersPage.visit().search(DELETE_USER).verifyUserNotListed(DELETE_USER)
    })

    it('should edit a user by adding an organization and updating', () => {
        const organization = 'Jahia'

        const page = ManageUsersPage.visit()
        page.openUser(EDIT_USER).fillForm({ organization }).submitUpdate()

        // Reopen the user and verify the organization persisted.
        ManageUsersPage.visit().openUser(EDIT_USER)
        page.iframe().find('#organization').should('have.value', organization)
    })

    it('should open Export or Remove, verify fields are disabled, then delete', () => {
        const page = ManageUsersPage.visit()
        page.openExportOrRemove(REMOVE_USER).verifyAllFieldsDisabled().deleteFromRemovePage()

        ManageUsersPage.visit().search(REMOVE_USER).verifyUserNotListed(REMOVE_USER)
    })

    it('should open Export or Remove, verify fields are disabled, then export', () => {
        const page = ManageUsersPage.visit()
        page.openExportOrRemove(EXPORT_USER).verifyAllFieldsDisabled().verifyExportLink(EXPORT_USER)
    })
})
