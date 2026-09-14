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
    const EDITOR_USR = {
        username: jfaker.internet.username(),
        password: 'test1234',
        firstName: jfaker.person.firstName(),
        lastName: jfaker.person.lastName(),
        email: jfaker.internet.email()
    }

    const siteKey = jfaker.lorem.slug()
    const homePath = `/sites/${siteKey}/home`

    const requestSubject = `Publication request by ${EDITOR_USR.firstName} ${EDITOR_USR.lastName} for ${siteKey}`
    const rejectedSubject = `Publication rejected by root for ${siteKey}`

    /**
     * Enables or Disables user notifications
     * @param {boolean} status -- should notifications be enabled (true) or disabled (false)
     */
    const setUserNotifications = (status: boolean) => {
        cy.executeGroovy('groovy/setUserProperty.groovy', {
            USERNAME: EDITOR_USR.username,
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
        createUser(EDITOR_USR.username, EDITOR_USR.password, [
            { name: 'j:firstName', value: EDITOR_USR.firstName },
            { name: 'j:lastName', value: EDITOR_USR.lastName },
            { name: 'j:email', value: EDITOR_USR.email },
            { name: 'emailNotificationsDisabled', value: 'false' },
        ])
        grantRoles(`/sites/${siteKey}`, ['editor'], EDITOR_USR.username, 'USER')
    })

    afterEach(() => {
        deleteAllEmails()
    })

    after(() => {
        deleteUser(EDITOR_USR.username)
        deleteSite(siteKey)
    })

    it('should send a publication-request email when a user with notifications enabled starts a workflow (FT-025)', () => {
        context.tag('email-notification', 'workflow', 'publication', 'regression', 'admin')
        // login as an EDITOR
        cy.login(EDITOR_USR.username, EDITOR_USR.password)
        // switch apollo client to EDITOR user
        cy.apolloClient({username: EDITOR_USR.username, password: EDITOR_USR.password});
        // trigger workflow as an EDITOR
        startWorkflow(homePath, 'jBPM:1-step-publication', 'en')
        // check email for the EDITOR user
        getEmailBody(EDITOR_USR.email, requestSubject).should('contain', 'New publication request')
    })

    it('should NOT send a publication-rejected email once the editor has disabled notifications (FT-026)', () => {
        context.tag('email-notification', 'workflow', 'publication', 'regression', 'admin')

        // Turn notifications OFF
        setUserNotifications(false)

        // Reject the still-pending workflow started in FT-025 (this FT's own GIVEN, per the
        // reviewed table, is literally "the publication started in FT-025 is rejected").
        cy.executeGroovy('groovy/rejectWorkflows.groovy')

        expectNoEmail(EDITOR_USR.email, rejectedSubject)
    })
})
