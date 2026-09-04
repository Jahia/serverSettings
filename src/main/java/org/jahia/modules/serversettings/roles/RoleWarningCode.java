package org.jahia.modules.serversettings.roles;

/**
 * What a role warning is about.
 * <p>
 * The type is top level and not nested, for the reason {@link WriteOutcome} states.
 */
public enum RoleWarningCode {

    /**
     * Two targets of one role carry the same {@code j:path}. Both create an access control entry on
     * the same node, and what applies there is the union of the two.
     */
    DUPLICATE_TARGET_PATH,

    /**
     * A role and an ancestor role both declare a target of the same name, with a different
     * {@code j:path}. Role inheritance matches a target by name, so the permissions of both apply.
     * {@code AclListener} iterates the role before its ancestors, so the role's own path is the one
     * the access control entry keeps, and the ancestor's path applies to nothing.
     */
    SHADOWED_TARGET_PATH,

    /**
     * A target names a permission no installed module declares. It grants nothing, and it stays in
     * {@code j:permissionNames} until an administrator removes it.
     */
    UNKNOWN_PERMISSION
}
