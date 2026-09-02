package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * One role, with every set of permissions it grants.
 * <p>
 * A role node can contain another role node, and {@code AccessManagerUtils.getPrivileges} walks up
 * that chain. So a sub-role adds to its parent role and can never subtract from it, which is what
 * {@link #getParentRolePath()} records.
 */
public final class RoleView {

    private final String name;
    private final String path;
    private final String parentRolePath;
    private final String roleGroup;
    private final boolean hidden;
    private final boolean privilegedAccess;
    private final List<String> nodeTypes = new ArrayList<>();
    private final List<String> dependencies = new ArrayList<>();
    private final List<String> subRoleNames = new ArrayList<>();
    private final SortedMap<String, String> titles = new TreeMap<>();
    private final SortedMap<String, String> descriptions = new TreeMap<>();

    // The grant on the node the role is granted on comes first, then one per external node, by name.
    private final Map<String, RoleGrant> grantsById = new LinkedHashMap<>();

    RoleView(String name, String path, String parentRolePath, String roleGroup, boolean hidden,
             boolean privilegedAccess) {
        this.name = name;
        this.path = path;
        this.parentRolePath = parentRolePath;
        this.roleGroup = roleGroup;
        this.hidden = hidden;
        this.privilegedAccess = privilegedAccess;
    }

    /** The role name, which is the value an access control entry's {@code j:roles} holds. */
    public String getName() {
        return name;
    }

    /** The JCR path of the role node. */
    public String getPath() {
        return path;
    }

    /**
     * The JCR path of the role this one adds to, or null when the node sits directly under
     * {@code /roles}.
     * <p>
     * The chain is walked by path and not by name, because {@code /roles/x/x} is a legal path. A walk
     * by name would read the inner role as its own parent and never terminate.
     */
    public String getParentRolePath() {
        return parentRolePath;
    }

    /** The names of the roles nested inside this one, sorted. */
    public List<String> getSubRoleNames() {
        return Collections.unmodifiableList(subRoleNames);
    }

    /** The {@code j:roleGroup} value, or null when the role declares none. */
    public String getRoleGroup() {
        return roleGroup;
    }

    /**
     * The node types the role can be granted on, from {@code j:nodeTypes}. An empty list means any
     * node type, which is how {@code JCRNodeWrapperImpl.getAvailableRoles} reads a missing property.
     */
    public List<String> getNodeTypes() {
        return Collections.unmodifiableList(nodeTypes);
    }

    /** The roles this one needs, from {@code j:dependencies}. */
    public List<String> getDependencies() {
        return Collections.unmodifiableList(dependencies);
    }

    /** True when {@code j:hidden} is set, so the access control picker does not offer the role. */
    public boolean isHidden() {
        return hidden;
    }

    /**
     * True when {@code j:privilegedAccess} is set. {@code AclListener} then adds the principal to the
     * site {@code privileged} group when the role is granted.
     */
    public boolean isPrivilegedAccess() {
        return privilegedAccess;
    }

    /** The {@code jcr:title} of the role, by language code. */
    public Map<String, String> getTitles() {
        return Collections.unmodifiableMap(titles);
    }

    /** The {@code jcr:description} of the role, by language code. */
    public Map<String, String> getDescriptions() {
        return Collections.unmodifiableMap(descriptions);
    }

    /** Every grant of this role, the one on the granted node first. */
    public Collection<RoleGrant> getGrants() {
        return Collections.unmodifiableCollection(grantsById.values());
    }

    /**
     * The grant of the given identity, or null when the role has none.
     *
     * @param grantId {@link RoleGrant#CURRENT_NODE_ID}, or a {@code jnt:externalPermissions} node name
     */
    public RoleGrant getGrant(String grantId) {
        return grantsById.get(grantId);
    }

    void addGrant(RoleGrant grant) {
        grantsById.put(grant.getId(), grant);
    }

    void addNodeTypes(Collection<String> types) {
        nodeTypes.addAll(types);
    }

    void addDependencies(Collection<String> roleNames) {
        dependencies.addAll(roleNames);
    }

    void addSubRoleName(String subRoleName) {
        subRoleNames.add(subRoleName);
        Collections.sort(subRoleNames);
    }

    void putTitle(String language, String title) {
        titles.put(language, title);
    }

    void putDescription(String language, String description) {
        descriptions.put(language, description);
    }
}
