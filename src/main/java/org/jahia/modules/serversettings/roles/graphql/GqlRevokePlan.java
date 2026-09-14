package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.RevokeOutcome;
import org.jahia.modules.serversettings.roles.RevokePlan;

/**
 * What removing one permission would do, read before anything is written.
 * <p>
 * The interface shows this to the administrator whenever the effect exceeds the row they clicked, and
 * applies the removal with no question when it does not.
 */
@GraphQLName("RevokePlan")
@GraphQLDescription("What removing one permission from one target of one role would do")
public class GqlRevokePlan {

    private final RevokePlan plan;

    GqlRevokePlan(RevokePlan plan) {
        this.plan = plan;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("What the removal costs: IMMEDIATE, CASCADES, EXPANDS_ANCESTORS, "
            + "BLOCKED_BY_PARENT_ROLE or NOT_GRANTED")
    public RevokeOutcome getOutcome() {
        return plan.getOutcome();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The names the write adds to the target. These are the siblings along the way "
            + "down from each granted ancestor permission")
    public List<String> getAddedPermissions() {
        return plan.getAddedPermissions();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The names the write removes from the target")
    public List<String> getRemovedPermissions() {
        return plan.getRemovedPermissions();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission the role stops granting on this target. Measured by computing "
            + "the effective set again from the set the write would store, so it counts the permission "
            + "itself and everything it aggregated")
    public List<String> getLostPermissions() {
        return plan.getLostPermissions();
    }

    @GraphQLField
    @GraphQLDescription("The role that grants the permission when no write here removes it, or null")
    public String getBlockedBy() {
        return plan.getBlockedBy();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The whole set the write would store in j:permissionNames")
    public List<String> getResultingPermissions() {
        return plan.getResultingPermissions();
    }
}
