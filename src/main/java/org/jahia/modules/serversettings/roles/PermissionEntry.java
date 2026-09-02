package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collections;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;

/**
 * One permission of the logical permission graph.
 * <p>
 * A permission is a Jackrabbit privilege keyed by its NAME, so one entry can be declared by several
 * modules and by core at once. Those declarations are the same logical node, and this entry merges
 * them and records every module that declared one in {@link #getProvidedByModules()}.
 * <p>
 * The parent is the parent of the logical path, which is also the privilege that aggregates this one.
 * A role that grants the parent therefore grants this permission too.
 */
public final class PermissionEntry {

    private final String name;
    private final String logicalPath;
    private final String parentName;
    private final String area;
    private final int depth;
    private final PermissionWorkspace workspace;
    private final SortedSet<String> childNames = new TreeSet<>();
    private final SortedSet<String> providedByModules = new TreeSet<>();
    private final Set<String> dependencies = new LinkedHashSet<>();
    private boolean isAbstract;

    PermissionEntry(String name, String logicalPath, String parentName, String area, int depth) {
        this.name = name;
        this.logicalPath = logicalPath;
        this.parentName = parentName;
        this.area = area;
        this.depth = depth;
        this.workspace = PermissionWorkspace.of(name);
    }

    /** The permission name, which is what a role's {@code j:permissionNames} holds. */
    public String getName() {
        return name;
    }

    /**
     * The path this permission has under {@code /permissions}, with any module and version prefix
     * removed. A node under {@code /modules/jcontent/3.7.1/permissions/jContent/editAction} and a node
     * under {@code /permissions/jContent/editAction} share this value.
     */
    public String getLogicalPath() {
        return logicalPath;
    }

    /** The name of the permission that aggregates this one, or null when this one is an area root. */
    public String getParentName() {
        return parentName;
    }

    /** The first path segment under {@code /permissions}, used to group the interface. */
    public String getArea() {
        return area;
    }

    /** The depth under {@code /permissions}, where an area root is 1. */
    public int getDepth() {
        return depth;
    }

    /** The workspace the name suffix declares. */
    public PermissionWorkspace getWorkspace() {
        return workspace;
    }

    /** The names this permission aggregates, sorted. */
    public List<String> getChildNames() {
        return Collections.unmodifiableList(new ArrayList<>(childNames));
    }

    /** True when this permission aggregates at least one other permission. */
    public boolean hasChildren() {
        return !childNames.isEmpty();
    }

    /** Every module that declares a node with this name, sorted. Empty when only core declares it. */
    public List<String> getProvidedByModules() {
        return Collections.unmodifiableList(new ArrayList<>(providedByModules));
    }

    /** The permission names this permission needs, from {@code j:dependencies}. */
    public List<String> getDependencies() {
        return Collections.unmodifiableList(new ArrayList<>(dependencies));
    }

    /** True when {@code j:isAbstract} is set on any declaring node. */
    public boolean isAbstract() {
        return isAbstract;
    }

    void addChild(String childName) {
        childNames.add(childName);
    }

    void addProvidingModule(String moduleId) {
        providedByModules.add(moduleId);
    }

    void addDependencies(List<String> dependencyNames) {
        dependencies.addAll(dependencyNames);
    }

    void markAbstract() {
        isAbstract = true;
    }
}
