package org.jahia.modules.serversettings.roles;

/**
 * Where the permissions of one grant apply.
 * <p>
 * A role always grants its {@code j:permissionNames} on the node that carries the grant. A
 * {@code jnt:externalPermissions} child of the role grants its own permission names somewhere else, and
 * {@code AclListener.getRefAclNode} resolves that {@code j:path} when the role is granted.
 */
public enum GrantTargetKind {

    /** The node the role is granted on. This is the role's own {@code j:permissionNames}. */
    CURRENT_NODE,

    /**
     * The site of the node the role is granted on. The {@code j:path} value opens with
     * {@code currentSite}, which core replaces with the resolved site path.
     */
    CURRENT_SITE,

    /** A fixed path, such as {@code /modules} or {@code /}. The {@code j:path} value is used as it is. */
    ABSOLUTE_PATH;

    private static final String CURRENT_SITE_PREFIX = "currentSite";

    /**
     * The kind the given {@code j:path} value declares.
     *
     * @param path the {@code j:path} value of a {@code jnt:externalPermissions} node
     * @return {@link #CURRENT_SITE} when the value opens with {@code currentSite}, else
     *         {@link #ABSOLUTE_PATH}
     */
    public static GrantTargetKind ofExternalPath(String path) {
        return path != null && path.startsWith(CURRENT_SITE_PREFIX) ? CURRENT_SITE : ABSOLUTE_PATH;
    }
}
