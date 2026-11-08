package org.jahia.modules.serversettings.roles.graphql;

import java.util.List;

import graphql.annotations.annotationTypes.GraphQLDescription;
import graphql.annotations.annotationTypes.GraphQLField;
import graphql.annotations.annotationTypes.GraphQLName;
import graphql.annotations.annotationTypes.GraphQLNonNull;
import org.jahia.modules.serversettings.roles.WriteOutcome;
import org.jahia.modules.serversettings.roles.WriteResult;

@GraphQLName("RolePermissionWriteResult")
@GraphQLDescription("What a write to a target's permission set did")
public class GqlWriteResult {

    private final WriteResult result;

    GqlWriteResult(WriteResult result) {
        this.result = result;
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("APPLIED, or REFUSED_STALE_REVISION when the stored set moved since the read")
    public WriteOutcome getOutcome() {
        return result.getOutcome();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The revision the repository holds after the call, applied or refused. Send it "
            + "back on the next write")
    public String getRevision() {
        return result.getRevision();
    }

    @GraphQLField
    @GraphQLNonNull
    @GraphQLDescription("The permission set the repository holds after the call")
    public List<String> getPermissions() {
        return result.getPermissions();
    }
}
