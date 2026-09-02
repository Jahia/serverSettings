package org.jahia.modules.serversettings.roles.graphql;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.Collectors;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.seed.ResetPlan;

/**
 * What resetting a role to the declared baseline would change, measured without writing anything.
 */
@GraphQLName("RoleResetPlan")
@GraphQLDescription("What resetting a role to what the installed sources declare would change")
public class GqlResetPlan {

    private final ResetPlan plan;

    GqlResetPlan(ResetPlan plan) {
        this.plan = plan;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("False when no installed source declares this role, so there is no baseline")
    public boolean isApplicable() {
        return plan.isApplicable();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("True when the role already matches the baseline, so the reset writes nothing")
    public boolean isNoop() {
        return plan.isNoop();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("False when the repository no longer has the role. The reset then creates it, "
            + "and the access control entries left behind by its deletion start granting again")
    public boolean isRoleExists() {
        return plan.isRoleExists();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The sources that declare this role, so a reader can see whose baseline it is")
    public List<String> getSourceLabels() {
        return plan.getSourceLabels();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The sources that could not be read. The baseline is incomplete while this is "
            + "not empty, so the reset could remove a permission an unread source in fact declares")
    public List<String> getUnreadableSources() {
        return plan.getUnreadableSources();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The change, one entry per target")
    public List<GqlTargetResetDiff> getTargets() {
        return plan.getTargets().stream().map(GqlTargetResetDiff::new).collect(Collectors.toList());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("True when the reset makes the role grant something it does not grant today")
    public boolean isWidening() {
        return plan.isWidening();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission the role starts granting, across all of its targets")
    public List<String> getGainedPermissions() {
        return new ArrayList<>(plan.getGainedPermissions());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission the role stops granting, across all of its targets")
    public List<String> getLostPermissions() {
        return new ArrayList<>(plan.getLostPermissions());
    }

    @GraphQLField
    @GraphQLDescription("The role group the reset writes, or null when it does not change")
    public String getRoleGroupChange() {
        return plan.getRoleGroupChange();
    }

    @GraphQLField
    @GraphQLDescription("The privileged access the reset writes, or null when it does not change")
    public String getPrivilegedAccessChange() {
        return plan.getPrivilegedAccessChange();
    }

    @GraphQLField
    @GraphQLDescription("The hidden flag the reset writes, or null when it does not change")
    public String getHiddenChange() {
        return plan.getHiddenChange();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The node types the reset adds")
    public List<String> getNodeTypesAdded() {
        return new ArrayList<>(plan.getNodeTypesAdded());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The node types the reset removes")
    public List<String> getNodeTypesRemoved() {
        return new ArrayList<>(plan.getNodeTypesRemoved());
    }
}
