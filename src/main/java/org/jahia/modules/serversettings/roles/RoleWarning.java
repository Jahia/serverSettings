package org.jahia.modules.serversettings.roles;

/**
 * Something about a role an administrator should know, which the repository allows and the runtime
 * resolves in a way no screen can guess.
 * <p>
 * A warning is a fact and not a policy. Each one names the value it is about, so the interface can
 * point at it rather than describe it.
 */
public final class RoleWarning {

    private final RoleWarningCode code;
    private final String subject;

    RoleWarning(RoleWarningCode code, String subject) {
        this.code = code;
        this.subject = subject;
    }

    /** What the warning is about. */
    public RoleWarningCode getCode() {
        return code;
    }

    /**
     * The value the warning names: a target path, a target name, or a permission name. The interface
     * reads the code to choose the wording, and the subject to point at the value.
     */
    public String getSubject() {
        return subject;
    }
}
