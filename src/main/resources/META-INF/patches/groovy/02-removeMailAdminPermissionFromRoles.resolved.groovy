import org.jahia.services.content.JCRCallback
import org.jahia.services.content.JCRSessionWrapper
import org.jahia.services.content.JCRTemplate

import javax.jcr.RepositoryException
import javax.jcr.query.Query

/*
 * Removes the obsolete "adminEmailSettings" permission from every role.
 *
 * This module no longer ships the legacy Mail server settings UI, nor the "adminEmailSettings"
 * permission that gated it (both removed in this change). This patch strips that permission from any
 * role that still references it, so no role keeps a dangling permission name after upgrade.
 *
 * Module patch: runs when this bundle reaches RESOLVED (the ".resolved" suffix). Idempotent — a
 * re-run simply finds no role carrying the permission.
 */
JCRTemplate.getInstance().doExecuteWithSystemSession(new JCRCallback<Void>() {
    @Override
    Void doInJCR(JCRSessionWrapper session) throws RepositoryException {
        def roles = session.getWorkspace().getQueryManager()
                .createQuery("SELECT * FROM [jnt:role] WHERE [j:permissionNames] = 'adminEmailSettings'", Query.JCR_SQL2)
                .execute().getNodes()
        int cleaned = 0
        while (roles.hasNext()) {
            def role = roles.nextNode()
            if (!role.hasProperty("j:permissionNames")) {
                continue
            }
            def permissions = role.getProperty("j:permissionNames").getValues().collect { it.getString() } as List
            if (permissions.remove("adminEmailSettings")) {
                role.setProperty("j:permissionNames", permissions as String[])
                cleaned++
                log.info("Removed 'adminEmailSettings' permission from role {}", role.getPath())
            }
        }
        if (cleaned > 0) {
            session.save()
            log.info("Removed obsolete 'adminEmailSettings' permission from {} role(s)", cleaned)
        } else {
            log.info("No role carries the 'adminEmailSettings' permission, nothing to clean")
        }
        return null
    }
})
