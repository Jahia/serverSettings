package org.jahia.modules.serversettings.roles.graphql;

import java.util.Collections;
import java.util.List;
import java.util.SortedMap;
import java.util.stream.Collectors;

import javax.inject.Inject;
import javax.jcr.RepositoryException;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.graphql.provider.dxm.osgi.annotations.GraphQLOsgiService;
import org.jahia.modules.serversettings.roles.PermissionCatalog;
import org.jahia.modules.serversettings.roles.PermissionUsage;
import org.jahia.modules.serversettings.roles.RoleModel;
import org.jahia.modules.serversettings.roles.RoleView;
import org.jahia.modules.serversettings.roles.RolesAndPermissionsService;
import org.jahia.modules.serversettings.roles.seed.RoleSeed;
import org.jahia.modules.serversettings.roles.seed.RoleSeedCatalog;

/**
 * The read entry point of the roles and permissions administration.
 * <p>
 * One instance serves one query, so the catalog, the role model and the reverse index are each built
 * at most once per query and only when a selected field needs them. A query that reads only the
 * catalog never reads the roles.
 */
@GraphQLName("RolesAndPermissionsQuery")
@GraphQLDescription("Read the role and permission model of this Jahia instance")
public class GqlRolesAndPermissions {

    // Field injection is how the provider supplies an OSGi service to a GraphQL type. The schema
    // instantiates this class through its no-argument constructor and OSGIServiceInjectorDataFetcher
    // then sets the field, so a constructor parameter would never be filled.
    @Inject
    @GraphQLOsgiService
    private RolesAndPermissionsService rolesAndPermissionsService;  // NOSONAR - see above

    private PermissionCatalog catalog;
    private RoleModel roleModel;
    private SortedMap<String, List<PermissionUsage>> usagesByPermission;
    private RoleSeedCatalog seedCatalog;

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
        return new GqlPermissionCatalog(catalog(), rolesAndPermissionsService, this::usagesOf);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every role of this instance, in path order so a parent precedes its sub-roles")
    public List<GqlRole> getRoles(
            @GraphQLName("roleGroup") @GraphQLDescription("Keep only the roles of this role group")
            String roleGroup,
            @GraphQLName("includeHidden") @GraphQLDescription("Include the roles j:hidden removes from "
                    + "the access control picker. Default true, because this screen administers them")
            Boolean includeHidden) throws RepositoryException {
        RoleModel model = roleModel();
        boolean hidden = includeHidden == null || includeHidden;
        return model.getRoles().stream()
                .filter(role -> roleGroup == null || roleGroup.equals(role.getRoleGroup()))
                .filter(role -> hidden || !role.isHidden())
                .map(role -> new GqlRole(model, role, rolesAndPermissionsService, this::seedCatalog))
                .collect(Collectors.toList());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Role names carried by more than one role node. An access control entry holds a "
            + "role name, and core resolves it with a query that takes the first result, so which "
            + "permissions apply is undefined for such a name. Empty on a consistent instance")
    public List<String> getAmbiguousRoleNames() throws RepositoryException {
        return roleModel().getAmbiguousRoleNames();
    }

    @GraphQLField
    @GraphQLDescription("One role by name, or null when the instance has none of that name")
    public GqlRole getRole(
            @GraphQLName("name") @GraphQLNonNull @GraphQLDescription("The role name") String name)
            throws RepositoryException {
        RoleModel model = roleModel();
        RoleView role = model.get(name);
        return role == null ? null : new GqlRole(model, role, rolesAndPermissionsService, this::seedCatalog);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The roles an installed source declares that the repository no longer has. "
            + "A deleted role appears here, and resetting it puts the role back along with the access "
            + "it granted, because an access control entry stores the role name")
    public List<String> getMissingDeclaredRoles() throws RepositoryException {
        RoleModel model = roleModel();
        return seedCatalog().getSeeds().stream()
                .map(RoleSeed::getName)
                .filter(name -> model.get(name) == null)
                .sorted()
                .collect(Collectors.toList());
    }

    private RoleSeedCatalog seedCatalog() {
        if (seedCatalog == null) {
            // One walk of every installed bundle per query, however many roles select a reset plan.
            seedCatalog = rolesAndPermissionsService.getRoleSeedCatalog();
        }
        return seedCatalog;
    }

    private PermissionCatalog catalog() throws RepositoryException {
        if (catalog == null) {
            catalog = rolesAndPermissionsService.getPermissionCatalog();
        }
        return catalog;
    }

    private RoleModel roleModel() throws RepositoryException {
        if (roleModel == null) {
            // The model resolves each granted permission against the catalog, so both are built from
            // the same read and cannot disagree about which permissions exist.
            roleModel = rolesAndPermissionsService.getRoleModel(catalog());
        }
        return roleModel;
    }

    private List<PermissionUsage> usagesOf(String permissionName) throws RepositoryException {
        if (usagesByPermission == null) {
            usagesByPermission = roleModel().getUsagesByPermission();
        }
        return usagesByPermission.getOrDefault(permissionName, Collections.emptyList());
    }
}
