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
import { deleteAllEmails, getEmailBody, expectNoEmail } from './utils/mailFactor'

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
    const PASSWORD = 'TestPass12&'
    const token = jfaker.string.alpha({ length: 8, casing: 'lower', safe: true })
    const site = `murNotif${token}`
    const siteTitle = `MUR Notification ${token}`
    const editor = `murEditor${token}`
    const editorEmail = `${editor}@smtp-server.localhost`
    const firstName = 'Notif'
    const lastName = 'Editor'
    const homePath = `/sites/${site}/home`

    const requestSubject = `Publication request by ${firstName} ${lastName} for ${siteTitle}`
    const rejectedSubject = `Publication rejected by root for ${siteTitle}`

    before(() => {
        createSite(site, {
            languages: 'en',
            templateSet: 'templates-system',
            serverName: 'localhost',
            locale: 'en',
        })
        // GIVEN (FT-025): notifications enabled. Set explicitly rather than relying on the property
        // simply being absent, for a readable precondition matching the FT's GIVEN.
        createUser(editor, PASSWORD, [
            { name: 'j:firstName', value: firstName },
            { name: 'j:lastName', value: lastName },
            { name: 'j:email', value: editorEmail },
            { name: 'emailNotificationsDisabled', value: 'false' },
        ])
        grantRoles(`/sites/${site}`, ['editor'], editor, 'USER')
        deleteAllEmails()
    })

    after(() => {
        deleteUser(editor)
        deleteSite(site)
    })

    // TODO(qa-migration): live run confirms the SMTP/mail-service wiring itself is correct (same
    // pattern as Jahia/user-password-authentication#199/#200) - raw SMTP to Mailpit works
    // (`nc smtp-server 1025` gets a real Mailpit banner), the `mail-service` bundle is ACTIVE and
    // logs "Mail service ready: host=smtp-server, port=1025" after picking up the config, and a
    // user-creation-triggered mail ("Mail sent in Nms") DOES arrive. But the workflow-publication
    // notification itself never fires: after startWorkflow(), NONE of JBPMMailSession's own log
    // lines appear (not even its "skipping" warnings for a disabled/unavailable gate) - the
    // task-created listener that is supposed to call JBPMMailProducer/JBPMMailSession.send() never
    // runs at all on this site. Suspect the bare `templates-system` template set this suite uses
    // doesn't wire up whatever triggers that listener for a "jBPM:1-step-publication" workflow
    // (the legacy Selenium suite ran this against a full ACMESPACE demo site, not a minimal one) -
    // unconfirmed which template/module actually provides that wiring. Needs a live devtools/debug
    // session tracing JBPMMailProducer's caller, not a further blind guess. Un-skip once found.
    it('should send a publication-request email when a user with notifications enabled starts a workflow (FT-025)', () => {
        context.tag('email-notification', 'workflow', 'publication', 'regression', 'admin')
        cy.login(editor, PASSWORD)
        startWorkflow(homePath, 'jBPM:1-step-publication', 'en')

        cy.login()
        getEmailBody(editorEmail, requestSubject).should('contain', 'New publication request')
    })

    // TODO(qa-migration): same root cause as FT-025 above - this FT's GIVEN depends on FT-025's
    // workflow actually having started and its notification path actually being wired up. Un-skip
    // together with FT-025.
    it('should NOT send a publication-rejected email once the editor has disabled notifications (FT-026)', () => {
        context.tag('email-notification', 'workflow', 'publication', 'regression', 'admin')
        cy.login()
        // GIVEN (FT-026): the editor from FT-025 now has notifications disabled. Updating the
        // already-created user's property directly - @jahia/cypress's createUser cannot be called
        // a second time for the same username (JahiaUserManagerService.createUser rejects duplicates).
        cy.executeGroovy('groovy/setUserProperty.groovy', {
            USERNAME: editor,
            PROPERTY_NAME: 'emailNotificationsDisabled',
            PROPERTY_VALUE: 'true',
        })

        // Reject the still-pending workflow started in FT-025 (this FT's own GIVEN, per the
        // reviewed table, is literally "the publication started in FT-025 is rejected").
        cy.executeGroovy('groovy/rejectWorkflows.groovy')

        expectNoEmail(editorEmail, rejectedSubject)
    })
})
