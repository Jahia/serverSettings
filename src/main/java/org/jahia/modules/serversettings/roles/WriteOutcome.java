package org.jahia.modules.serversettings.roles;

/**
 * Whether a write to a target's permission set was applied.
 * <p>
 * The type is top level and not nested, because a GraphQL schema names an enum by its simple name. Two
 * nested enums both called {@code Outcome} would register as one type, and a value of the second one
 * would fail to serialise.
 */
public enum WriteOutcome {

    /** The write was applied, and the revision answered is the new one. */
    APPLIED,

    /**
     * The stored set moved since the read that produced the revision sent, so nothing was written.
     * The revision and the permissions answered are the ones the repository holds now.
     */
    REFUSED_STALE_REVISION,

    /**
     * The operation does not apply to this target, so nothing was written. A collapse onto a
     * permission whose direct children the target does not all name answers this.
     */
    NOT_APPLICABLE
}
