package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;
import java.util.Locale;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.apache.commons.lang.StringUtils;
import org.jahia.modules.serversettings.roles.PermissionEntry;
import org.jahia.modules.serversettings.roles.PermissionWorkspace;
import org.jahia.modules.serversettings.roles.RolesAndPermissionsService;
import org.jahia.utils.LanguageCodeConverters;

@GraphQLName("Permission")
@GraphQLDescription("One permission of the logical permission graph")
public class GqlPermission {

    private final PermissionEntry entry;
    private final RolesAndPermissionsService service;

    GqlPermission(PermissionEntry entry, RolesAndPermissionsService service) {
        this.entry = entry;
        this.service = service;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission name, which is the value a role's j:permissionNames holds")
    public String getName() {
        return entry.getName();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The path under /permissions, with any module and version prefix removed")
    public String getLogicalPath() {
        return entry.getLogicalPath();
    }

    @GraphQLField
    @GraphQLDescription("The permission that aggregates this one, or null when this one is an area root")
    public String getParentName() {
        return entry.getParentName();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permissions this one aggregates, sorted")
    public List<String> getChildNames() {
        return entry.getChildNames();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The first path segment under /permissions, used to group the interface")
    public String getArea() {
        return entry.getArea();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The depth under /permissions, where an area root is 1")
    public int getDepth() {
        return entry.getDepth();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The workspace the name suffix declares: EDIT, LIVE or NONE")
    public PermissionWorkspace getWorkspace() {
        return entry.getWorkspace();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every module that declares a node with this name, sorted. Empty when only core declares it")
    public List<String> getProvidedByModules() {
        return entry.getProvidedByModules();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission names this permission needs, from j:dependencies")
    public List<String> getDependencies() {
        return entry.getDependencies();
    }

    @GraphQLField
    @GraphQLName("isAbstract")
    @GraphQLNonNull
    @GraphQLDescription("True when j:isAbstract is set on any declaring node")
    // graphql-java-annotations derives the field name from the getter, and a bare `isAbstract` getter
    // would publish it as `abstract`. The name is set here so the schema matches the JCR property.
    public boolean isAbstract() {
        return entry.isAbstract();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The label, read from the core bundle and then from each declaring module")
    public String getLabel(
            @GraphQLName("language") @GraphQLDescription("Language code, defaults to English") String language) {
        return service.getPermissionLabel(entry, toLocale(language));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The description, read the same way as the label. Empty when no bundle answers")
    public String getDescription(
            @GraphQLName("language") @GraphQLDescription("Language code, defaults to English") String language) {
        return service.getPermissionDescription(entry, toLocale(language));
    }

    private static Locale toLocale(String language) {
        // LanguageCodeConverters accepts both en and en_US, which LocaleUtils does not.
        return StringUtils.isBlank(language) ? Locale.ENGLISH
                : LanguageCodeConverters.languageCodeToLocale(language);
    }
}
