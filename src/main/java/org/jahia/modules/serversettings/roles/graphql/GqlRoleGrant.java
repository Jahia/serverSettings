package org.jahia.modules.serversettings.roles.graphql;

import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.GrantTargetKind;
import org.jahia.modules.serversettings.roles.RoleGrant;
import org.jahia.modules.serversettings.roles.RoleModel;

/**
 * One target of one role, and what the role effectively grants there.
 * <p>
 * A target the role does not declare itself still appears, because a role inherits a target of the
 * same name from an ancestor role. Its {@code directPermissions} is then empty and every effective
 * permission is locked by the ancestor role.
 */
@GraphQLName("RoleGrant")
@GraphQLDescription("One target of one role, and what the role effectively grants there")
public class GqlRoleGrant {

    private final RoleModel model;
    private final String roleName;
    private final String grantId;

    GqlRoleGrant(RoleModel model, String roleName, String grantId) {
        this.model = model;
        this.roleName = roleName;
        this.grantId = grantId;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The target identity, which is a jnt:externalPermissions node name, or empty for "
            + "the node the role is granted on. Role inheritance matches on this value")
    public String getId() {
        return grantId;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Where the permissions apply: CURRENT_NODE, CURRENT_SITE or ABSOLUTE_PATH")
    public GrantTargetKind getKind() {
        RoleGrant deciding = model.getDecidingGrant(roleName, grantId);
        return deciding == null ? GrantTargetKind.CURRENT_NODE : deciding.getKind();
    }

    @GraphQLField
    @GraphQLDescription("The j:path value, or null for the node the role is granted on")
    public String getPath() {
        RoleGrant deciding = model.getDecidingGrant(roleName, grantId);
        return deciding == null ? null : deciding.getPath();
    }

    @GraphQLField
    @GraphQLName("isInheritedOnly")
    @GraphQLNonNull
    @GraphQLDescription("True when only an ancestor role declares this target, so the role adds nothing here")
    public boolean isInheritedOnly() {
        return ownGrant() == null;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission names this target's own j:permissionNames holds, sorted")
    public List<String> getDirectPermissions() {
        RoleGrant own = ownGrant();
        return own == null ? Collections.emptyList() : own.getDirectPermissions();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("A value that changes whenever this target's permission set changes. Send it back "
            + "on a write, so a write that raced another administrator is refused")
    public String getRevision() {
        RoleGrant own = ownGrant();
        // A target the role does not declare has no property to write, and the empty set hashes to a
        // stable value, so the revision of an absent target is the revision of an empty one.
        return own == null ? RoleGrant.onCurrentNode().getRevision() : own.getRevision();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permissions of this target that could be grouped onto a parent, because "
            + "the target names every direct child of that parent. Offered, never required")
    public List<String> getCollapsablePermissions() {
        return model.getCollapsablePermissions(roleName, grantId);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("What grouping onto one permission would do. The role starts granting that "
            + "permission, because the target named its children and not the permission itself")
    public GqlCollapsePlan collapsePlan(
            @GraphQLName("permission") @GraphQLNonNull @GraphQLDescription("The permission to group onto")
            String permission) {
        return new GqlCollapsePlan(model.planCollapse(roleName, grantId, permission));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("What removing one permission from this target would do. Read it before the "
            + "write, so the interface states the effect whenever it exceeds the row clicked")
    public GqlRevokePlan revokePlan(
            @GraphQLName("permission") @GraphQLNonNull @GraphQLDescription("The permission to remove")
            String permission) {
        return new GqlRevokePlan(model.planRevoke(roleName, grantId, permission));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission granted on this target, and why, sorted by permission name")
    public List<GqlEffectivePermission> getEffectivePermissions() {
        return model.getEffectivePermissions(roleName, grantId).stream()
                .map(GqlEffectivePermission::new)
                .collect(Collectors.toList());
    }

    private RoleGrant ownGrant() {
        return model.get(roleName) == null ? null : model.get(roleName).getGrant(grantId);
    }
}
