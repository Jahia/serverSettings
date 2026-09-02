package org.jahia.modules.serversettings.roles.graphql;

import java.util.ArrayList;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.stream.Collectors;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.RoleModel;
import org.jahia.modules.serversettings.roles.RoleView;

@GraphQLName("Role")
@GraphQLDescription("One role, with every set of permissions it grants")
public class GqlRole {

    private final RoleModel model;
    private final RoleView role;

    GqlRole(RoleModel model, RoleView role) {
        this.model = model;
        this.role = role;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The role name, which is the value an access control entry's j:roles holds")
    public String getName() {
        return role.getName();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The JCR path of the role node")
    public String getPath() {
        return role.getPath();
    }

    @GraphQLField
    @GraphQLDescription("The role this one adds to, or null when the node sits directly under /roles")
    public String getParentRoleName() {
        RoleView parent = model.getParentOf(role);
        return parent == null ? null : parent.getName();
    }

    @GraphQLField
    @GraphQLDescription("The JCR path of the role this one adds to, or null when it has no parent role")
    public String getParentRolePath() {
        return role.getParentRolePath();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The names of the roles nested inside this one, sorted")
    public List<String> getSubRoleNames() {
        return role.getSubRoleNames();
    }

    @GraphQLField
    @GraphQLDescription("The j:roleGroup value, or null when the role declares none")
    public String getRoleGroup() {
        return role.getRoleGroup();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The node types the role can be granted on. Empty means any node type")
    public List<String> getNodeTypes() {
        return role.getNodeTypes();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The roles this one needs, from j:dependencies")
    public List<String> getDependencies() {
        return role.getDependencies();
    }

    @GraphQLField
    @GraphQLName("isHidden")
    @GraphQLNonNull
    @GraphQLDescription("True when j:hidden is set, so the access control picker does not offer the role")
    public boolean isHidden() {
        return role.isHidden();
    }

    @GraphQLField
    @GraphQLName("hasPrivilegedAccess")
    @GraphQLNonNull
    @GraphQLDescription("The role's own j:privilegedAccess value")
    public boolean hasPrivilegedAccess() {
        return role.isPrivilegedAccess();
    }

    @GraphQLField
    @GraphQLName("hasEffectivePrivilegedAccess")
    @GraphQLNonNull
    @GraphQLDescription("True when this role or any ancestor role sets j:privilegedAccess. AclListener "
            + "reads the property on the whole chain, so a sub-role of a privileged role is privileged")
    public boolean hasEffectivePrivilegedAccess() {
        return model.isEffectivelyPrivileged(role.getName());
    }

    @GraphQLField
    @GraphQLDescription("The jcr:title of the role in the given language, or null when it has none")
    public String getTitle(
            @GraphQLName("language") @GraphQLNonNull @GraphQLDescription("Language code") String language) {
        return role.getTitles().get(language);
    }

    @GraphQLField
    @GraphQLDescription("The jcr:description of the role in the given language, or null when it has none")
    public String getDescription(
            @GraphQLName("language") @GraphQLNonNull @GraphQLDescription("Language code") String language) {
        return role.getDescriptions().get(language);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The language codes the role carries a title or a description in, sorted")
    public List<String> getTranslatedLanguages() {
        SortedSet<String> languages = new TreeSet<>(role.getTitles().keySet());
        languages.addAll(role.getDescriptions().keySet());
        return new ArrayList<>(languages);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission names this role's own targets hold. This is what an administrator "
            + "wrote on the role, and the only set an edit on this role changes")
    public List<String> getDirectPermissionNames() {
        return new ArrayList<>(model.getDirectPermissionNames(role.getName()));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every permission this role grants, across every target. Larger than what the "
            + "role names, because a granted permission grants what it aggregates and a sub-role adds "
            + "what its parent grants")
    public List<String> getEffectivePermissionNames() {
        return new ArrayList<>(model.getEffectivePermissionNames(role.getName()));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permissions this role grants only because a parent role grants them")
    public List<String> getInheritedPermissionNames() {
        return new ArrayList<>(model.getInheritedPermissionNames(role.getName()));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permissions a target of this role names and no installed module declares. "
            + "Each one grants nothing, and stays in j:permissionNames until an administrator removes it")
    public List<String> getUnknownPermissionNames() {
        return new ArrayList<>(model.getUnknownPermissionNames(role.getName()));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("What an administrator should know about this role, beyond what it grants. "
            + "Empty on a role the repository resolves unambiguously")
    public List<GqlRoleWarning> getWarnings() {
        return model.getWarnings(role.getName()).stream()
                .map(GqlRoleWarning::new)
                .collect(Collectors.toList());
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("What removing one permission from one target would do. Read this before the "
            + "write, so the interface can state the effect whenever it exceeds the row clicked")
    public GqlRevokePlan getRevokePlan(
            @GraphQLName("target") @GraphQLNonNull @GraphQLDescription("The target identity, empty for "
                    + "the node the role is granted on") String target,
            @GraphQLName("permission") @GraphQLNonNull @GraphQLDescription("The permission to remove")
            String permission) {
        return new GqlRevokePlan(model.planRevoke(role.getName(), target, permission));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("What collapsing onto one permission would do. The role starts granting that "
            + "permission, because the target named its children and not the permission itself")
    public GqlCollapsePlan getCollapsePlan(
            @GraphQLName("target") @GraphQLNonNull @GraphQLDescription("The target identity") String target,
            @GraphQLName("permission") @GraphQLNonNull @GraphQLDescription("The permission to collapse onto")
            String permission) {
        return new GqlCollapsePlan(model.planCollapse(role.getName(), target, permission));
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permissions of one target that could be collapsed onto a parent, because "
            + "the target names every direct child of that parent. Offered, never required")
    public List<String> getCollapsablePermissions(
            @GraphQLName("target") @GraphQLNonNull @GraphQLDescription("The target identity") String target) {
        return model.getCollapsablePermissions(role.getName(), target);
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("Every target this role grants on, the node it is granted on first, then the "
            + "external targets sorted. A target only an ancestor role declares is included")
    public List<GqlRoleGrant> getGrants() {
        return model.getGrantIds(role.getName()).stream()
                .map(grantId -> new GqlRoleGrant(model, role.getName(), grantId))
                .collect(Collectors.toList());
    }
}
