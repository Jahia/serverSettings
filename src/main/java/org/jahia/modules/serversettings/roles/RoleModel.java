package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.SortedMap;
import java.util.SortedSet;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.function.Predicate;

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
    /** The catalog this model resolved its permissions against. */
    public PermissionCatalog getCatalog() {
        return catalog;
    }

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
                        Reason.locked(PermissionLockKind.INHERITED_FROM_ROLE, parent.getName(),
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
                    if (current != null && current.lockKind == PermissionLockKind.INHERITED_FROM_ROLE) {
                        // A parent role already holds it, and that lock is the one no local edit frees.
                        continue;
                    }
                    reasons.put(descendant,
                            Reason.locked(PermissionLockKind.IMPLIED_BY_PERMISSION, granted, true));
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
     * The permission names the role's own targets hold, across every target.
     * <p>
     * This is what an administrator wrote on the role, and it is the only set an edit on this role
     * changes.
     *
     * @param roleName the role
     * @return the names, sorted
     */
    public SortedSet<String> getDirectPermissionNames(String roleName) {
        return collectNames(roleName, EffectivePermission::isDirect);
    }

    /**
     * Every permission the role grants, across every target.
     * <p>
     * This is the reach of the role, and it is larger than what it names, because a granted permission
     * grants what it aggregates and a sub-role adds what its parent grants.
     *
     * @param roleName the role
     * @return the names, sorted
     */
    public SortedSet<String> getEffectivePermissionNames(String roleName) {
        return collectNames(roleName, effective -> true);
    }

    /**
     * The permissions the role grants only because a parent role grants them.
     *
     * @param roleName the role
     * @return the names, sorted
     */
    public SortedSet<String> getInheritedPermissionNames(String roleName) {
        return collectNames(roleName,
                effective -> effective.getLockKind() == PermissionLockKind.INHERITED_FROM_ROLE);
    }

    /**
     * The permissions a target of the role names, and no installed module declares.
     * <p>
     * Such a name grants nothing. It stays in {@code j:permissionNames} until an administrator removes
     * it, so the interface shows it rather than dropping it.
     *
     * @param roleName the role
     * @return the names, sorted
     */
    public SortedSet<String> getUnknownPermissionNames(String roleName) {
        return collectNames(roleName, effective -> !effective.isKnown());
    }

    /**
     * What an administrator should know about the role, beyond what it grants.
     *
     * @param roleName the role
     * @return the warnings, empty on a role the repository resolves unambiguously
     */
    public List<RoleWarning> getWarnings(String roleName) {
        RoleView role = get(roleName);
        if (role == null) {
            return Collections.emptyList();
        }

        List<RoleWarning> warnings = new ArrayList<>();

        // Two targets of this role on one path both create an access control entry on that node, and
        // what applies there is the union of the two.
        Map<String, String> nameByPath = new LinkedHashMap<>();
        for (RoleGrant grant : role.getGrants()) {
            if (grant.getPath() == null) {
                continue;
            }
            String previous = nameByPath.putIfAbsent(grant.getPath(), grant.getNodeName());
            if (previous != null) {
                warnings.add(new RoleWarning(RoleWarningCode.DUPLICATE_TARGET_PATH, grant.getPath()));
            }
        }

        // A target this role and an ancestor both declare, on two different paths. Inheritance matches
        // the name, so both sets of permissions apply, and only this role's path is used.
        for (RoleGrant grant : role.getGrants()) {
            if (grant.getNodeName() == null) {
                continue;
            }
            for (RoleView ancestor : chainOf(roleName)) {
                if (ancestor == role) {
                    continue;
                }
                RoleGrant shadowed = ancestor.getGrant(grant.getId());
                if (shadowed != null && !Objects.equals(shadowed.getPath(), grant.getPath())) {
                    warnings.add(new RoleWarning(RoleWarningCode.SHADOWED_TARGET_PATH, grant.getNodeName()));
                    break;
                }
            }
        }

        getUnknownPermissionNames(roleName).forEach(
                name -> warnings.add(new RoleWarning(RoleWarningCode.UNKNOWN_PERMISSION, name)));

        return warnings;
    }

    /**
     * What removing one permission from one target of the role would do.
     * <p>
     * The effect is measured and not derived. The method builds the set the write would store, then
     * computes the effective set again from it, and the difference is what the role stops granting.
     * So the answer counts the permission itself and everything it aggregated, at any depth, without
     * a second traversal that could disagree with the first.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @param permissionName the permission to remove
     * @return the plan, never null
     */
    public RevokePlan planRevoke(String roleName, String grantId, String permissionName) {
        RoleView role = get(roleName);
        if (role == null) {
            return emptyPlan(RevokeOutcome.NOT_GRANTED);
        }

        EffectivePermission current = effectiveOf(role, grantId).stream()
                .filter(effective -> effective.getName().equals(permissionName))
                .findFirst().orElse(null);
        if (current == null) {
            return emptyPlan(RevokeOutcome.NOT_GRANTED);
        }

        RoleGrant own = role.getGrant(grantId);
        SortedSet<String> before = new TreeSet<>(own == null ? Collections.emptyList() : own.getDirectPermissions());
        SortedSet<String> after = new TreeSet<>(before);
        SortedSet<String> added = new TreeSet<>();
        SortedSet<String> removed = new TreeSet<>();

        // The target's own name for the permission goes, whatever else holds it. A redundant name is
        // worth removing even when the permission stays granted.
        if (after.remove(permissionName)) {
            removed.add(permissionName);
        }

        // Every granted ancestor has to be expanded, and not only the nearest one. Two granted
        // ancestors of one permission both hold it, so replacing one would leave it granted.
        for (String ancestor : catalog.getAncestorNames(permissionName)) {
            if (!before.contains(ancestor)) {
                continue;
            }
            after.remove(ancestor);
            removed.add(ancestor);
            // Walk back down from the ancestor to the permission, granting the siblings at each step.
            for (String step : pathDown(ancestor, permissionName)) {
                catalog.getChildNames(step).stream()
                        .filter(child -> !isOnPath(child, permissionName))
                        .forEach(child -> {
                            after.add(child);
                            added.add(child);
                        });
            }
        }

        SortedSet<String> lost = new TreeSet<>(closureOf(before));
        lost.removeAll(closureOf(after));

        RevokeOutcome outcome;
        String blockedBy = null;
        if (current.getLockKind() == PermissionLockKind.INHERITED_FROM_ROLE) {
            outcome = RevokeOutcome.BLOCKED_BY_PARENT_ROLE;
            blockedBy = current.getLockedBy();
        } else if (!added.isEmpty()) {
            outcome = RevokeOutcome.EXPANDS_ANCESTORS;
        } else if (lost.size() > 1) {
            outcome = RevokeOutcome.CASCADES;
        } else {
            outcome = RevokeOutcome.IMMEDIATE;
        }

        return new RevokePlan(outcome, added, removed, lost, blockedBy, after);
    }

    /**
     * The set a write would store to grant the given permissions on the given target.
     * <p>
     * A name an ancestor already grants is not added, because it would change nothing and would leave
     * a redundant name behind.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @param permissionNames the permissions to grant
     * @return the whole set to store, sorted
     */
    public SortedSet<String> planGrant(String roleName, String grantId, Collection<String> permissionNames) {
        RoleView role = get(roleName);
        RoleGrant own = role == null ? null : role.getGrant(grantId);
        SortedSet<String> result = new TreeSet<>(own == null ? Collections.emptyList() : own.getDirectPermissions());
        SortedSet<String> alreadyGranted = closureOf(result);

        permissionNames.stream()
                .filter(name -> !alreadyGranted.contains(name))
                .forEach(result::add);
        return result;
    }

    /**
     * What replacing the grants on every direct child of the given permission with one grant on the
     * permission itself would do.
     * <p>
     * The collapse grants the permission itself, which the target did not name. That gain is measured
     * and reported rather than refused, because refusing it would make the operation unreachable.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @param permissionName the permission to collapse onto
     * @return the plan, never null
     */
    public CollapsePlan planCollapse(String roleName, String grantId, String permissionName) {
        RoleView role = get(roleName);
        RoleGrant own = role == null ? null : role.getGrant(grantId);
        List<String> children = catalog.getChildNames(permissionName);
        SortedSet<String> current = new TreeSet<>(
                own == null ? Collections.emptyList() : own.getDirectPermissions());

        if (own == null || children.isEmpty() || !current.containsAll(children)) {
            List<String> none = Collections.emptyList();
            return new CollapsePlan(false, none, none, none, new ArrayList<>(current));
        }

        SortedSet<String> result = new TreeSet<>(current);
        children.forEach(result::remove);
        result.add(permissionName);

        SortedSet<String> gained = new TreeSet<>(closureOf(result));
        gained.removeAll(closureOf(current));

        return new CollapsePlan(true, Collections.singletonList(permissionName), children, gained, result);
    }

    /**
     * The permissions a target could collapse onto, sorted.
     * <p>
     * A permission is collapsable when the target names every one of its direct children. The
     * interface offers the operation on those, and never requires it.
     *
     * @param roleName the role
     * @param grantId the target identity
     * @return the parent names, empty when nothing can be collapsed
     */
    public List<String> getCollapsablePermissions(String roleName, String grantId) {
        RoleView role = get(roleName);
        RoleGrant own = role == null ? null : role.getGrant(grantId);
        if (own == null) {
            return Collections.emptyList();
        }

        SortedSet<String> named = new TreeSet<>(own.getDirectPermissions());
        SortedSet<String> parents = new TreeSet<>();
        for (String name : named) {
            String parent = catalog.getParentName(name);
            if (parent != null && !named.contains(parent) && named.containsAll(catalog.getChildNames(parent))) {
                parents.add(parent);
            }
        }
        return new ArrayList<>(parents);
    }

    /** Every permission the given set of names grants, itself included. */
    SortedSet<String> closureOf(Collection<String> directNames) {
        SortedSet<String> closure = new TreeSet<>();
        for (String name : directNames) {
            closure.add(name);
            closure.addAll(catalog.getDescendantNames(name));
        }
        return closure;
    }

    /** The permissions between the ancestor and the target, the ancestor first and the target left out. */
    private List<String> pathDown(String ancestor, String target) {
        List<String> upwards = new ArrayList<>();
        for (String name = catalog.getParentName(target); name != null; name = catalog.getParentName(name)) {
            upwards.add(name);
            if (name.equals(ancestor)) {
                break;
            }
        }
        Collections.reverse(upwards);
        return upwards;
    }

    /** True when the candidate is the target or aggregates it, so it must not be granted as a sibling. */
    private boolean isOnPath(String candidate, String target) {
        return candidate.equals(target) || catalog.getAncestorNames(target).contains(candidate);
    }

    private RevokePlan emptyPlan(RevokeOutcome outcome) {
        List<String> none = Collections.emptyList();
        return new RevokePlan(outcome, none, none, none, null, none);
    }

    private SortedSet<String> collectNames(String roleName, Predicate<EffectivePermission> keep) {
        SortedSet<String> names = new TreeSet<>();
        for (String grantId : getGrantIds(roleName)) {
            getEffectivePermissions(roleName, grantId).stream()
                    .filter(keep)
                    .map(EffectivePermission::getName)
                    .forEach(names::add);
        }
        return names;
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
        private final PermissionLockKind lockKind;
        private final String lockedBy;

        private Reason(boolean direct, boolean known, PermissionLockKind lockKind, String lockedBy) {
            this.direct = direct;
            this.known = known;
            this.lockKind = lockKind;
            this.lockedBy = lockedBy;
        }

        static Reason locked(PermissionLockKind lockKind, String lockedBy, boolean known) {
            return new Reason(false, known, lockKind, lockedBy);
        }

        static Reason direct(boolean known, Reason existing) {
            return new Reason(true, known,
                    existing == null ? null : existing.lockKind,
                    existing == null ? null : existing.lockedBy);
        }
    }
}
