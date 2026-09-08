package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * What removing one permission from one target of one role would do.
 * <p>
 * A removal is not always a removal. A granted ancestor permission has to be replaced by explicit
 * grants on the children of every permission between it and the one being removed, and one level of
 * that is not enough. So the plan states the whole effect before anything is written, and the
 * interface shows it whenever the effect exceeds the row the administrator clicked.
 */
public final class RevokePlan {

    private final RevokeOutcome outcome;
    private final List<String> addedPermissions;
    private final List<String> removedPermissions;
    private final List<String> lostPermissions;
    private final String blockedBy;
    private final List<String> resultingPermissions;

    RevokePlan(RevokeOutcome outcome, Collection<String> addedPermissions, Collection<String> removedPermissions,
               Collection<String> lostPermissions, String blockedBy, Collection<String> resultingPermissions) {
        this.outcome = outcome;
        this.addedPermissions = new ArrayList<>(addedPermissions);
        this.removedPermissions = new ArrayList<>(removedPermissions);
        this.lostPermissions = new ArrayList<>(lostPermissions);
        this.blockedBy = blockedBy;
        this.resultingPermissions = new ArrayList<>(resultingPermissions);
    }

    /** What the removal costs. */
    public RevokeOutcome getOutcome() {
        return outcome;
    }

    /** The names the write adds to the target, sorted. These are the siblings along the way down. */
    public List<String> getAddedPermissions() {
        return Collections.unmodifiableList(addedPermissions);
    }

    /** The names the write removes from the target, sorted. */
    public List<String> getRemovedPermissions() {
        return Collections.unmodifiableList(removedPermissions);
    }

    /**
     * Every permission the role stops granting on this target, sorted.
     * <p>
     * This is the answer to "what do I lose", and it is measured rather than derived: the effective
     * set is computed again from the set the write would store, and the difference is this list. So
     * it counts the permission itself and everything it aggregated.
     */
    public List<String> getLostPermissions() {
        return Collections.unmodifiableList(lostPermissions);
    }

    /** The role that grants the permission when no write here removes it, or null. */
    public String getBlockedBy() {
        return blockedBy;
    }

    /** The whole set the write would store in {@code j:permissionNames}, sorted. */
    public List<String> getResultingPermissions() {
        return Collections.unmodifiableList(resultingPermissions);
    }
}
