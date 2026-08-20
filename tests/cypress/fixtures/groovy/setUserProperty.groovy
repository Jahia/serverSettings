import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate
import org.jahia.services.usermanager.JahiaUserManagerService
import javax.jcr.RepositoryException

// Sets a single property on an already-existing user, for tests that need to change a profile flag
// (e.g. emailNotificationsDisabled) between two `it()` blocks without recreating the user (which
// @jahia/cypress's own createUser.groovy cannot do a second time - JahiaUserManagerService.createUser
// fails on a duplicate username).
JCRTemplate.getInstance().doExecuteWithSystemSession(new JCRCallback() {
    @Override
    Object doInJCR(JCRSessionWrapper session) throws RepositoryException {
        def user = JahiaUserManagerService.getInstance().lookupUser("USERNAME", session)
        user.setProperty("PROPERTY_NAME", "PROPERTY_VALUE")
        session.save()
        return null
    }
})
