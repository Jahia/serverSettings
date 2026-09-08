package org.jahia.modules.serversettings.roles.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.GrantTargetKind;
import org.jahia.modules.serversettings.roles.PermissionUsage;

/**
 * One place a permission is granted: a role, one of its targets, and why.
 * <p>
 * This is the row the permission explorer shows, and it is the answer the current interface cannot
 * give: which role grants this permission, and where it applies.
 */
@GraphQLName("PermissionUsage")
@GraphQLDescription("One role and target that grants a permission, and why it is granted there")
public class GqlPermissionUsage {

    private final PermissionUsage usage;

    GqlPermissionUsage(PermissionUsage usage) {
        this.usage = usage;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The role that grants the permission")
    public String getRoleName() {
        return usage.getRoleName();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The target identity within that role")
    public String getGrantId() {
        return usage.getGrantId();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Where the permissions of that target apply")
    public GrantTargetKind getTargetKind() {
        return usage.getTargetKind();
    }

    @GraphQLField
    @GraphQLDescription("The j:path value of the target, or null for the node the role is granted on")
    public String getTargetPath() {
        return usage.getTargetPath();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Whether the target names the permission, and what else holds it granted")
    public GqlEffectivePermission getEffective() {
        return new GqlEffectivePermission(usage.getEffective());
    }
}
