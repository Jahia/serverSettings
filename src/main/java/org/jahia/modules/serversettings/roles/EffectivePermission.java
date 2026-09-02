package org.jahia.modules.serversettings.roles;

/**
 * Why one permission is granted on one target of one role.
 * <p>
 * The answer is two independent facts, and not one state. A permission can be named by the target and
 * be held granted by something the administrator cannot edit here, both at once.
 * <ul>
 * <li>{@link #isDirect()} says the target's own {@code j:permissionNames} names it. Clearing the row
 * edits that property, so this is the fact the checkbox writes.</li>
 * <li>{@link #getLockKind()} says what keeps the permission granted when the target stops naming it.
 * It is null when nothing does, so the row is free.</li>
 * </ul>
 * A single state would have to choose between the two, and would then let the interface show a
 * clearable checkbox on a permission that clearing does not remove.
 */
public final class EffectivePermission {

    /** What holds a permission granted beyond the target's own permission names. */
    public enum LockKind {

        /**
         * An ancestor permission is granted on this target, and this permission is one of its
         * aggregates. Narrowing the ancestor makes the row free.
         */
        IMPLIED_BY_PERMISSION,

        /**
         * A parent role grants it. A sub-role adds to its parent and can never subtract from it, so
         * no edit on this role frees the row.
         */
        INHERITED_FROM_ROLE
    }

    private final String name;
    private final boolean direct;
    private final boolean known;
    private final LockKind lockKind;
    private final String lockedBy;

    EffectivePermission(String name, boolean direct, boolean known, LockKind lockKind, String lockedBy) {
        this.name = name;
        this.direct = direct;
        this.known = known;
        this.lockKind = lockKind;
        this.lockedBy = lockedBy;
    }

    /** The permission name. */
    public String getName() {
        return name;
    }

    /** True when the target's own {@code j:permissionNames} names this permission. */
    public boolean isDirect() {
        return direct;
    }

    /**
     * True when the catalog declares this permission.
     * <p>
     * A target can name a permission no installed module declares, which grants nothing. The
     * interface shows it so an administrator can remove it, rather than dropping it silently.
     */
    public boolean isKnown() {
        return known;
    }

    /** What holds the permission granted beyond the target's own names, or null when nothing does. */
    public LockKind getLockKind() {
        return lockKind;
    }

    /**
     * The ancestor permission name for {@link LockKind#IMPLIED_BY_PERMISSION}, or the parent role name
     * for {@link LockKind#INHERITED_FROM_ROLE}. Null when the row is free.
     */
    public String getLockedBy() {
        return lockedBy;
    }
}
