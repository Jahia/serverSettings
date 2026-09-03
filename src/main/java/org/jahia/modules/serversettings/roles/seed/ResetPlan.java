package org.jahia.modules.serversettings.roles.seed;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.SortedSet;
import java.util.TreeSet;
import java.util.stream.Collectors;

import org.jahia.modules.serversettings.roles.PermissionCatalog;
import org.jahia.modules.serversettings.roles.RoleGrant;
import org.jahia.modules.serversettings.roles.RoleView;

/**
 * What resetting one role to the declared baseline would change.
 * <p>
 * The plan is measured by comparing the live role with the baseline, and it is measured before
 * anything is written so the difference can be shown and refused. A reset is not an undo: the
 * baseline is what a fresh instance would hold, not the state the role had before somebody edited
 * it, so an administrator has to see what goes as well as what comes back.
 */
public final class ResetPlan {

    private final String roleName;
    private final boolean roleExists;
    private final RoleSeed seed;
    private final List<TargetResetDiff> targets = new ArrayList<>();
    private final List<String> unreadableSources;
    private String roleGroupChange;
    private boolean roleGroupCleared;
    private String privilegedAccessChange;
    private String hiddenChange;
    private final SortedSet<String> nodeTypesAdded = new TreeSet<>();
    private final SortedSet<String> nodeTypesRemoved = new TreeSet<>();
    private final SortedSet<String> textLanguagesChanged = new TreeSet<>();

    private ResetPlan(String roleName, boolean roleExists, RoleSeed seed, List<String> unreadableSources) {
        this.roleName = roleName;
        this.roleExists = roleExists;
        this.seed = seed;
        this.unreadableSources = unreadableSources;
    }

    /**
     * Measures the reset of one role.
     *
     * @param role    the live role, or null when the repository no longer has it
     * @param seed    the declared baseline, or null when no installed source declares the role
     * @param catalog the permission catalog, which resolves a name to the permissions it reaches
     */
    public static ResetPlan measure(String roleName, RoleView role, RoleSeed seed, PermissionCatalog catalog,
                                    List<String> unreadableSources) {
        ResetPlan plan = new ResetPlan(roleName, role != null, seed, unreadableSources);
        if (seed == null) {
            return plan;
        }

        plan.measureIdentity(role, seed);

        // The role's own node first, then every target either side names. A target is matched by node
        // name, because that is what role inheritance matches on.
        plan.measureTarget(RoleGrant.CURRENT_NODE_ID, null,
                role == null ? null : role.getGrant(RoleGrant.CURRENT_NODE_ID),
                seed.getPermissionNames(), catalog, TargetKind.DECLARED_AND_LIVE);

        for (SeedTarget target : seed.getTargets()) {
            RoleGrant live = role == null ? null : role.getGrant(target.getNodeName());
            plan.measureTarget(target.getNodeName(), target.getPath(), live, target.getPermissionNames(), catalog,
                    live == null ? TargetKind.DECLARED_ONLY : TargetKind.DECLARED_AND_LIVE);
        }

        if (role != null) {
            role.getGrants().stream()
                    .filter(grant -> !RoleGrant.CURRENT_NODE_ID.equals(grant.getId()))
                    .filter(grant -> seed.getTarget(grant.getId()) == null)
                    .forEach(grant -> plan.targets.add(
                            new TargetResetDiff(grant.getId(), grant.getPath(), TargetKind.LIVE_ONLY)));
        }
        return plan;
    }

    /**
     * What the reset writes on the role's own properties and text.
     * <p>
     * A source silent on a property declares no value for it, so the reset removes the property and
     * the node type's default applies. The plan therefore compares the live value with the value the
     * reset produces, and a clear is a change like any other. Reporting only the properties a source
     * states would leave an administrator's own {@code j:privilegedAccess} out of the preview and
     * still remove it.
     */
    private void measureIdentity(RoleView role, RoleSeed declared) {
        if (role == null) {
            return;
        }

        String declaredRoleGroup = declared.getRoleGroup();
        if (!Objects.equals(declaredRoleGroup, role.getRoleGroup())) {
            roleGroupChange = declaredRoleGroup;
            roleGroupCleared = declaredRoleGroup == null;
        }

        boolean declaredPrivileged = Boolean.TRUE.equals(declared.getPrivilegedAccess());
        if (declaredPrivileged != role.isPrivilegedAccess()) {
            privilegedAccessChange = String.valueOf(declaredPrivileged);
        }

        boolean declaredHidden = Boolean.TRUE.equals(declared.getHidden());
        if (declaredHidden != role.isHidden()) {
            hiddenChange = String.valueOf(declaredHidden);
        }

        if (!declared.getNodeTypes().isEmpty() || !role.getNodeTypes().isEmpty()) {
            nodeTypesAdded.addAll(declared.getNodeTypes());
            nodeTypesAdded.removeAll(role.getNodeTypes());
            nodeTypesRemoved.addAll(role.getNodeTypes());
            nodeTypesRemoved.removeAll(declared.getNodeTypes());
        }

        measureText(role, declared);
    }

