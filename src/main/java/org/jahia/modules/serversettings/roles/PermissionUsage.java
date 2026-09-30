package org.jahia.modules.serversettings.roles;

/**
 * One place a permission is granted: a role, one of its targets, and why the permission is granted
 * there.
 * <p>
 * This is the row of the reverse index, which answers "which role grants this permission" for the
 * permission explorer.
 */
public final class PermissionUsage {

    private final String roleName;
    private final String grantId;
    private final GrantTargetKind targetKind;
    private final String targetPath;
    private final EffectivePermission effective;

    PermissionUsage(String roleName, String grantId, GrantTargetKind targetKind, String targetPath,
                    EffectivePermission effective) {
        this.roleName = roleName;
        this.grantId = grantId;
        this.targetKind = targetKind;
        this.targetPath = targetPath;
        this.effective = effective;
    }

    /** The role that grants the permission. */
    public String getRoleName() {
        return roleName;
    }

    /** The target identity within that role. */
    public String getGrantId() {
        return grantId;
    }

    /** Where the permissions of that target apply. */
    public GrantTargetKind getTargetKind() {
        return targetKind;
    }

    /** The {@code j:path} value of the target, or null for the node the role is granted on. */
    public String getTargetPath() {
        return targetPath;
    }

    /** Whether the target names the permission, and what else holds it granted. */
    public EffectivePermission getEffective() {
        return effective;
    }
}
