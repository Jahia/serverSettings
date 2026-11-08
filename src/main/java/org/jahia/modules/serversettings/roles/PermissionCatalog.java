package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedSet;
import java.util.TreeSet;

import org.apache.commons.lang.StringUtils;

/**
 * The logical permission graph of one Jahia instance.
 * <p>
 * Core declares permissions under {@code /permissions} and a module declares its own under
 * {@code /modules/<module>/<version>/permissions}. Jahia registers a privilege per NAME, so those two
 * declarations of the same name are one privilege at runtime. This catalog holds one entry per logical
 * permission and records every module that declared it, which is the model the interface renders.
 * <p>
 * Nothing here re-parents a permission. An entry keeps the parent its logical path gives it, because
 * that parent is also the privilege that aggregates it.
 */
public final class PermissionCatalog {

    /** The path core seeds its permissions under, and the suffix a module's own subtree carries. */
    static final String PERMISSIONS_ROOT = "/permissions";

    private static final String MODULES_SEGMENT = "modules";
    private static final String PERMISSIONS_SEGMENT = "permissions";

    private final Map<String, PermissionEntry> byName = new LinkedHashMap<>();
    private final Map<String, PermissionEntry> byLogicalPath = new LinkedHashMap<>();
    private final Map<String, SortedSet<String>> logicalPathsByName = new LinkedHashMap<>();
    private final List<String> areas = new ArrayList<>();

    PermissionCatalog() {
    }

    /** Every permission, ordered by logical path. */
    public Collection<PermissionEntry> getEntries() {
        return Collections.unmodifiableCollection(byLogicalPath.values());
    }

    /** The permission of that name, or null when the instance declares none. */
    public PermissionEntry get(String permissionName) {
        return byName.get(permissionName);
    }

    /** True when the instance declares a permission of that name. */
    public boolean contains(String permissionName) {
        return byName.containsKey(permissionName);
    }

    /** The area names, in the order {@code /permissions} lists them, then any module-only area sorted. */
    public List<String> getAreas() {
        return Collections.unmodifiableList(areas);
    }

    /**
     * The names that resolve to more than one logical path, sorted.
     * <p>
     * Jahia keys a privilege by name, so such a name is one privilege whose aggregates are the union of
     * what each path declares. The catalog reports the name rather than choosing a path for it, because
     * the interface must not present a merge it cannot justify.
     *
     * @return the ambiguous names, empty on a consistent instance
     */
    public List<String> getAmbiguousNames() {
        List<String> ambiguous = new ArrayList<>();
        logicalPathsByName.forEach((name, paths) -> {
            if (paths.size() > 1) {
                ambiguous.add(name);
            }
        });
        Collections.sort(ambiguous);
        return ambiguous;
    }

    /**
     * Every permission the given permission aggregates, at any depth, excluding itself.
     * <p>
     * This is the set a role grants when it names the given permission, which is what
     * {@code AccessManagerUtils.matchPermission} reads through the privilege aggregates.
     *
     * @param permissionName the permission to expand
     * @return the descendant names, empty when the permission is a leaf or is unknown
     */
    public Set<String> getDescendantNames(String permissionName) {
        Set<String> descendants = new LinkedHashSet<>();
        collectDescendants(permissionName, descendants);
        return descendants;
    }

    /**
     * The permissions that aggregate the given one, nearest first.
     * <p>
     * A role granting any of these grants the given permission, so removing it means dealing with
     * every one of them.
     *
     * @param permissionName the permission to walk up from
     * @return the ancestor names, nearest first, empty when the permission is an area root or unknown
     */
    public List<String> getAncestorNames(String permissionName) {
        List<String> ancestors = new ArrayList<>();
        PermissionEntry entry = byName.get(permissionName);
        while (entry != null && entry.getParentName() != null) {
            entry = byName.get(entry.getParentName());
            if (entry == null || ancestors.contains(entry.getName())) {
                break;
            }
            ancestors.add(entry.getName());
        }
        return ancestors;
    }

    /**
     * The permission that aggregates the given one, or null.
     *
     * @param permissionName the permission
     * @return the parent name, or null when the permission is an area root or unknown
     */
    public String getParentName(String permissionName) {
        PermissionEntry entry = byName.get(permissionName);
        return entry == null ? null : entry.getParentName();
    }

    /**
     * The permissions the given one aggregates directly, sorted.
     *
     * @param permissionName the permission
     * @return the child names, empty when the permission is a leaf or unknown
     */
    public List<String> getChildNames(String permissionName) {
        PermissionEntry entry = byName.get(permissionName);
        return entry == null ? Collections.emptyList() : entry.getChildNames();
    }

