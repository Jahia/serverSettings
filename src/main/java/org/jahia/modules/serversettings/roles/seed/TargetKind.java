package org.jahia.modules.serversettings.roles.seed;

/** How a target stands between the live role and the declared baseline. */
public enum TargetKind {

    /** Both the role and the sources have it, so the reset rewrites the permissions it names. */
    DECLARED_AND_LIVE,

    /** The sources declare it and the role no longer has it, so the reset creates it. */
    DECLARED_ONLY,

    /**
     * The role has it and no source declares it.
     * <p>
     * The reset leaves it alone. A target is a scope somebody chose to reach, and the sources never
     * spoke about this one, so a reset built from them has no baseline to restore here. The plan
     * reports it, and removing it stays the separate action it already is.
     */
    LIVE_ONLY
}
