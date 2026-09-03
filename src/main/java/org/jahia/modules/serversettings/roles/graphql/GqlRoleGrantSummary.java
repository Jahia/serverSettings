package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;

/**
 * What a role grants, short enough to sit on one row of a list.
 * <p>
 * The labels are the permissions the role itself names, with every permission an already listed one
 * covers removed. Nothing is ranked by meaning: the reduction is the aggregation the repository
 * defines, so a reader sees what the role names rather than what a screen decided to highlight.
 */
@GraphQLName("RoleGrantSummary")
@GraphQLDescription("What a role grants, short enough for one row of a list")
public class GqlRoleGrantSummary {

    private final List<String> labels;
    private final int remaining;
    private final boolean additive;

    GqlRoleGrantSummary(List<String> labels, int remaining, boolean additive) {
        this.labels = labels;
        this.remaining = remaining;
        this.additive = additive;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission labels, the broadest first")
    public List<String> getLabels() {
        return labels;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("How many more permissions the role names beyond the labels returned")
    public int getRemaining() {
        return remaining;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("True when the role is nested inside another, so these permissions are what "
            + "it ADDS to what its parent role already grants")
    @GraphQLName("isAdditive")
    public boolean isAdditive() {
        return additive;
    }
}
