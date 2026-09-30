package org.jahia.modules.serversettings.roles.seed;

/**
 * Where a declared baseline came from.
 * <p>
 * A role is rarely declared in one place. Jahia core seeds a role, and each module that needs more
 * from it re-declares it with the permissions it adds. So the baseline of a role is the union of its
 * contributors, and a reader has to be told which ones spoke for it.
 */
public final class RoleSeedSource {

    private final String id;
    private final String label;
    private final boolean core;

    private RoleSeedSource(String id, String label, boolean core) {
        this.id = id;
        this.label = label;
        this.core = core;
    }

    /**
     * The seed Jahia core installs when the repository is created.
     * <p>
     * Core does not re-import it on upgrade, and ships migration scripts instead, so an upgraded
     * instance can hold a role the seed no longer describes. The file shipped by the running version
     * is read, which is the baseline those scripts converge on.
     */
    public static RoleSeedSource core() {
        return new RoleSeedSource("jahia-core", "Jahia core", true);
    }

    /** The seed a module ships, read from the bundle currently installed. */
    public static RoleSeedSource module(String moduleId, String version) {
        return new RoleSeedSource(moduleId, moduleId + " " + version, false);
    }

    public String getId() {
        return id;
    }

    public String getLabel() {
        return label;
    }

    public boolean isCore() {
        return core;
    }

    @Override
    public String toString() {
        return label;
    }
}
