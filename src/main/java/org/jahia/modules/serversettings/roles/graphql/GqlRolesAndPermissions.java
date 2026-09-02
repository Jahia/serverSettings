package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;

import javax.inject.Inject;
import javax.jcr.RepositoryException;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.graphql.provider.dxm.osgi.annotations.GraphQLOsgiService;
import org.jahia.modules.serversettings.roles.RolesAndPermissionsService;

@GraphQLName("RolesAndPermissionsQuery")
@GraphQLDescription("Read the role and permission model of this Jahia instance")
public class GqlRolesAndPermissions {

    @Inject
    @GraphQLOsgiService
    private RolesAndPermissionsService rolesAndPermissionsService;

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The distinct j:roleGroup values the repository holds, sorted")
    public List<String> getRoleGroups() throws RepositoryException {
        return rolesAndPermissionsService.getRoleGroups();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission this instance declares, merged by logical path")
    public GqlPermissionCatalog getPermissionCatalog() throws RepositoryException {
        return new GqlPermissionCatalog(rolesAndPermissionsService.getPermissionCatalog(),
                rolesAndPermissionsService);
    }
}
