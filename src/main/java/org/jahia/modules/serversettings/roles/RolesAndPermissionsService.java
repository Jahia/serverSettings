package org.jahia.modules.serversettings.roles;

import java.util.List;
import java.util.Locale;

import javax.jcr.RepositoryException;

/**
 * Read and write the role and permission model that Jahia evaluates at runtime.
 * <p>
 * Every method reads through the calling user's own JCR session. The GraphQL layer gates the whole
 * API on the {@code adminRoles} permission, and the JCR access control still applies underneath,
 * so a caller never reads a role node the repository would refuse them.
 */
public interface RolesAndPermissionsService {

    /**
     * The role group of every role in the repository, deduplicated and sorted.
     * <p>
     * A role group is the value of {@code j:roleGroup}. It is a free string in the node type
     * definition, so the answer is what the repository holds and not a fixed list.
     *
     * @return the distinct role group names, sorted, never null
     * @throws RepositoryException when the query fails
     */
    List<String> getRoleGroups() throws RepositoryException;

    /**
     * The logical permission graph of this instance.
     * <p>
     * The catalog is built from every {@code jnt:permission} node the caller can read, which is core's
     * own subtree plus one subtree per installed module. It is small enough to build per call, so the
     * answer always reflects the modules installed right now.
     *
     * @return the catalog, never null
     * @throws RepositoryException when the query fails
     */
    PermissionCatalog getPermissionCatalog() throws RepositoryException;

    /**
     * Every role of the instance, and what each one effectively grants.
     *
     * @return the model, never null
     * @throws RepositoryException when the query fails
     */
    RoleModel getRoleModel() throws RepositoryException;

    /**
     * Every role of the instance, resolved against a catalog the caller already read.
     * <p>
     * A request that reads both the catalog and the roles builds the catalog once and passes it here,
     * because the model resolves each granted permission against it.
     *
     * @param catalog the permission catalog to resolve the grants against
     * @return the model, never null
     * @throws RepositoryException when the query fails
     */
    RoleModel getRoleModel(PermissionCatalog catalog) throws RepositoryException;

    /**
     * The label of the given permission, read from the core bundle and then from each declaring module.
     *
     * @param entry a permission of the catalog
     * @param locale the locale to read the bundles in
     * @return the label, and the humanised permission name when no bundle answers
     */
    String getPermissionLabel(PermissionEntry entry, Locale locale);

    /**
     * The description of the given permission, read the same way as its label.
     *
     * @param entry a permission of the catalog
     * @param locale the locale to read the bundles in
     * @return the description, and an empty string when no bundle answers
     */
    String getPermissionDescription(PermissionEntry entry, Locale locale);
}
