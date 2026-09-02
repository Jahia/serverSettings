package org.jahia.modules.serversettings.roles;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.TreeSet;

import javax.jcr.NodeIterator;
import javax.jcr.PathNotFoundException;
import javax.jcr.RepositoryException;
import javax.jcr.Value;
import javax.jcr.query.Query;

import org.jahia.api.Constants;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.JCRSessionFactory;
import org.jahia.services.content.JCRSessionWrapper;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.osgi.service.component.annotations.Component;
import org.osgi.service.component.annotations.Reference;

@Component(service = RolesAndPermissionsService.class, immediate = true)
public class RolesAndPermissionsServiceImpl implements RolesAndPermissionsService {

    private static final String ROLE_GROUP_PROPERTY = "j:roleGroup";
    private static final String IS_ABSTRACT_PROPERTY = "j:isAbstract";
    private static final String DEPENDENCIES_PROPERTY = "j:dependencies";
    private static final String PERMISSION_NAMES_PROPERTY = "j:permissionNames";
    private static final String NODE_TYPES_PROPERTY = "j:nodeTypes";
    private static final String HIDDEN_PROPERTY = "j:hidden";
    private static final String PRIVILEGED_ACCESS_PROPERTY = "j:privilegedAccess";
    private static final String EXTERNAL_PATH_PROPERTY = "j:path";

    private static final String EXTERNAL_PERMISSIONS_TYPE = "jnt:externalPermissions";

    // Every role lives under /roles, so the query needs no parameter and carries no caller input.
    private static final String ROLES_QUERY =
            "select * from [" + Constants.JAHIANT_ROLE + "] as role where isdescendantnode(role, '/roles')";

    // Permission nodes live in two places, so the query is unrestricted by path and the catalog decides
    // what each result means.
    private static final String PERMISSIONS_QUERY = "select * from [jnt:permission]";

    // A sort key above every logical path, so a node outside a permissions subtree sorts last.
    private static final String SORTS_LAST = "\uFFFF";

    @Reference
    private JahiaTemplateManagerService templateManagerService;

    private PermissionLabelResolver labelResolver;

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

    @Override
    public PermissionCatalog getPermissionCatalog() throws RepositoryException {
        JCRSessionWrapper session = currentSession();

        // Pass 1 reads every node once and keeps only what the catalog needs. The nodes are sorted by
        // logical path first, so a parent is always added before its children and the resulting entry
        // order is the tree order the interface renders.
        Map<String, JCRNodeWrapper> nodesByPath = new LinkedHashMap<>();
        NodeIterator permissions = query(PERMISSIONS_QUERY);
        while (permissions.hasNext()) {
            JCRNodeWrapper node = (JCRNodeWrapper) permissions.nextNode();
            nodesByPath.put(node.getPath(), node);
        }

        List<JCRNodeWrapper> sorted = new ArrayList<>(nodesByPath.values());
        sorted.sort(Comparator.comparing(node -> {
            String logicalPath = PermissionCatalog.toLogicalPath(node.getPath());
            // A node outside a permissions subtree sorts last, and the catalog then drops it.
            return logicalPath == null ? SORTS_LAST : logicalPath;
        }));

        PermissionCatalog catalog = new PermissionCatalog();
        Map<String, String> nameByIdentifier = new HashMap<>();
        Map<PermissionEntry, List<String>> dependencyIdentifiers = new LinkedHashMap<>();

        for (JCRNodeWrapper node : sorted) {
            PermissionEntry entry = catalog.addNode(node.getPath());
            if (entry == null) {
                continue;
            }
            nameByIdentifier.put(node.getIdentifier(), entry.getName());
            if (node.hasProperty(IS_ABSTRACT_PROPERTY) && node.getProperty(IS_ABSTRACT_PROPERTY).getBoolean()) {
                entry.markAbstract();
            }
            if (node.hasProperty(DEPENDENCIES_PROPERTY)) {
                List<String> identifiers = new ArrayList<>();
                for (Value value : node.getProperty(DEPENDENCIES_PROPERTY).getValues()) {
                    identifiers.add(value.getString());
                }
                dependencyIdentifiers.computeIfAbsent(entry, key -> new ArrayList<>()).addAll(identifiers);
            }
        }

        catalog.link();

        // Pass 2 turns each dependency reference into a permission name. j:dependencies is a weak
        // reference, so its value is an identifier and the map built in pass 1 resolves it without a
        // second read. A dangling reference resolves to nothing and is dropped, because a name the
        // instance does not declare cannot be granted either.
        dependencyIdentifiers.forEach((entry, identifiers) -> {
            List<String> names = new ArrayList<>();
            identifiers.stream().map(nameByIdentifier::get).filter(Objects::nonNull).forEach(names::add);
            entry.addDependencies(names);
        });

        catalog.orderAreas(readAreaOrder(session));
        return catalog;
    }

    @Override
    public RoleModel getRoleModel() throws RepositoryException {
        return getRoleModel(getPermissionCatalog());
    }

