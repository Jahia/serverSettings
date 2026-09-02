package org.jahia.modules.serversettings.roles;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.SortedSet;
import java.util.TreeSet;

/**
 * One set of permissions a role grants, and where that set applies.
 * <p>
 * A role always has the grant on the node it is granted on, which is its own
 * {@code j:permissionNames}. Each {@code jnt:externalPermissions} child adds one more grant, with its
 * own {@code j:path} and its own permission names.
 * <p>
 * The identity used for role inheritance is {@link #getNodeName()} and not the path.
 * {@code AccessManagerUtils.getPrivileges} looks for a child node of the same NAME on each ancestor
 * role, so a sub-role inherits from a parent node of that name whatever path either one declares.
 */
public final class RoleGrant {

    /** The identity of the grant on the node the role is granted on, which has no node of its own. */
    public static final String CURRENT_NODE_ID = "";

    private final GrantTargetKind kind;
    private final String path;
    private final String nodeName;
    private final SortedSet<String> directPermissions = new TreeSet<>();

    private RoleGrant(GrantTargetKind kind, String path, String nodeName) {
        this.kind = kind;
        this.path = path;
        this.nodeName = nodeName;
    }

    /**
     * The grant on the node the role is granted on.
     *
     * @return a grant of kind {@link GrantTargetKind#CURRENT_NODE}
     */
    public static RoleGrant onCurrentNode() {
        return new RoleGrant(GrantTargetKind.CURRENT_NODE, null, null);
    }

    /**
     * The grant one {@code jnt:externalPermissions} node carries.
     *
     * @param nodeName the node name, which is what role inheritance matches on
     * @param path the {@code j:path} value
     * @return a grant of kind {@link GrantTargetKind#CURRENT_SITE} or
     *         {@link GrantTargetKind#ABSOLUTE_PATH}
     */
    public static RoleGrant onExternalPath(String nodeName, String path) {
        return new RoleGrant(GrantTargetKind.ofExternalPath(path), path, nodeName);
    }

    /** Where the permissions of this grant apply. */
    public GrantTargetKind getKind() {
        return kind;
    }

    /**
     * The {@code j:path} value, or null for the node the role is granted on. A
     * {@link GrantTargetKind#CURRENT_SITE} grant keeps the raw value, which opens with
     * {@code currentSite} and can carry a sub-path after it.
     */
    public String getPath() {
        return path;
    }

    /** The {@code jnt:externalPermissions} node name, or null for the node the role is granted on. */
    public String getNodeName() {
        return nodeName;
    }

    /**
     * The identity role inheritance matches on: the node name, or {@link #CURRENT_NODE_ID} for the node
     * the role is granted on.
     */
    public String getId() {
        return nodeName == null ? CURRENT_NODE_ID : nodeName;
    }

    /** The permission names this grant names, sorted. This is the {@code j:permissionNames} value. */
    public List<String> getDirectPermissions() {
        return Collections.unmodifiableList(new ArrayList<>(directPermissions));
    }

    /**
     * A value that changes whenever the permission set changes.
     * <p>
     * A write sends back the value a read returned, and the write is refused when the stored set moved
     * in between. The value is derived from the set itself, so it needs no property on the node and
     * stays correct across a node that was removed and created again.
     *
     * @return the hex SHA-256 of the sorted names, one per line
     */
    public String getRevision() {
        String canonical = String.join("\n", directPermissions);
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(canonical.getBytes(StandardCharsets.UTF_8));
            StringBuilder hex = new StringBuilder(digest.length * 2);
            for (byte b : digest) {
                hex.append(Character.forDigit((b >> 4) & 0xF, 16)).append(Character.forDigit(b & 0xF, 16));
            }
            return hex.toString();
        } catch (NoSuchAlgorithmException e) {
            // Every Java runtime provides SHA-256, so this cannot happen on a running Jahia.
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    void addPermissions(Collection<String> permissionNames) {
        directPermissions.addAll(permissionNames);
    }
}
