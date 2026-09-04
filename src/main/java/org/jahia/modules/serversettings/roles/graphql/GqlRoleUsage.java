package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.RoleUsage;

/**
 * Who currently holds a role.
 * <p>
 * The interface reads this before it offers to delete a role. Deleting a role that somebody holds
 * leaves the access control entries naming a role the repository no longer has, and those entries
 * then grant nothing.
 */
@GraphQLName("RoleUsage")
@GraphQLDescription("Who currently holds a role")
public class GqlRoleUsage {

    private final RoleUsage usage;

    GqlRoleUsage(RoleUsage usage) {
        this.usage = usage;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The count of access control entries that grant the role. One principal can "
            + "hold a role on several nodes, so this is at least the number of principals")
    public int getEntryCount() {
        return usage.getEntryCount();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The principals that hold the role, sorted. A key opens with u: for a user and "
            + "g: for a group, which is the form an access control entry stores")
    public List<String> getPrincipals() {
        return usage.getPrincipals();
    }

    @GraphQLField
    @GraphQLName("isTruncated")
    @GraphQLNonNull
    @GraphQLDescription("True when more principals hold the role than the list carries")
    public boolean isTruncated() {
        return usage.isTruncated();
    }
}
