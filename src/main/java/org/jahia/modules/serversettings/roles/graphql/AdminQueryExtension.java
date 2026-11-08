package org.jahia.modules.serversettings.roles.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.admin.GqlAdminQuery;
import org.jahia.modules.graphql.provider.dxm.security.GraphQLRequiresPermission;

/**
 * Adds the roles and permissions namespace to the admin query root.
 * <p>
 * The permission gate sits here, on the one field that opens the namespace, so no field inside it
 * can be reached without {@code adminRoles}. That is the same permission the administration menu
 * entry requires.
 */
@GraphQLTypeExtension(GqlAdminQuery.class)
@GraphQLDescription("Adds the roles and permissions administration namespace")
public class AdminQueryExtension {

    private AdminQueryExtension() {
    }

    @GraphQLField
    @GraphQLName("rolesAndPermissions")
    @GraphQLNonNull
    @GraphQLDescription("Read the role and permission model of this Jahia instance")
    @GraphQLRequiresPermission(value = "adminRoles")
    public static GqlRolesAndPermissions getRolesAndPermissions() {
        return new GqlRolesAndPermissions();
    }
}