    /** The languages where the reset writes a title or a description the role does not already carry. */
    private void measureText(RoleView role, RoleSeed declared) {
        SortedSet<String> languages = new TreeSet<>(declared.getTitles().keySet());
        languages.addAll(declared.getDescriptions().keySet());
        for (String language : languages) {
            boolean sameTitle = Objects.equals(
                    declared.getTitles().get(language), role.getTitles().get(language));
            boolean sameDescription = Objects.equals(
                    declared.getDescriptions().get(language), role.getDescriptions().get(language));
            if (!sameTitle || !sameDescription) {
                textLanguagesChanged.add(language);
            }
        }
    }

    private void measureTarget(String id, String path, RoleGrant live, Collection<String> declared,
                               PermissionCatalog catalog, TargetKind kind) {
        SortedSet<String> before = new TreeSet<>(live == null ? Collections.emptySet() : live.getDirectPermissions());
        SortedSet<String> after = new TreeSet<>(declared);

        SortedSet<String> added = new TreeSet<>(after);
        added.removeAll(before);
        SortedSet<String> removed = new TreeSet<>(before);
        removed.removeAll(after);

        if (added.isEmpty() && removed.isEmpty() && kind != TargetKind.DECLARED_ONLY) {
            return;
        }

        SortedSet<String> beforeClosure = closureOf(before, catalog);
        SortedSet<String> afterClosure = closureOf(after, catalog);

        SortedSet<String> gained = new TreeSet<>(afterClosure);
        gained.removeAll(beforeClosure);
        SortedSet<String> lost = new TreeSet<>(beforeClosure);
        lost.removeAll(afterClosure);

        TargetResetDiff diff = new TargetResetDiff(id, path == null && live != null ? live.getPath() : path, kind);
        diff.record(added, removed, gained, lost);
        targets.add(diff);
    }

    /** Every permission a set of names reaches, the descendants of each name included. */
    private static SortedSet<String> closureOf(Collection<String> names, PermissionCatalog catalog) {
        SortedSet<String> closure = new TreeSet<>();
        for (String name : names) {
            closure.add(name);
            closure.addAll(catalog.getDescendantNames(name));
        }
        return closure;
    }

    public String getRoleName() {
        return roleName;
    }

    /** False when the repository no longer has the role, in which case the reset creates it. */
    public boolean isRoleExists() {
        return roleExists;
    }

    /** False when no installed source declares this role, so there is no baseline to reset to. */
    public boolean isApplicable() {
        return seed != null;
    }

    /** True when the role already matches the baseline, so the reset would write nothing. */
    public boolean isNoop() {
        return seed != null && roleExists && targets.stream().allMatch(TargetResetDiff::isEmpty)
                && roleGroupChange == null && !roleGroupCleared
                && privilegedAccessChange == null && hiddenChange == null
                && nodeTypesAdded.isEmpty() && nodeTypesRemoved.isEmpty()
                && textLanguagesChanged.isEmpty();
    }

    /** The sources that declare this role, so a reader can see whose baseline this is. */
    public List<String> getSourceLabels() {
        return seed == null ? Collections.emptyList() :
                seed.getSources().stream().map(RoleSeedSource::getLabel).collect(Collectors.toList());
    }

    /**
     * The sources that could not be read at all. The baseline is incomplete while this is not empty,
     * so a reset could remove a permission that an unread source in fact declares.
     */
    public List<String> getUnreadableSources() {
        return Collections.unmodifiableList(unreadableSources);
    }

    public List<TargetResetDiff> getTargets() {
        return Collections.unmodifiableList(targets);
    }

    /** True when the reset makes the role grant something it does not grant today. */
    public boolean isWidening() {
        return targets.stream().anyMatch(diff -> !diff.getGainedPermissions().isEmpty());
    }

    /** Every permission the role starts granting, across all of its targets. */
    public SortedSet<String> getGainedPermissions() {
        SortedSet<String> all = new TreeSet<>();
        targets.forEach(diff -> all.addAll(diff.getGainedPermissions()));
        return all;
    }

    /** Every permission the role stops granting, across all of its targets. */
    public SortedSet<String> getLostPermissions() {
        SortedSet<String> all = new TreeSet<>();
        targets.forEach(diff -> all.addAll(diff.getLostPermissions()));
        return all;
    }

    /**
     * The role group the reset writes, or null when it does not change AND when it is removed. Read
     * {@link #isRoleGroupCleared()} to tell the two nulls apart.
     */
    public String getRoleGroupChange() {
        return roleGroupChange;
    }

    /** True when no source declares a role group, so the reset removes the one the role carries. */
    public boolean isRoleGroupCleared() {
        return roleGroupCleared;
    }

    /** The privileged access the reset writes, or null when it does not change. */
    public String getPrivilegedAccessChange() {
        return privilegedAccessChange;
    }

    /** The hidden flag the reset writes, or null when it does not change. */
    public String getHiddenChange() {
        return hiddenChange;
    }

    public SortedSet<String> getNodeTypesAdded() {
        return Collections.unmodifiableSortedSet(nodeTypesAdded);
    }

    public SortedSet<String> getNodeTypesRemoved() {
        return Collections.unmodifiableSortedSet(nodeTypesRemoved);
    }

    /** The languages where the reset writes a title or a description, sorted. */
    public SortedSet<String> getTextLanguagesChanged() {
        return Collections.unmodifiableSortedSet(textLanguagesChanged);
    }

    /** The baseline this plan measures against. */
    public RoleSeed getSeed() {
        return seed;
    }
}
