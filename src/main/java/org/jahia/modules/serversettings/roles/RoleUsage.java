package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;

/**
 * Who currently holds a role.
 * <p>
 * This is what makes deleting a role dangerous. An access control entry holds a role NAME, and
 * deleting the role node does not delete those entries. They stay, naming a role the repository no
 * longer has, and they then grant nothing. Nobody is told, and the access simply goes.
 * <p>
 * So the interface reads this before it offers to delete, and states it.
 */
public final class RoleUsage {

    /** Above this many principals the list is cut, because a confirmation is read and not scrolled. */
    static final int PRINCIPAL_LIMIT = 20;

    private final int entryCount;
    private final List<String> principals;
    private final boolean truncated;

    RoleUsage(int entryCount, Collection<String> principals, boolean truncated) {
        this.entryCount = entryCount;
        this.principals = new ArrayList<>(principals);
        this.truncated = truncated;
    }

    /**
     * The count of access control entries that grant the role.
     * <p>
     * One principal can hold a role on several nodes, so this is at least the number of principals.
     */
    public int getEntryCount() {
        return entryCount;
    }

    /**
     * The principals that hold the role, sorted. A key opens with {@code u:} for a user and
     * {@code g:} for a group, which is the form an access control entry stores.
     */
    public List<String> getPrincipals() {
        return Collections.unmodifiableList(principals);
    }

    /** True when more principals hold the role than the list carries. */
    public boolean isTruncated() {
        return truncated;
    }

    /** True when nobody holds the role, so deleting it takes no access away. */
    public boolean isUnused() {
        return entryCount == 0;
    }
}
