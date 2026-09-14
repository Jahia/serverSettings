package org.jahia.modules.serversettings.roles;

/**
 * What removing one permission from one target of one role costs.
 * <p>
 * The type is top level and not nested, for the reason {@link WriteOutcome} states.
 */
public enum RevokeOutcome {

    /** The target names the permission, nothing else holds it, and it aggregates nothing. */
    IMMEDIATE,

    /** The target names the permission, and removing it removes what it aggregates. */
    CASCADES,

    /**
     * A granted ancestor permission holds it. The write replaces that grant with explicit grants
     * along the way down, at every level between the two.
     */
    EXPANDS_ANCESTORS,

    /**
     * A parent role grants it, so no write on this role removes it. A redundant name on this target
     * is still removed, and the permission stays granted.
     */
    BLOCKED_BY_PARENT_ROLE,

    /** The role does not grant the permission on this target, so there is nothing to remove. */
    NOT_GRANTED
}
