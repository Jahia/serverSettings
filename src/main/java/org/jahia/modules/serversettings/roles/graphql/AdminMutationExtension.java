package org.jahia.modules.serversettings.roles.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import graphql.annotations.annotationTypes.GraphQLTypeExtension;
import org.jahia.modules.graphql.provider.dxm.admin.GqlAdminMutation;
import org.jahia.modules.graphql.provider.dxm.security.GraphQLRequiresPermission;

/**
 * Adds the roles and permissions namespace to the admin mutation root.
 * <p>
 * The permission gate sits on the one field that opens the namespace, as it does on the read side, so
 * no write inside it can be reached without {@code adminRoles}.
 */
@GraphQLTypeExtension(GqlAdminMutation.class)
@GraphQLDescription("Adds the roles and permissions administration namespace")
public class AdminMutationExtension {

    private AdminMutationExtension() {
    }

    @GraphQLField
    @GraphQLName("rolesAndPermissions")
    @GraphQLNonNull
    @GraphQLDescription("Change the role and permission model of this Jahia instance")
    @GraphQLRequiresPermission(value = "adminRoles")
    public static GqlRolesAndPermissionsMutation getRolesAndPermissions() {
        return new GqlRolesAndPermissionsMutation();
    }
}
