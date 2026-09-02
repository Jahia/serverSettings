package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.List;
import java.util.TreeSet;

import javax.jcr.NodeIterator;
import javax.jcr.RepositoryException;
import javax.jcr.query.Query;

import org.jahia.api.Constants;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.osgi.service.component.annotations.Component;

@Component(service = RolesAndPermissionsService.class, immediate = true)
public class RolesAndPermissionsServiceImpl implements RolesAndPermissionsService {

    private static final String ROLE_GROUP_PROPERTY = "j:roleGroup";

    // Every role lives under /roles, so the query needs no parameter and carries no caller input.
    private static final String ROLES_QUERY =
            "select * from [" + Constants.JAHIANT_ROLE + "] as role where isdescendantnode(role, '/roles')";

    @Override
    public List<String> getRoleGroups() throws RepositoryException {
        NodeIterator roles = query(ROLES_QUERY);

        // A TreeSet both deduplicates and sorts, and the role group of two roles is often the same value.
        TreeSet<String> groups = new TreeSet<>();
        while (roles.hasNext()) {
            JCRNodeWrapper role = (JCRNodeWrapper) roles.nextNode();
            if (role.hasProperty(ROLE_GROUP_PROPERTY)) {
                groups.add(role.getProperty(ROLE_GROUP_PROPERTY).getString());
            }
        }
        return new ArrayList<>(groups);
    }

    private NodeIterator query(String statement) throws RepositoryException {
        return currentSession().getWorkspace().getQueryManager()
                .createQuery(statement, Query.JCR_SQL2)
                .execute().getNodes();
    }

    private JCRSessionWrapper currentSession() throws RepositoryException {
        return JCRSessionFactory.getInstance().getCurrentUserSession(Constants.EDIT_WORKSPACE);
    }
}