    private void collectDescendants(String permissionName, Set<String> collected) {
        PermissionEntry entry = byName.get(permissionName);
        if (entry == null) {
            return;
        }
        for (String child : entry.getChildNames()) {
            // A cycle cannot exist in a JCR tree, and the guard still costs nothing and bounds the walk
            // if a future merge ever introduces one.
            if (collected.add(child)) {
                collectDescendants(child, collected);
            }
        }
    }

    /**
     * Add one declaring node to the catalog.
     * <p>
     * A second node of the same logical path adds its module to the existing entry and creates nothing.
     *
     * @param nodePath the JCR path of the {@code jnt:permission} node
     * @return the entry the node belongs to, or null when the node is a subtree container and not a
     *         permission an administrator grants
     */
    PermissionEntry addNode(String nodePath) {
        String logicalPath = toLogicalPath(nodePath);
        if (logicalPath == null || PERMISSIONS_ROOT.equals(logicalPath)) {
            // The container node of each subtree is itself a jnt:permission. It is not a permission a
            // role grants, so it is not an entry.
            return null;
        }

        PermissionEntry entry = byLogicalPath.get(logicalPath);
        if (entry == null) {
            String relative = StringUtils.substringAfter(logicalPath, PERMISSIONS_ROOT + "/");
            String[] segments = StringUtils.split(relative, '/');
            String name = segments[segments.length - 1];
            String parentName = segments.length > 1 ? segments[segments.length - 2] : null;
            entry = new PermissionEntry(name, logicalPath, parentName, segments[0], segments.length);
            byLogicalPath.put(logicalPath, entry);
            // The first declaration of a name wins the byName slot. getAmbiguousNames() reports the
            // names where that choice was made, so the merge stays visible.
            byName.putIfAbsent(name, entry);
            logicalPathsByName.computeIfAbsent(name, key -> new TreeSet<>()).add(logicalPath);
        }

        String moduleId = toModuleId(nodePath);
        if (moduleId != null) {
            entry.addProvidingModule(moduleId);
        }
        return entry;
    }

    /** Link every entry to its parent, once every node was added. */
    void link() {
        for (PermissionEntry entry : byLogicalPath.values()) {
            if (entry.getParentName() == null) {
                continue;
            }
            String parentPath = StringUtils.substringBeforeLast(entry.getLogicalPath(), "/");
            PermissionEntry parent = byLogicalPath.get(parentPath);
            if (parent != null) {
                parent.addChild(entry.getName());
            }
        }
    }

    /**
     * Set the area order.
     * <p>
     * The order {@code /permissions} lists its own children in is the order core intended, so it is
     * used first. An area only a module declares has no place in that list, and is appended sorted.
     *
     * @param seededOrder the child names of {@code /permissions}, in repository order
     */
    void orderAreas(List<String> seededOrder) {
        Set<String> declared = new LinkedHashSet<>();
        byLogicalPath.values().forEach(entry -> declared.add(entry.getArea()));

        areas.clear();
        seededOrder.stream().filter(declared::contains).forEach(areas::add);

        SortedSet<String> remaining = new TreeSet<>(declared);
        remaining.removeAll(areas);
        areas.addAll(remaining);
    }

    /**
     * The path the given node has under {@code /permissions}, with any module and version prefix removed.
     *
     * @param nodePath a JCR path
     * @return the logical path, or null when the path is not inside a permissions subtree
     */
    static String toLogicalPath(String nodePath) {
        String[] segments = StringUtils.split(nodePath, '/');
        if (segments.length == 0) {
            return null;
        }
        if (!MODULES_SEGMENT.equals(segments[0])) {
            // The separator is part of the test. Without it /permissionsArchive passes as a logical
            // path, and addNode then reads no segment after "/permissions/" and walks off an empty
            // array, which takes the whole catalog down on one stray top-level node.
            return nodePath.equals(PERMISSIONS_ROOT) || nodePath.startsWith(PERMISSIONS_ROOT + "/")
                    ? nodePath : null;
        }
        // A module subtree is /modules/<module>/<version>/permissions/... — the segment index is fixed,
        // so a module whose own name is "permissions" cannot shift the answer.
        if (segments.length < 4 || !PERMISSIONS_SEGMENT.equals(segments[3])) {
            return null;
        }
        return "/" + String.join("/", Arrays.copyOfRange(segments, 3, segments.length));
    }

    /**
     * The module that declares the given node.
     *
     * @param nodePath a JCR path
     * @return the module identifier, or null when core declares the node
     */
    static String toModuleId(String nodePath) {
        String[] segments = StringUtils.split(nodePath, '/');
        if (segments.length < 2 || !MODULES_SEGMENT.equals(segments[0])) {
            return null;
        }
        return segments[1];
    }
}
