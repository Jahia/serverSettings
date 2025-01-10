import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRNodeWrapper
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.RepositoryException

def updateServerAdministratorPermissions() {
    JCRTemplate.getInstance().doExecuteWithSystemSession (new JCRCallback<Void>(){

        @Override
        Void doInJCR(JCRSessionWrapper jcrSessionWrapper) throws RepositoryException {
            log.info("Adding jobs permission to server-administrator");
            JCRNodeWrapper role = jcrSessionWrapper.getNode("/roles/server-administrator");
            role.getProperty("j:permissionNames").addValue("jobs");
            jcrSessionWrapper.save();
            return null
        }
    });
}

updateServerAdministratorPermissions();
