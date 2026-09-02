package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;
import java.util.stream.Collectors;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.PermissionCatalog;
import org.jahia.modules.serversettings.roles.RolesAndPermissionsService;

/**
 * The logical permission graph, as one flat list.
 * <p>
 * The list is flat on purpose. Every entry names its parent and its children, so a client builds the
 * tree once from a single response, and the whole graph is 367 entries on a full instance. A nested
 * GraphQL type would need a depth the schema cannot bound, and would answer the same data.
 */
@GraphQLName("PermissionCatalog")
@GraphQLDescription("Every permission this instance declares, as a flat list with parent and child names")
public class GqlPermissionCatalog {

    private final PermissionCatalog catalog;
    private final RolesAndPermissionsService service;

    GqlPermissionCatalog(PermissionCatalog catalog, RolesAndPermissionsService service) {
        this.catalog = catalog;
        this.service = service;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission, ordered by logical path so a parent precedes its children")
    public List<GqlPermission> getEntries(
            @GraphQLName("area") @GraphQLDescription("Keep only the permissions of this area") String area) {
        return catalog.getEntries().stream()
                .filter(entry -> area == null || area.equals(entry.getArea()))
                .map(entry -> new GqlPermission(entry, service))
                .collect(Collectors.toList());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The area names, in the order /permissions lists them, then any module-only area sorted")
    public List<String> getAreas() {
        return catalog.getAreas();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The count of permissions in the catalog")
    public int getTotalCount() {
        return catalog.getEntries().size();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Names that resolve to more than one logical path. Empty on a consistent instance")
    public List<String> getAmbiguousNames() {
        return catalog.getAmbiguousNames();
    }
}
