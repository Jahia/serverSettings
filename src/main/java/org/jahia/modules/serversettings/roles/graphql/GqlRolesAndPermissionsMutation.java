package org.jahia.modules.serversettings.roles.graphql;

import java.util.Collections;
import java.util.List;

import javax.inject.Inject;
import javax.jcr.ItemExistsException;
import javax.jcr.RepositoryException;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.graphql.provider.dxm.GqlConstraintViolationException;
import org.jahia.modules.graphql.provider.dxm.osgi.annotations.GraphQLOsgiService;
import org.jahia.modules.serversettings.roles.RolesAndPermissionsService;

/**
 * The write entry point of the roles and permissions administration.
 * <p>
 * A permission-set write goes through here rather than through the generic JCR mutation, for two
 * reasons. The set is a security decision, so the server and not the browser decides what it becomes.
 * And each call carries the revision a read returned, so two administrators editing one role cannot
 * overwrite each other in silence.
 * <p>
 * The role metadata is a different matter. A title, a description, the visibility and the node types
 * are plain property writes with no algorithm behind them, and the generic JCR mutation writes those.
 */
@GraphQLName("RolesAndPermissionsMutation")
@GraphQLDescription("Change the role and permission model of this Jahia instance")
public class GqlRolesAndPermissionsMutation {

    @Inject
    @GraphQLOsgiService
    private RolesAndPermissionsService rolesAndPermissionsService;

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Grant permissions on one target of one role. A permission an ancestor "
            + "permission already grants is not added, because it would change nothing")
    public GqlWriteResult grantPermissions(
            @GraphQLName("role") @GraphQLNonNull @GraphQLDescription("The role name") String role,
            @GraphQLName("target") @GraphQLNonNull @GraphQLDescription("The target identity, empty for "
                    + "the node the role is granted on") String target,
            @GraphQLName("permissions") @GraphQLNonNull @GraphQLDescription("The permissions to grant")
            List<String> permissions,
            @GraphQLName("expectedRevision") @GraphQLDescription("The revision the read returned for "
                    + "that target. The write is refused when the stored set moved since") String expectedRevision)
            throws RepositoryException {
        return new GqlWriteResult(
                rolesAndPermissionsService.grantPermissions(role, target, permissions, expectedRevision));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Remove one permission from one target of one role. A granted ancestor "
            + "permission is replaced by explicit grants along the way down, at every level and in one "
            + "write. Read the plan first to know what the removal costs")
    public GqlWriteResult revokePermission(
            @GraphQLName("role") @GraphQLNonNull @GraphQLDescription("The role name") String role,
            @GraphQLName("target") @GraphQLNonNull @GraphQLDescription("The target identity") String target,
            @GraphQLName("permission") @GraphQLNonNull @GraphQLDescription("The permission to remove")
            String permission,
            @GraphQLName("expectedRevision") @GraphQLDescription("The revision the read returned")
            String expectedRevision) throws RepositoryException {
        return new GqlWriteResult(
                rolesAndPermissionsService.revokePermission(role, target, permission, expectedRevision));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Replace the grants on every direct child of one permission with one grant on "
            + "it. Changes nothing when the target does not name every direct child")
    public GqlWriteResult collapsePermission(
            @GraphQLName("role") @GraphQLNonNull @GraphQLDescription("The role name") String role,
            @GraphQLName("target") @GraphQLNonNull @GraphQLDescription("The target identity") String target,
            @GraphQLName("permission") @GraphQLNonNull @GraphQLDescription("The permission to collapse onto")
            String permission,
            @GraphQLName("expectedRevision") @GraphQLDescription("The revision the read returned")
            String expectedRevision) throws RepositoryException {
        return new GqlWriteResult(
                rolesAndPermissionsService.collapsePermission(role, target, permission, expectedRevision));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Create a role. Refused when another role already carries the name, because an "
            + "access control entry holds a role name and two roles of one name make the applied "
            + "permissions undefined")
    public String createRole(
            @GraphQLName("name") @GraphQLNonNull @GraphQLDescription("The role name") String name,
            @GraphQLName("parentRole") @GraphQLDescription("The role to nest it in, or null for the "
                    + "roles folder") String parentRole,
            @GraphQLName("roleGroup") @GraphQLDescription("The j:roleGroup value") String roleGroup)
            throws RepositoryException {
        try {
            return rolesAndPermissionsService.createRole(name, parentRole, roleGroup);
        } catch (ItemExistsException e) {
            // A plain repository exception reaches the client as "Internal Server Error", which tells
            // an administrator nothing. This one carries its own message.
            throw new GqlConstraintViolationException(e, Collections.emptyMap());
        }
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Copy a role under the same parent, with its metadata and every permission set "
            + "it names")
    public String duplicateRole(
            @GraphQLName("role") @GraphQLNonNull @GraphQLDescription("The role to copy") String role,
            @GraphQLName("newName") @GraphQLNonNull @GraphQLDescription("The name of the copy") String newName,
            @GraphQLName("withSubRoles") @GraphQLDescription("Copy the roles nested inside it. Default false")
            Boolean withSubRoles) throws RepositoryException {
        try {
            return rolesAndPermissionsService.duplicateRole(role, newName, Boolean.TRUE.equals(withSubRoles));
        } catch (ItemExistsException e) {
            throw new GqlConstraintViolationException(e, Collections.emptyMap());
        }
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Delete a role, and every role nested inside it")
    public boolean deleteRole(
            @GraphQLName("role") @GraphQLNonNull @GraphQLDescription("The role to delete") String role)
            throws RepositoryException {
        return rolesAndPermissionsService.deleteRole(role);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Add a target to a role, so it grants permissions somewhere other than the node "
            + "it is granted on. Answers the target identity")
    public String addTarget(
            @GraphQLName("role") @GraphQLNonNull @GraphQLDescription("The role") String role,
            @GraphQLName("path") @GraphQLNonNull @GraphQLDescription("The j:path value, either "
                    + "currentSite or an absolute path") String path) throws RepositoryException {
        return rolesAndPermissionsService.addTarget(role, path);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Remove a target from a role. Answers false when only an ancestor role declares "
            + "it, because such a target is not this role's to remove")
    public boolean removeTarget(
            @GraphQLName("role") @GraphQLNonNull @GraphQLDescription("The role") String role,
            @GraphQLName("target") @GraphQLNonNull @GraphQLDescription("The target identity") String target)
            throws RepositoryException {
        return rolesAndPermissionsService.removeTarget(role, target);
    }
}
