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

    /**
     * Grant the given permissions on the given target of the given role.
     * <p>
     * A permission an ancestor permission already grants is not added, because adding it would change
     * nothing and would leave a redundant name behind.
     *
     * @param roleName the role
     * @param grantId the target identity, empty for the node the role is granted on
     * @param permissionNames the permissions to grant
     * @param expectedRevision the revision the read returned for that target
     * @return what the write did
     * @throws RepositoryException when the write fails
     */
    WriteResult grantPermissions(String roleName, String grantId, List<String> permissionNames,
                                 String expectedRevision) throws RepositoryException;

    /**
     * Remove one permission from the given target of the given role.
     * <p>
     * A granted ancestor permission is replaced by explicit grants on the children of every permission
     * between it and the one being removed, at every level and in one write.
     *
     * @param roleName the role
     * @param grantId the target identity, empty for the node the role is granted on
     * @param permissionName the permission to remove
     * @param expectedRevision the revision the read returned for that target
     * @return what the write did
     * @throws RepositoryException when the write fails
     */
    WriteResult revokePermission(String roleName, String grantId, String permissionName,
                                 String expectedRevision) throws RepositoryException;

    /**
     * Replace the grants on every direct child of the given permission with one grant on it.
     * <p>
     * The call changes nothing when the target does not name every direct child, because collapsing
     * then would grant more than the target grants now.
     *
     * @param roleName the role
     * @param grantId the target identity, empty for the node the role is granted on
     * @param permissionName the permission to collapse onto
     * @param expectedRevision the revision the read returned for that target
     * @return what the write did
     * @throws RepositoryException when the write fails
     */
    WriteResult collapsePermission(String roleName, String grantId, String permissionName,
                                   String expectedRevision) throws RepositoryException;

    /**
     * What collapsing onto the given permission would do, read before anything is written.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @param permissionName the permission to collapse onto
     * @return the plan, never null
     * @throws RepositoryException when the read fails
     */
    CollapsePlan planCollapse(String roleName, String grantId, String permissionName)
            throws RepositoryException;

    /**
     * Create a role.
     *
     * @param name the role name, which must not be carried by another role
     * @param parentRoleName the role to nest it in, or null to put it directly under the roles folder
     * @param roleGroup the {@code j:roleGroup} value, or null
     * @return the JCR path of the role created
     * @throws RepositoryException when the write fails, or the name is already carried by a role
     */
    String createRole(String name, String parentRoleName, String roleGroup) throws RepositoryException;

    /**
     * Copy a role under the same parent, with its metadata and every permission set it names.
     * <p>
     * The copy names what the source names, and nothing it only inherits, because the copy keeps the
     * same parent role and therefore inherits the same set.
     *
     * @param roleName the role to copy
     * @param newName the name of the copy
     * @param withSubRoles whether to copy the roles nested inside it
     * @return the JCR path of the copy
     * @throws RepositoryException when the write fails, or the new name is already carried by a role
     */
    String duplicateRole(String roleName, String newName, boolean withSubRoles) throws RepositoryException;

    /**
     * Delete a role, and every role nested inside it.
     *
     * @param roleName the role to delete
     * @return true when the role existed
     * @throws RepositoryException when the write fails
     */
    boolean deleteRole(String roleName) throws RepositoryException;

    /**
     * Add a target to a role, so it grants permissions somewhere other than the node it is granted on.
     *
     * @param roleName the role
     * @param path the {@code j:path} value, either {@code currentSite} or an absolute path
     * @return the target identity created
     * @throws RepositoryException when the write fails
     */
    String addTarget(String roleName, String path) throws RepositoryException;

    /**
     * Remove a target from a role.
     * <p>
     * A target only an ancestor role declares is not this role's to remove, so the call changes
     * nothing and answers false.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @return true when the role declared the target itself
     * @throws RepositoryException when the write fails
     */
    boolean removeTarget(String roleName, String grantId) throws RepositoryException;
}
