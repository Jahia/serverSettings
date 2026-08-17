import {
    context,
    createSite,
    deleteSite,
    createUser,
    deleteUser,
    grantRoles,
    startWorkflow,
    jfaker,
} from '@jahia/cypress'
import { deleteAllEmails, getEmailBody, expectNoEmail } from './utils/mailpit'

/**
 * Migrated from the legacy Selenium suite: ManageUsersTest.emailNotification
 * (Jahia/selenium ManageUsersTest.java:70-107). Tracking issue: Jahia/selenium#1604
 * — FT-025, FT-026. This is the actual regression target behind the tracking issue: Bamboo case
 * DXTTJBOSS-DXTRUNKJBSTADM-ADMINTESTS-1026, suspected linked to the mail-service/NotificationConfig
 * rewrite (jahia-private PR #5202).
 *
 * GIVEN is set via API (createUser/grantRoles), never through the admin UI toggle — the "admin
 * unchecks/checks the box and saves" step from the legacy test is precondition setup here, not the
 * behavior under test. Mail delivery is asserted through a real Mailpit inbox (see tests/assets/
 * setup-smtp-server.groovy and tests/docker-compose.yml's smtp-server service), not by trusting the
 * admin-form toggle alone.
 *
 * FT-026 deliberately reuses the SAME pending workflow FT-025 starts, rather than starting a new
 * one — the reviewed FT table's own GIVEN for FT-026 is "the publication started in FT-025 is
 * rejected", matching the legacy test's structure (one SimplePublication instance, started once,
 * then rejected in a later step).
 */
describe('Manage Users - email notification on workflow publication', () => {
    const firstName = jfaker.person.firstName()
    const lastName = jfaker.person.lastName()
    const editorUsr = jfaker.internet.username({ firstName: firstName, lastName: lastName})
    const editorPwd = 'test1234'
    const editorEmail = `${editorUsr}@smtp-server.localhost`

    const siteKey = jfaker.internet.domainWord()
    const homePath = `/sites/${siteKey}/home`

    const requestSubject = `Publication request by ${firstName} ${lastName} for ${siteKey}`
    const rejectedSubject = `Publication rejected by root for ${siteKey}`

    /**
     * Enables or Disables user notifications
     * @param {boolean} status -- should notifications be enabled (true) or disabled (false)
     */
    const setUserNotifications = (status: boolean) => {
        cy.executeGroovy('groovy/setUserProperty.groovy', {
            USERNAME: editorUsr,
            PROPERTY_NAME: 'emailNotificationsDisabled',
            PROPERTY_VALUE: (!status).toString(),
        })
    }
    before(() => {
        createSite(siteKey,
            //{languages: 'en', templateSet: 'dx-base-demo-templates', serverName: 'localhost', locale: 'en'}
            {languages: 'en', templateSet: 'templates-system', serverName: 'localhost', locale: 'en'}
        )
        // GIVEN (FT-025): notifications enabled. Set explicitly rather than relying on the property
        // simply being absent, for a readable precondition matching the FT's GIVEN.
        createUser(editorUsr, editorPwd, [
            { name: 'j:firstName', value: firstName },
            { name: 'j:lastName', value: lastName },
            { name: 'j:email', value: editorEmail },
            { name: 'emailNotificationsDisabled', value: 'false' },
        ])
        grantRoles(`/sites/${siteKey}`, ['editor'], editorUsr, 'USER')
    })

    afterEach(() => {
        deleteAllEmails()
    })

    after(() => {
        deleteUser(editorUsr)
        deleteSite(siteKey)
    })

    it('should send a publication-request email when a user with notifications enabled starts a workflow (FT-025)', () => {
        context.tag('email-notification', 'workflow', 'publication', 'regression', 'admin')
        // login as an EDITOR
        cy.login(editorUsr, editorPwd)
        // switch apollo client to EDITOR user
        cy.apolloClient({username: editorUsr, password: editorPwd});
        // trigger workflow as an EDITOR
        startWorkflow(homePath, 'jBPM:1-step-publication', 'en')
        // check email for the EDITOR user
        getEmailBody(editorEmail, requestSubject).should('contain', 'New publication request')
    })

    it('should NOT send a publication-rejected email once the editor has disabled notifications (FT-026)', () => {
        context.tag('email-notification', 'workflow', 'publication', 'regression', 'admin')

        // Turn notifications OFF
        setUserNotifications(false)

        // Reject the still-pending workflow started in FT-025 (this FT's own GIVEN, per the
        // reviewed table, is literally "the publication started in FT-025 is rejected").
        cy.executeGroovy('groovy/rejectWorkflows.groovy')

        expectNoEmail(editorEmail, rejectedSubject)
    })
})
