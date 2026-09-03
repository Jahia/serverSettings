package org.jahia.modules.serversettings.roles.seed;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.SortedSet;
import java.util.TreeSet;

/**
 * What the installed sources declare one role should be.
 * <p>
 * This is a baseline and not a history. It says what a fresh instance carrying the same core version
 * and the same modules would hold, which is not the same thing as the state the role had a minute
 * ago. A reset therefore restores a described state, and the difference has to be shown before it is
 * applied.
 */
public final class RoleSeed {

    private final String name;
    private String parentRoleName;
    private String roleGroup;
    private Boolean privilegedAccess;
    private Boolean hidden;
    private final SortedSet<String> nodeTypes = new TreeSet<>();
    private final SortedSet<String> permissionNames = new TreeSet<>();
    private final Map<String, SeedTarget> targetsByName = new LinkedHashMap<>();
    private final Map<String, String> titles = new LinkedHashMap<>();
    private final Map<String, String> descriptions = new LinkedHashMap<>();
    private final List<RoleSeedSource> sources = new ArrayList<>();

    RoleSeed(String name) {
        this.name = name;
    }

    public String getName() {
        return name;
    }

    /** The role this one is nested inside, or null when the sources declare it at the top level. */
    public String getParentRoleName() {
        return parentRoleName;
    }

    public String getRoleGroup() {
        return roleGroup;
    }

    /** Null when no source states it, which leaves the live value alone on a reset. */
    public Boolean getPrivilegedAccess() {
        return privilegedAccess;
    }

    public Boolean getHidden() {
        return hidden;
    }

    public SortedSet<String> getNodeTypes() {
        return Collections.unmodifiableSortedSet(nodeTypes);
    }

    /** The permissions the sources name on the role node itself. */
    public SortedSet<String> getPermissionNames() {
        return Collections.unmodifiableSortedSet(permissionNames);
    }

    public Collection<SeedTarget> getTargets() {
        return Collections.unmodifiableCollection(targetsByName.values());
    }

    public SeedTarget getTarget(String nodeName) {
        return targetsByName.get(nodeName);
    }

    public Map<String, String> getTitles() {
        return Collections.unmodifiableMap(titles);
    }

    public Map<String, String> getDescriptions() {
        return Collections.unmodifiableMap(descriptions);
    }

    /** Every source that declared this role, in the order they were read. */
    public List<RoleSeedSource> getSources() {
        return Collections.unmodifiableList(sources);
    }

    void merge(RoleSeedSource source, String declaredParent, String declaredRoleGroup, Boolean declaredPrivileged,
               Boolean declaredHidden, Collection<String> declaredNodeTypes, Collection<String> declaredPermissions) {
        if (!sources.contains(source)) {
            sources.add(source);
        }
        // A later source wins on a scalar it states, and stays silent otherwise. Core declares the
        // role group and a module usually restates it; a module that omits it does not erase it.
        if (declaredParent != null) {
            parentRoleName = declaredParent;
        }
        if (declaredRoleGroup != null) {
            roleGroup = declaredRoleGroup;
        }
        if (declaredPrivileged != null) {
            privilegedAccess = declaredPrivileged;
        }
        if (declaredHidden != null) {
            hidden = declaredHidden;
        }
        nodeTypes.addAll(declaredNodeTypes);
        // Permissions accumulate. Every source that names one wants it, and no source can speak for
        // what another one declared, so the baseline is the union.
        permissionNames.addAll(declaredPermissions);
    }

    void mergeTarget(String nodeName, String path, Collection<String> permissions) {
        targetsByName.computeIfAbsent(nodeName, name -> new SeedTarget(name, path))
                .addPermissionNames(permissions);
    }

    void mergeText(String language, String title, String description) {
        if (title != null) {
            titles.put(language, title);
        }
        if (description != null) {
            descriptions.put(language, description);
        }
    }
}
