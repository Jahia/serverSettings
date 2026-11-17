package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.CollapsePlan;

/**
 * What collapsing onto one permission would do, read before anything is written.
 * <p>
 * A collapse is not a pure tidy-up, and {@code gainedPermissions} is why. The target named the
 * children and not the parent, so the role starts granting the parent permission as well.
 */
@GraphQLName("CollapsePlan")
@GraphQLDescription("What replacing the grants on every direct child of one permission would do")
public class GqlCollapsePlan {

    private final CollapsePlan plan;

    GqlCollapsePlan(CollapsePlan plan) {
        this.plan = plan;
    }

    @GraphQLField
    @GraphQLName("isApplicable")
    @GraphQLNonNull
    @GraphQLDescription("False when the target does not name every direct child of the permission")
    public boolean isApplicable() {
        return plan.isApplicable();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The names the write adds, which is the permission collapsed onto")
    public List<String> getAddedPermissions() {
        return plan.getAddedPermissions();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The names the write removes, which are the direct children")
    public List<String> getRemovedPermissions() {
        return plan.getRemovedPermissions();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission the role starts granting. It holds the permission collapsed "
            + "onto, because the target named its children and not the permission itself")
    public List<String> getGainedPermissions() {
        return plan.getGainedPermissions();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The whole set the write would store in j:permissionNames")
    public List<String> getResultingPermissions() {
        return plan.getResultingPermissions();
    }
}
