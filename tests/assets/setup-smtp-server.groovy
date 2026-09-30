import org.jahia.osgi.BundleUtils
import org.jahia.services.mail.MailService
import org.jahia.services.mail.MailSettings
import org.osgi.service.cm.ConfigurationAdmin

def smtpServerUrl = new URI(System.getenv("SMTP_SERVER_URL"))
def useSsl = smtpServerUrl.getScheme().equalsIgnoreCase("smtps")

// Jahia 8.2.4.0+ sends mail through the mail-service module (org.jahia.modules.mail PID).
def mailProps = new Hashtable<String, Object>()
mailProps.put("smtp.host", smtpServerUrl.getHost())
mailProps.put("smtp.port", String.valueOf(smtpServerUrl.getPort()))
// Mailpit accepts unauthenticated plain SMTP, so no auth is required.
mailProps.put("smtp.auth", "false")
mailProps.put("smtp.starttls", "false")
mailProps.put("smtp.ssl", String.valueOf(useSsl))
mailProps.put("default.from", "noreply@smtp-server.localhost")

def configAdmin = BundleUtils.getOsgiService(ConfigurationAdmin.class, null)
// "?" is a multi-location bind: the configuration is delivered to whichever bundle registers
// mail-service's DS component for this PID, regardless of which bundle created/updated it here.
// A plain getConfiguration(pid) binds the location to the calling bundle (the console/system
// bundle), which mail-service's component never receives.
configAdmin.getConfiguration("org.jahia.modules.mail", "?").update(mailProps)

// Jahia <= 8.2.3.0 (the current Release Latest image) has no mail-service module: the org.jahia.modules.mail
// config above is inert there, and mail goes through the legacy MailService. Keep configuring it so the
// same asset works on both channels. On 8.2.4.0+ this legacy call is a functional no-op (mail-service owns
// sending), so it does not cause a double send. Remove this block once Release Latest reaches 8.2.4.0
// (see Jahia/user-password-authentication#199/#200, which hit this exact gap first).
MailSettings mailSettings = new MailSettings()
mailSettings.setServiceActivated(true)
mailSettings.setUri(System.getenv("SMTP_SERVER_URL"))
mailSettings.setFrom("noreply@smtp-server.localhost")
mailSettings.setTo("admin@smtp-server.localhost")
MailService.getInstance().store(mailSettings)

// The notification GATE is a separate concern from mail transport (jahia-private PR #5202 split it out of
// the legacy /settings/mail-server JCR node into this OSGi service). Pin it explicitly rather than relying
// on the image's default, so FT-025/FT-026 (Jahia/selenium#1604) observe a known starting state regardless
// of what a given Jahia image ships as its own default.
def notificationProps = new Hashtable<String, Object>()
notificationProps.put("notificationLevel", "Standard")
notificationProps.put("workflowNotificationsDisabled", "false")
configAdmin.getConfiguration("org.jahia.bundles.notification", "?").update(notificationProps)