    @Override
    public RoleModel getRoleModel(PermissionCatalog catalog) throws RepositoryException {
        // The roles are read in path order, so a parent role is always added before the roles nested
        // inside it and the model needs no second ordering pass.
        List<JCRNodeWrapper> roles = new ArrayList<>();
        NodeIterator found = query(ROLES_QUERY);
        while (found.hasNext()) {
            roles.add((JCRNodeWrapper) found.nextNode());
        }
        roles.sort(Comparator.comparing(JCRNodeWrapper::getPath));

        RoleModel model = new RoleModel(catalog);
        Map<String, String> roleNameByIdentifier = new HashMap<>();
        Map<RoleView, List<String>> dependencyIdentifiers = new LinkedHashMap<>();

        for (JCRNodeWrapper node : roles) {
            JCRNodeWrapper parent = node.getParent();
            String parentRolePath = parent.isNodeType(Constants.JAHIANT_ROLE) ? parent.getPath() : null;

            RoleView role = new RoleView(node.getName(), node.getPath(), parentRolePath,
                    stringOrNull(node, ROLE_GROUP_PROPERTY),
                    booleanValue(node, HIDDEN_PROPERTY),
                    booleanValue(node, PRIVILEGED_ACCESS_PROPERTY));
            role.addNodeTypes(multipleValues(node, NODE_TYPES_PROPERTY));

            RoleGrant onCurrentNode = RoleGrant.onCurrentNode();
            onCurrentNode.addPermissions(multipleValues(node, PERMISSION_NAMES_PROPERTY));
            role.addGrant(onCurrentNode);

            NodeIterator children = node.getNodes();
            while (children.hasNext()) {
                JCRNodeWrapper child = (JCRNodeWrapper) children.nextNode();
                if (child.isNodeType(EXTERNAL_PERMISSIONS_TYPE)) {
                    RoleGrant external = RoleGrant.onExternalPath(child.getName(),
                            stringOrNull(child, EXTERNAL_PATH_PROPERTY));
                    external.addPermissions(multipleValues(child, PERMISSION_NAMES_PROPERTY));
                    role.addGrant(external);
                } else if (child.isNodeType(Constants.JAHIANT_TRANSLATION)) {
                    readTranslation(child, role);
                }
            }

            roleNameByIdentifier.put(node.getIdentifier(), role.getName());
            List<String> identifiers = multipleValues(node, DEPENDENCIES_PROPERTY);
            if (!identifiers.isEmpty()) {
                dependencyIdentifiers.put(role, identifiers);
            }
            model.add(role);
        }

        // j:dependencies is a weak reference to another role, so the value is an identifier. Every role
        // was read above, so the map resolves it without a second read.
        dependencyIdentifiers.forEach((role, identifiers) -> {
            List<String> names = new ArrayList<>();
            identifiers.stream().map(roleNameByIdentifier::get).filter(Objects::nonNull).forEach(names::add);
            role.addDependencies(names);
        });

        model.link();
        return model;
    }

    /**
     * Read one {@code jnt:translation} child into the role's titles and descriptions.
     * <p>
     * {@code jcr:title} and {@code jcr:description} are i18n on {@code jnt:role}, so their values live
     * on these children and not on the role node.
     */
    private void readTranslation(JCRNodeWrapper translation, RoleView role) throws RepositoryException {
        if (!translation.hasProperty(Constants.JCR_LANGUAGE)) {
            return;
        }
        String language = translation.getProperty(Constants.JCR_LANGUAGE).getString();
        String title = stringOrNull(translation, Constants.JCR_TITLE);
        if (title != null) {
            role.putTitle(language, title);
        }
        String description = stringOrNull(translation, Constants.JCR_DESCRIPTION);
        if (description != null) {
            role.putDescription(language, description);
        }
    }

    private static String stringOrNull(JCRNodeWrapper node, String propertyName) throws RepositoryException {
        return node.hasProperty(propertyName) ? node.getProperty(propertyName).getString() : null;
    }

    private static boolean booleanValue(JCRNodeWrapper node, String propertyName) throws RepositoryException {
        return node.hasProperty(propertyName) && node.getProperty(propertyName).getBoolean();
    }

    private static List<String> multipleValues(JCRNodeWrapper node, String propertyName)
            throws RepositoryException {
        if (!node.hasProperty(propertyName)) {
            return Collections.emptyList();
        }
        List<String> values = new ArrayList<>();
        for (Value value : node.getProperty(propertyName).getValues()) {
            values.add(value.getString());
        }
        return values;
    }

    /**
     * The child names of the {@code /permissions} node, in repository order.
     * <p>
     * Core seeds that order, and a module that declares a top-level permission adds to it at install
     * time. The order reads better than an alphabetical one, so the catalog follows it and sorts only
     * the areas no child of {@code /permissions} carries. A caller that cannot read
     * {@code /permissions} gets an empty list, and every area is then sorted.
     */
    private List<String> readAreaOrder(JCRSessionWrapper session) throws RepositoryException {
        List<String> order = new ArrayList<>();
        try {
            NodeIterator children = session.getNode(PermissionCatalog.PERMISSIONS_ROOT).getNodes();
            while (children.hasNext()) {
                order.add(children.nextNode().getName());
            }
        } catch (PathNotFoundException e) {
            return order;
        }
        return order;
    }

    private NodeIterator query(String statement) throws RepositoryException {
        return currentSession().getWorkspace().getQueryManager()
                .createQuery(statement, Query.JCR_SQL2)
                .execute().getNodes();
    }

    @Override
    public String getPermissionLabel(PermissionEntry entry, Locale locale) {
        return labelResolver().getLabel(entry, locale);
    }

    @Override
    public String getPermissionDescription(PermissionEntry entry, Locale locale) {
        return labelResolver().getDescription(entry, locale);
    }

    // The resolver only needs the template manager service, which DS binds before the component
    // activates, so it is built on first use and reused.
    private PermissionLabelResolver labelResolver() {
        if (labelResolver == null) {
            labelResolver = new PermissionLabelResolver(templateManagerService);
        }
        return labelResolver;
    }

    private JCRSessionWrapper currentSession() throws RepositoryException {
        return JCRSessionFactory.getInstance().getCurrentUserSession(Constants.EDIT_WORKSPACE);
    }
}
