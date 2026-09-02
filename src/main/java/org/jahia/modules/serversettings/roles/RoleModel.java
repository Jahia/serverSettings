package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.SortedMap;
import java.util.TreeMap;

/**
 * Every role of the instance, and what each one effectively grants.
 * <p>
 * The model computes what {@code AccessManagerUtils.getPrivileges} computes at runtime, and it takes
 * two rules from that method. A sub-role adds the permissions of its parent role, and it adds them per
 * target NAME rather than per target path. A permission granted on a target also grants every
 * permission the catalog says it aggregates.
 * <p>
 * {@code AclListener.handleAclModifications} walks the same parent chain when it creates the external
 * access control entries. So a sub-role that declares no target of a given name still grants what its
 * ancestor's target of that name grants, and {@link #getGrantIds(String)} therefore unions the chain.
 * <p>
 * Every chain walk goes by JCR path. A role is addressed by name because that is what an access
 * control entry holds, but {@code /roles/x/x} is a legal path, and a walk by name would read the
 * inner role as its own parent and never terminate.
 */
public final class RoleModel {

    private final Map<String, RoleView> byPath = new LinkedHashMap<>();
    private final Map<String, RoleView> byName = new LinkedHashMap<>();
    private final Map<String, Set<String>> pathsByName = new LinkedHashMap<>();
    private final PermissionCatalog catalog;

    // One entry per role path and target, so a parent chain is walked once however many children read it.
    private final Map<String, List<EffectivePermission>> effectiveCache = new LinkedHashMap<>();

    RoleModel(PermissionCatalog catalog) {
        this.catalog = catalog;
    }

    /** Every role, in path order so a parent precedes the roles nested inside it. */
    public Collection<RoleView> getRoles() {
        return Collections.unmodifiableCollection(byPath.values());
    }

    /**
     * The role of that name, or null when the instance has none.
     * <p>
     * A name at two paths resolves to the one whose path sorts first. Core resolves the same name with
     * a query and takes the first result, which no order is defined for, so the ambiguity is reported
     * by {@link #getAmbiguousRoleNames()} rather than resolved differently here.
     */
    public RoleView get(String roleName) {
        return byName.get(roleName);
    }

    /**
     * The names carried by more than one role node, sorted.
     * <p>
     * An access control entry holds a role NAME, and core resolves it with a query that takes the
     * first result. So two role nodes of one name make which permissions apply undefined, and the
     * interface reports the name instead of hiding one of the two nodes.
     *
     * @return the ambiguous names, empty on a consistent instance
     */
    public List<String> getAmbiguousRoleNames() {
        List<String> ambiguous = new ArrayList<>();
        pathsByName.forEach((name, paths) -> {
            if (paths.size() > 1) {
                ambiguous.add(name);
            }
        });
        Collections.sort(ambiguous);
        return ambiguous;
    }

    /**
     * Every target the given role grants on, including the ones only an ancestor role declares.
     *
     * @param roleName the role
     * @return the target identities, the node the role is granted on first, then the external names
     *         sorted
     */
    public List<String> getGrantIds(String roleName) {
        Set<String> external = new LinkedHashSet<>();
        for (RoleView role : chainOf(roleName)) {
            role.getGrants().stream()
                    .filter(grant -> !RoleGrant.CURRENT_NODE_ID.equals(grant.getId()))
                    .forEach(grant -> external.add(grant.getId()));
        }
        List<String> sortedExternal = new ArrayList<>(external);
        Collections.sort(sortedExternal);

        List<String> ids = new ArrayList<>(sortedExternal.size() + 1);
        ids.add(RoleGrant.CURRENT_NODE_ID);
        ids.addAll(sortedExternal);
        return ids;
    }

    /**
     * The target of the given identity that decides where the permissions apply.
     * <p>
     * The role's own target wins over an ancestor's target of the same name, because
     * {@code AclListener} iterates the role before its ancestors and the first access control entry it
     * creates keeps its path.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @return the deciding target, or null when neither the role nor an ancestor declares it
     */
    public RoleGrant getDecidingGrant(String roleName, String grantId) {
        for (RoleView role : chainOf(roleName)) {
            RoleGrant grant = role.getGrant(grantId);
            if (grant != null) {
                return grant;
            }
        }
        return null;
    }

    /**
     * True when the role or any ancestor role sets {@code j:privilegedAccess}.
     * <p>
     * {@code AclListener.handleAclModifications} reads that property on the role and on each ancestor,
     * so a sub-role of a privileged role is privileged whatever its own property says.
     *
     * @param roleName the role
     * @return whether granting the role adds the principal to the site privileged group
     */
    public boolean isEffectivelyPrivileged(String roleName) {
        return chainOf(roleName).stream().anyMatch(RoleView::isPrivilegedAccess);
    }

    /**
     * What the given role effectively grants on the given target.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @return one entry per granted permission, sorted by permission name
     */
    public List<EffectivePermission> getEffectivePermissions(String roleName, String grantId) {
        RoleView role = get(roleName);
        return role == null ? Collections.emptyList() : effectiveOf(role, grantId);
    }

