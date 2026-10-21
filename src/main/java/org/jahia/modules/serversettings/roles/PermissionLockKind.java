package org.jahia.modules.serversettings.roles;

/**
 * What holds a permission granted beyond the target's own permission names.
 * <p>
 * The type is top level and not nested, for the reason {@link WriteOutcome} states.
 */
public enum PermissionLockKind {

    /**
     * An ancestor permission is granted on this target, and this permission is one of its aggregates.
     * Removing this permission expands that ancestor, which frees the row.
     */
    IMPLIED_BY_PERMISSION,

    /**
     * A parent role grants it. A sub-role adds to its parent and can never subtract from it, so no
     * edit on this role frees the row.
     */
    INHERITED_FROM_ROLE
}
