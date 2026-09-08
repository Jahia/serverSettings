package org.jahia.modules.serversettings.roles;

import org.apache.commons.lang.StringUtils;
import org.jahia.api.Constants;

/**
 * The workspace a permission covers, read from its name suffix.
 * <p>
 * Jahia has no property for this. {@code AccessManagerUtils.checkPrivilege} treats the
 * {@code _live} and {@code _default} suffixes as the workspace marker, so {@code jcr:read_live} and
 * {@code jcr:read_default} are two permissions and the suffix is the only thing that separates them.
 */
public enum PermissionWorkspace {

    /** The permission covers the default workspace, where editors work. */
    EDIT,

    /** The permission covers the live workspace, where visitors read. */
    LIVE,

    /** The permission carries no workspace suffix, so it covers neither workspace in particular. */
    NONE;

    private static final String LIVE_SUFFIX = "_" + Constants.LIVE_WORKSPACE;
    private static final String EDIT_SUFFIX = "_" + Constants.EDIT_WORKSPACE;

    /**
     * The workspace the given permission name declares.
     *
     * @param permissionName a permission node name, such as {@code jcr:read_live}
     * @return the workspace, never null
     */
    public static PermissionWorkspace of(String permissionName) {
        if (StringUtils.endsWith(permissionName, LIVE_SUFFIX)) {
            return LIVE;
        }
        if (StringUtils.endsWith(permissionName, EDIT_SUFFIX)) {
            return EDIT;
        }
        return NONE;
    }
}