    private List<EffectivePermission> effectiveOf(RoleView role, String grantId) {
        String cacheKey = role.getPath() + '\n' + grantId;
        List<EffectivePermission> cached = effectiveCache.get(cacheKey);
        if (cached != null) {
            return cached;
        }

        // A mutable accumulator per permission name, so a later pass can replace an earlier reason.
        SortedMap<String, Reason> reasons = new TreeMap<>();

        // The parent role goes first, so anything this role adds afterwards overrides the reason.
        RoleView parent = byPath.get(role.getParentRolePath());
        if (parent != null) {
            for (EffectivePermission inherited : effectiveOf(parent, grantId)) {
                reasons.put(inherited.getName(),
                        Reason.locked(EffectivePermission.LockKind.INHERITED_FROM_ROLE, parent.getName(),
                                inherited.isKnown()));
            }
        }

        RoleGrant own = role.getGrant(grantId);
        if (own != null) {
            for (String granted : own.getDirectPermissions()) {
                boolean known = catalog.contains(granted);
                // The row is direct here. Any lock an ancestor role put on it stays, because clearing
                // this name does not remove what the parent role grants.
                reasons.put(granted, Reason.direct(known, reasons.get(granted)));

                if (!known) {
                    continue;
                }
                for (String descendant : catalog.getDescendantNames(granted)) {
                    Reason current = reasons.get(descendant);
                    if (current != null && current.direct) {
                        // A permission named by this target stays direct, and its own lock is kept.
                        continue;
                    }
                    if (current != null && current.lockKind == EffectivePermission.LockKind.INHERITED_FROM_ROLE) {
                        // A parent role already holds it, and that lock is the one no local edit frees.
                        continue;
                    }
                    reasons.put(descendant,
                            Reason.locked(EffectivePermission.LockKind.IMPLIED_BY_PERMISSION, granted, true));
                }
            }
        }

        List<EffectivePermission> effective = new ArrayList<>(reasons.size());
        reasons.forEach((name, reason) -> effective.add(
                new EffectivePermission(name, reason.direct, reason.known, reason.lockKind, reason.lockedBy)));

        List<EffectivePermission> result = Collections.unmodifiableList(effective);
        effectiveCache.put(cacheKey, result);
        return result;
    }

    /**
     * Where each permission is granted, across every role and every target.
     *
     * @return the usages by permission name, sorted by name. A permission no role grants is absent
     */
    public SortedMap<String, List<PermissionUsage>> getUsagesByPermission() {
        SortedMap<String, List<PermissionUsage>> usages = new TreeMap<>();
        for (RoleView role : byPath.values()) {
            for (String grantId : getGrantIds(role.getName())) {
                RoleGrant target = getDecidingGrant(role.getName(), grantId);
                GrantTargetKind kind = target == null ? GrantTargetKind.CURRENT_NODE : target.getKind();
                String path = target == null ? null : target.getPath();
                for (EffectivePermission effective : effectiveOf(role, grantId)) {
                    usages.computeIfAbsent(effective.getName(), key -> new ArrayList<>())
                            .add(new PermissionUsage(role.getName(), grantId, kind, path, effective));
                }
            }
        }
        return usages;
    }

    /**
     * The role the given role adds to, or null when it sits directly under {@code /roles}.
     *
     * @param role a role of this model
     * @return the parent role, resolved by path
     */
    public RoleView getParentOf(RoleView role) {
        return byPath.get(role.getParentRolePath());
    }

    /** The role and every ancestor role, nearest first. */
    private List<RoleView> chainOf(String roleName) {
        List<RoleView> chain = new ArrayList<>();
        for (RoleView role = get(roleName); role != null; role = byPath.get(role.getParentRolePath())) {
            chain.add(role);
        }
        return chain;
    }

    void add(RoleView role) {
        byPath.put(role.getPath(), role);
        // The roles arrive in path order, so the first node of a name is the one whose path sorts first.
        byName.putIfAbsent(role.getName(), role);
        pathsByName.computeIfAbsent(role.getName(), key -> new LinkedHashSet<>()).add(role.getPath());
    }

    /** Link every role to the sub-roles nested inside it, once every role was added. */
    void link() {
        for (RoleView role : byPath.values()) {
            RoleView parent = byPath.get(role.getParentRolePath());
            if (parent != null) {
                parent.addSubRoleName(role.getName());
            }
        }
    }

    /** The accumulator behind one permission while the reasons are still being decided. */
    private static final class Reason {
        private final boolean direct;
        private final boolean known;
        private final EffectivePermission.LockKind lockKind;
        private final String lockedBy;

        private Reason(boolean direct, boolean known, EffectivePermission.LockKind lockKind, String lockedBy) {
            this.direct = direct;
            this.known = known;
            this.lockKind = lockKind;
            this.lockedBy = lockedBy;
        }

        static Reason locked(EffectivePermission.LockKind lockKind, String lockedBy, boolean known) {
            return new Reason(false, known, lockKind, lockedBy);
        }

        static Reason direct(boolean known, Reason existing) {
            return new Reason(true, known,
                    existing == null ? null : existing.lockKind,
                    existing == null ? null : existing.lockedBy);
        }
    }
}
