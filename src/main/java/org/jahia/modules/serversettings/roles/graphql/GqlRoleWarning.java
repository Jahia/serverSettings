package org.jahia.modules.serversettings.roles.graphql;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.RoleWarningCode;
import org.jahia.modules.serversettings.roles.RoleWarning;

/**
 * Something about a role an administrator should know, which the repository allows and the runtime
 * resolves in a way no screen can guess.
 * <p>
 * The code says what the warning is, and the subject names the value it is about. The interface reads
 * the code to choose the wording, so the wording stays translatable.
 */
@GraphQLName("RoleWarning")
@GraphQLDescription("A fact about a role an administrator should know")
public class GqlRoleWarning {

    private final RoleWarning warning;

    GqlRoleWarning(RoleWarning warning) {
        this.warning = warning;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("What the warning is about")
    public RoleWarningCode getCode() {
        return warning.getCode();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The value the warning names: a target path, a target name or a permission name")
    public String getSubject() {
        return warning.getSubject();
    }
}
