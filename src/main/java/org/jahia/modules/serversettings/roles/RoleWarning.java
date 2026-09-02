package org.jahia.modules.serversettings.roles;

/**
 * Something about a role an administrator should know, which the repository allows and the runtime
 * resolves in a way no screen can guess.
 * <p>
 * A warning is a fact and not a policy. Each one names the value it is about, so the interface can
 * point at it rather than describe it.
 */
public final class RoleWarning {

    /** What the warning is about. */
    public enum Code {

        /**
         * Two targets of this role carry the same {@code j:path}. Both create an access control entry
         * on the same node, and the permissions that apply there are the union of the two.
         */
        DUPLICATE_TARGET_PATH,

        /**
         * This role and an ancestor role both declare a target of the same name, with a different
         * {@code j:path}. Role inheritance matches a target by name, so the permissions of both apply.
         * {@code AclListener} iterates the role before its ancestors, so this role's path is the one
         * the access control entry keeps, and the ancestor's path applies to nothing.
         */
        SHADOWED_TARGET_PATH,

        /**
         * A target of this role names a permission no installed module declares. It grants nothing, and
         * it stays in {@code j:permissionNames} until an administrator removes it.
         */
        UNKNOWN_PERMISSION
    }

    private final Code code;
    private final String subject;

    RoleWarning(Code code, String subject) {
        this.code = code;
        this.subject = subject;
    }

    /** What the warning is about. */
    public Code getCode() {
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
