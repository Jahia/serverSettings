package org.jahia.modules.serversettings.roles.graphql;

import java.util.ArrayList;
import java.util.List;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.seed.TargetKind;
import org.jahia.modules.serversettings.roles.seed.TargetResetDiff;

@GraphQLName("RoleTargetResetDiff")
@GraphQLDescription("What a reset changes on one target of a role")
public class GqlTargetResetDiff {

    private final TargetResetDiff diff;

    GqlTargetResetDiff(TargetResetDiff diff) {
        this.diff = diff;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The target identifier, empty for the role's own node")
    public String getId() {
        return diff.getId();
    }

    @GraphQLField
    @GraphQLDescription("The path the target reaches")
    public String getPath() {
        return diff.getPath();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("How the target stands between the role and the declared baseline")
    public TargetKind getKind() {
        return diff.getKind();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission names the reset adds here")
    public List<String> getAddedNames() {
        return new ArrayList<>(diff.getAddedNames());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission names the reset removes here")
    public List<String> getRemovedNames() {
        return new ArrayList<>(diff.getRemovedNames());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission the role starts granting here, the descendants of an added "
            + "name included. Longer than the added names whenever an added name aggregates others")
    public List<String> getGainedPermissions() {
        return new ArrayList<>(diff.getGainedPermissions());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission the role stops granting here, the descendants of a removed "
            + "name included")
    public List<String> getLostPermissions() {
        return new ArrayList<>(diff.getLostPermissions());
    }
}
