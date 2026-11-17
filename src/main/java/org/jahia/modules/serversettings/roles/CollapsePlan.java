package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * What replacing the grants on every direct child of one permission with one grant on the permission
 * itself would do.
 * <p>
 * A collapse is not a pure tidy-up. The target named the children and not the parent, so after the
 * collapse the role also grants the parent permission, which it did not grant before. That gain is
 * stated here rather than hidden, because a check on the parent permission would start passing.
 * <p>
 * The gain is the mirror of what a removal loses. Removing a permission under a granted ancestor
 * stops the role granting that ancestor, and collapsing back onto it starts again.
 */
public final class CollapsePlan {

    private final boolean applicable;
    private final List<String> addedPermissions;
    private final List<String> removedPermissions;
    private final List<String> gainedPermissions;
    private final List<String> resultingPermissions;

    CollapsePlan(boolean applicable, Collection<String> addedPermissions,
                 Collection<String> removedPermissions, Collection<String> gainedPermissions,
                 Collection<String> resultingPermissions) {
        this.applicable = applicable;
        this.addedPermissions = new ArrayList<>(addedPermissions);
        this.removedPermissions = new ArrayList<>(removedPermissions);
        this.gainedPermissions = new ArrayList<>(gainedPermissions);
        this.resultingPermissions = new ArrayList<>(resultingPermissions);
    }

    /**
     * True when the target names every direct child of the permission.
     * <p>
     * A collapse onto a permission whose children are not all named would grant more than the role
     * grants now, so it is not offered.
     */
    public boolean isApplicable() {
        return applicable;
    }

    /** The names the write adds to the target, which is the permission collapsed onto. */
    public List<String> getAddedPermissions() {
        return Collections.unmodifiableList(addedPermissions);
    }

    /** The names the write removes from the target, which are its direct children. */
    public List<String> getRemovedPermissions() {
        return Collections.unmodifiableList(removedPermissions);
    }

    /**
     * Every permission the role starts granting, sorted.
     * <p>
     * Measured the same way a removal measures its loss: the effective set is computed again from the
     * set the write would store, and the difference is this list. It holds the permission collapsed
     * onto, because the target named its children and not the permission itself.
     */
    public List<String> getGainedPermissions() {
        return Collections.unmodifiableList(gainedPermissions);
    }

    /** The whole set the write would store in {@code j:permissionNames}, sorted. */
    public List<String> getResultingPermissions() {
        return Collections.unmodifiableList(resultingPermissions);
    }
}
