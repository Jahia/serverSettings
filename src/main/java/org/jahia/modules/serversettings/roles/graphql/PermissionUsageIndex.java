package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;

import javax.jcr.RepositoryException;

import org.jahia.modules.serversettings.roles.PermissionUsage;

/**
 * Where a permission is granted, looked up by permission name.
 * <p>
 * The index is passed down to each permission rather than computed with the catalog, so a query that
 * does not select {@code grantedBy} never reads the roles.
 */
@FunctionalInterface
interface PermissionUsageIndex {

    /**
     * Every role and target that grants the given permission.
     *
     * @param permissionName the permission
     * @return the usages, empty when no role grants it
     * @throws RepositoryException when the roles cannot be read
     */
    List<PermissionUsage> forPermission(String permissionName) throws RepositoryException;
}
