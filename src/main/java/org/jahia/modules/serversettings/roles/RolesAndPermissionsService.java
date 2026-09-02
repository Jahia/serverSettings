package org.jahia.modules.serversettings.roles;

import java.util.List;

import javax.jcr.RepositoryException;

/**
 * Read and write the role and permission model that Jahia evaluates at runtime.
 * <p>
 * Every method reads through the calling user's own JCR session. The GraphQL layer gates the whole
 * API on the {@code adminRoles} permission, and the JCR access control still applies underneath,
 * so a caller never reads a role node the repository would refuse them.
 */
public interface RolesAndPermissionsService {

    /**
     * The role group of every role in the repository, deduplicated and sorted.
     * <p>
     * A role group is the value of {@code j:roleGroup}. It is a free string in the node type
     * definition, so the answer is what the repository holds and not a fixed list.
     *
     * @return the distinct role group names, sorted, never null
     * @throws RepositoryException when the query fails
     */
    List<String> getRoleGroups() throws RepositoryException;
}
