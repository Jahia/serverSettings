package org.jahia.modules.serversettings.roles.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.EffectivePermission;

/**
 * Why one permission is granted on one target of one role.
 * <p>
 * The two facts are independent. {@code isDirect} is what the checkbox writes, and {@code lockKind}
 * is what keeps the permission granted when the target stops naming it.
 */
@GraphQLName("EffectivePermission")
@GraphQLDescription("Why one permission is granted on one target of one role")
public class GqlEffectivePermission {

    private final EffectivePermission effective;

    GqlEffectivePermission(EffectivePermission effective) {
        this.effective = effective;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission name")
    public String getName() {
        return effective.getName();
    }

    @GraphQLField
    @GraphQLName("isDirect")
    @GraphQLNonNull
    @GraphQLDescription("True when the target's own j:permissionNames names this permission")
    public boolean isDirect() {
        return effective.isDirect();
    }

    @GraphQLField
    @GraphQLName("isKnown")
    @GraphQLNonNull
    @GraphQLDescription("False when no installed module declares this permission, so it grants nothing")
    public boolean isKnown() {
        return effective.isKnown();
    }

    @GraphQLField
    @GraphQLDescription("What holds the permission granted beyond the target's own names, or null")
    public EffectivePermission.LockKind getLockKind() {
        return effective.getLockKind();
    }

    @GraphQLField
    @GraphQLDescription("The ancestor permission name, or the parent role name. Null when the row is free")
    public String getLockedBy() {
        return effective.getLockedBy();
    }
}
