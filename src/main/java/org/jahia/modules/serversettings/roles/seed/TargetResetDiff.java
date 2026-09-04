package org.jahia.modules.serversettings.roles.seed;

import java.util.Collections;
import java.util.SortedSet;
import java.util.TreeSet;

/**
 * What a reset changes on one target of a role.
 * <p>
 * The change is stated twice on purpose. The names are what the reset writes, and the effective
 * permissions are what the role then grants. The two differ because a granted permission grants its
 * descendants, so removing one name can remove fifty effective permissions and adding one umbrella
 * can add a hundred. A diff of names alone would hide exactly that.
 */
public final class TargetResetDiff {

    private final String id;
    private final String path;
    private final TargetKind kind;
    private final SortedSet<String> addedNames = new TreeSet<>();
    private final SortedSet<String> removedNames = new TreeSet<>();
    private final SortedSet<String> gainedPermissions = new TreeSet<>();
    private final SortedSet<String> lostPermissions = new TreeSet<>();

    TargetResetDiff(String id, String path, TargetKind kind) {
        this.id = id;
        this.path = path;
        this.kind = kind;
    }

    /** The target identifier, empty for the role's own node. */
    public String getId() {
        return id;
    }

    public String getPath() {
        return path;
    }

    public TargetKind getKind() {
        return kind;
    }

    /** The permission names the reset adds to this target. */
    public SortedSet<String> getAddedNames() {
        return Collections.unmodifiableSortedSet(addedNames);
    }

    /** The permission names the reset removes from this target. */
    public SortedSet<String> getRemovedNames() {
        return Collections.unmodifiableSortedSet(removedNames);
    }

    /** Every permission the role starts granting here, descendants of an added name included. */
    public SortedSet<String> getGainedPermissions() {
        return Collections.unmodifiableSortedSet(gainedPermissions);
    }

    /** Every permission the role stops granting here, descendants of a removed name included. */
    public SortedSet<String> getLostPermissions() {
        return Collections.unmodifiableSortedSet(lostPermissions);
    }

    public boolean isEmpty() {
        return addedNames.isEmpty() && removedNames.isEmpty();
    }

    void recordDiff(SortedSet<String> added, SortedSet<String> removed, SortedSet<String> gained,
                    SortedSet<String> lost) {
        addedNames.addAll(added);
        removedNames.addAll(removed);
        gainedPermissions.addAll(gained);
        lostPermissions.addAll(lost);
    }
}
