package org.jahia.modules.serversettings.roles.seed;

import java.util.Collection;
import java.util.Collections;
import java.util.SortedSet;
import java.util.TreeSet;

/** A target a seed declares on a role: the path it reaches, and the permissions it names there. */
public final class SeedTarget {

    private final String nodeName;
    private final String path;
    private final SortedSet<String> permissionNames = new TreeSet<>();

    SeedTarget(String nodeName, String path) {
        this.nodeName = nodeName;
        this.path = path;
    }

    /**
     * The node name of the target. Role inheritance matches a target by NAME and not by path, so the
     * name is the identity and the path is a property of it.
     */
    public String getNodeName() {
        return nodeName;
    }

    public String getPath() {
        return path;
    }

    public SortedSet<String> getPermissionNames() {
        return Collections.unmodifiableSortedSet(permissionNames);
    }

    void addPermissionNames(Collection<String> names) {
        permissionNames.addAll(names);
    }
}
