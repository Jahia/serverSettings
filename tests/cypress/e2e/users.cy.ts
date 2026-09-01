import { context, createUser, deleteUser } from '@jahia/cypress'
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

    // Full initial profile for SEARCH_USER (FT-004: search must match on any of these fields)
    // and EDIT_USER (FT-001/002/003: the edit form must reflect and let us change every one of them).
    const SEARCH_PROFILE = {
        firstName: 'Searchy',
        lastName: 'Findable',
        email: 'searchy.findable@jahia.invalid',
        organization: 'JahiaSearchOrg',
    }
    const EDIT_PROFILE = {
        firstName: 'Original',
        lastName: 'Editable',
        email: 'original.editable@jahia.invalid',
        organization: 'JahiaEditOrg',
        preferredLanguage: 'en',
    }

    before(() => {
        cy.login()
        createUser(EXISTING_USER, PASSWORD)
        createUser(SEARCH_USER, PASSWORD, [
            { name: 'j:firstName', value: SEARCH_PROFILE.firstName },
            { name: 'j:lastName', value: SEARCH_PROFILE.lastName },
            { name: 'j:email', value: SEARCH_PROFILE.email },
            { name: 'j:organization', value: SEARCH_PROFILE.organization },
        ])
        createUser(EDIT_USER, PASSWORD, [
            { name: 'j:firstName', value: EDIT_PROFILE.firstName },
            { name: 'j:lastName', value: EDIT_PROFILE.lastName },
            { name: 'j:email', value: EDIT_PROFILE.email },
            { name: 'j:organization', value: EDIT_PROFILE.organization },
            { name: 'preferredLanguage', value: EDIT_PROFILE.preferredLanguage },
        ])
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
        // FT-018 (Jahia/selenium#1604): invalid characters in the username are rejected.
        context.tag('user-management', 'create', 'validation', 'username-format', 'admin')
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

    it('should reject mismatched password confirmation together with an invalid email address', () => {
        // FT-017 (Jahia/selenium#1604): both validation messages must appear from the one submit.
        context.tag('user-management', 'create', 'validation', 'password-mismatch', 'email-format', 'admin')
        const username = 'mismatchUser01'

        const page = ManageUsersPage.visit()
        page.openCreateForm()
            .fillForm({
                username,
                email: 'not-an-email',
                password: PASSWORD,
                passwordConfirm: 'DifferentPass12&',
            })
            .submitCreate()
            .verifyErrorMessage('Password confirmation does not match. Please try again.')
            .verifyErrorMessage('Please enter valid e-mail address.')
    })

    it('should reject creating a user with a blank username', () => {
        // FT-013 (Jahia/selenium#1604)
        context.tag('user-management', 'create', 'validation', 'admin')
        ManageUsersPage.visit()
            .openCreateForm()
            .fillForm({ username: '', password: PASSWORD, passwordConfirm: PASSWORD })
            .submitCreate()
            .verifyErrorMessage('Please specify a user name.')
    })

    it('should reject creating a user with no password or confirmation', () => {
        // FT-015 (Jahia/selenium#1604)
        context.tag('user-management', 'create', 'validation', 'password', 'admin')
        ManageUsersPage.visit()
            .openCreateForm()
            .fillForm({ username: 'noPasswordUser01', password: '', passwordConfirm: '' })
            .submitCreate()
            .verifyErrorMessage('Please specify a password.')
    })

    it('should reject creating a user with a password but no confirmation', () => {
        // FT-016 (Jahia/selenium#1604)
        context.tag('user-management', 'create', 'validation', 'password-confirmation', 'admin')
        ManageUsersPage.visit()
            .openCreateForm()
            .fillForm({ username: 'noConfirmUser01', password: PASSWORD, passwordConfirm: '' })
            .submitCreate()
            .verifyErrorMessage('Please specify a password.')
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
        // FT-014 (Jahia/selenium#1604)
        context.tag('user-management', 'create', 'validation', 'duplicate-username', 'admin')
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

    it('should match an unfiltered search on any identifying field, and never match Guest user', () => {
        // FT-004 (Jahia/selenium#1604): username, first/last name, organization and email all match;
        // the built-in Guest user must never appear.
        context.tag('user-management', 'search', 'admin')
        ;[
            SEARCH_USER,
            SEARCH_PROFILE.firstName,
            SEARCH_PROFILE.lastName,
            SEARCH_PROFILE.organization,
            SEARCH_PROFILE.email,
        ].forEach((term) => {
            ManageUsersPage.visit().search(term).verifyUserListed(SEARCH_USER).verifyUserNotListed('Guest user')
        })
    })

    it('should show "No users found." when a search matches nothing', () => {
        // FT-005 (Jahia/selenium#1604)
        context.tag('user-management', 'search', 'empty-result', 'admin')
        ManageUsersPage.visit().search('xxzztjwefn').verifyNoUsersFoundMessage()
    })

    it('should restore the default user listing when the search is cleared', () => {
        // FT-006 (Jahia/selenium#1604): baseline users reappear once the search string is emptied.
        context.tag('user-management', 'search', 'reset', 'admin')
        ManageUsersPage.visit().search('').verifyUserListed(EXISTING_USER).verifyUserListed(SEARCH_USER)
    })

    it('should delete a user', () => {
        // FT-021 (Jahia/selenium#1604): success message shown, and the user disappears from search.
        context.tag('user-management', 'delete', 'search', 'admin')
        ManageUsersPage.visit()
            .openExportOrRemove(DELETE_USER)
            .deleteFromRemovePage()
            .verifyBulkRemovalSuccess([DELETE_USER])

        ManageUsersPage.visit().search(DELETE_USER).verifyUserNotListed(DELETE_USER)
    })

    it("should show a user's persisted profile values when opening for edit", () => {
        // FT-001 (Jahia/selenium#1604)
        context.tag('user-management', 'edit', 'admin')
        ManageUsersPage.visit()
            .openUser(EDIT_USER)
            .verifyFieldValue('firstName', EDIT_PROFILE.firstName)
            .verifyFieldValue('lastName', EDIT_PROFILE.lastName)
            .verifyFieldValue('email', EDIT_PROFILE.email)
            .verifyFieldValue('organization', EDIT_PROFILE.organization)
            .verifyFieldValue('preferredLanguage', EDIT_PROFILE.preferredLanguage)
    })

    it('should discard an unsaved edit when Cancel is clicked', () => {
        // FT-002 (Jahia/selenium#1604)
        context.tag('user-management', 'edit', 'cancel', 'admin')
        ManageUsersPage.visit().openUser(EDIT_USER).fillForm({ firstName: 'rodrigo' }).cancel()

        ManageUsersPage.visit().openUser(EDIT_USER).verifyFieldValue('firstName', EDIT_PROFILE.firstName)
    })

    it('should persist every edited field on save', () => {
        // FT-003 (Jahia/selenium#1604)
        context.tag('user-management', 'edit', 'save', 'admin')
        const updated = {
            firstName: 'Updated',
            lastName: 'Person',
            email: 'updated.person@jahia.invalid',
            organization: 'JahiaUpdatedOrg',
            preferredLanguage: 'fr',
            password: 'NewPass12&',
            passwordConfirm: 'NewPass12&',
        }
        ManageUsersPage.visit().openUser(EDIT_USER).fillForm(updated).submitUpdate()

        ManageUsersPage.visit()
            .openUser(EDIT_USER)
            .verifyFieldValue('firstName', updated.firstName)
            .verifyFieldValue('lastName', updated.lastName)
            .verifyFieldValue('email', updated.email)
            .verifyFieldValue('organization', updated.organization)
            .verifyFieldValue('preferredLanguage', updated.preferredLanguage)
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
