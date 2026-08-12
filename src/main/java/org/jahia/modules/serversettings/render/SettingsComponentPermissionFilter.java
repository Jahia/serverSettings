package org.jahia.modules.serversettings.render;

import org.apache.commons.lang.StringUtils;
import org.jahia.services.content.JCRContentUtils;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.jahia.services.render.filter.RenderFilter;
import org.osgi.service.component.annotations.Activate;
import org.osgi.service.component.annotations.Component;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import javax.jcr.RepositoryException;
import javax.jcr.Value;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.regex.Pattern;

/**
 * Renders a settings component from the settings template that declares its access rule, and only for a
 * caller who holds that rule on the resource the request is made against.
 * <p>
 * The access rule of a settings screen is data: the {@code jnt:contentTemplate} that hosts the component
 * states it in {@code j:requiredPermissionNames} — {@code adminCache} for cache management,
 * {@code adminEmailSettings} for the mail server, and so on for each of this module's screens. This filter
 * reads the rule from there and applies it, so the module's template definitions remain the single place the
 * requirement is expressed and this filter has nothing to keep in step with them. That also keeps each
 * screen's own granularity: a screen is rendered for a caller holding the permission that screen declares,
 * whether that permission is granted directly or through an ancestor permission that aggregates it.
 * <p>
 * Two conditions, both required:
 * <ol>
 *   <li>the component renders from a module's template definitions
 *       ({@code /modules/<module>/<version>/templates/...}), which is where a settings screen is defined;</li>
 *   <li>the caller holds every permission the nearest declaring template ancestor requires.</li>
 * </ol>
 * A component whose ancestors declare no requirement, and a render with no resolvable context resource,
 * yield an empty fragment. Every node type below has two hosting templates on this line, standard and
 * Material, and each declares a per-screen permission.
 * <p>
 * Which condition does the work. Core enforces the same requirement on the same context resource before
 * this filter runs: {@code TemplatePermissionCheckFilter} sits at priority 21 and restricts no node type.
 * On the administration route, condition 2 therefore agrees with core rather than adding to it. Condition 1
 * has no equivalent in core, because the gated node types carry no {@code jmix:requiredPermissions}
 * of their own and this module declares no view-level {@code requirePermissions}. Read this class as a
 * placement guard first.
 * <p>
 * Condition 2 still earns its place. Where the nearest declaring ancestor declares no requirement, core allows the render and this
 * filter refuses it. All nine node types on this line have declaring templates, so that branch guards a
 * future host rather than a live case. It also does not depend on
 * core running first, so it still holds if the filter order changes.
 * <p>
 * The permissions are evaluated against the render's <strong>context resource</strong> — the main resource,
 * or the ajax resource for an ajax sub-render — and not against the component node. That is load-bearing
 * rather than incidental: the component node of a settings screen lives inside its module
 * ({@code /modules/...}), while the context resource is the global settings node that the
 * server-administration route resolves, which is what the administrator role is granted on. Resolving it
 * this way mirrors core's own evaluation of {@code j:requiredPermissionNames}
 * ({@code TemplatePermissionCheckFilter}), so a screen reached through its administration route resolves
 * identically here.
 * <p>
 * Because {@code WebflowAction} re-enters the render chain for each webflow POST, both conditions cover
 * every transition and not just the initial GET. In studio, template permissions stay core's business and
 * this filter applies the placement condition alone, matching how core evaluates
 * {@code j:requiredPermissionNames} there.
 * <p>
 * Registered via OSGi Declarative Services — no Spring context involvement. This line's parent
 * ({@code jahia-modules} 8.1.0.0) does not switch on bnd's DS annotation scanning, so the
 * {@code <_dsannotations>*</_dsannotations>} instruction in this module's pom is what makes the component
 * register at all; see the comment there before touching it.
 */
@Component(service = RenderFilter.class, immediate = true)
public class SettingsComponentPermissionFilter extends AbstractFilter {

    private static final Logger logger = LoggerFactory.getLogger(SettingsComponentPermissionFilter.class);

    /** Node types gated by this filter — every settings screen this module ships on this line. */
    private static final String APPLY_ON_NODE_TYPES =
            "jnt:serverSettingsAboutJahia," +
            "jnt:serverSettingsAdminProperties," +
            "jnt:serverSettingsCacheManagement," +
            "jnt:serverSettingsMailServerSettings," +
            "jnt:serverSettingsManageMemory," +
            "jnt:serverSettingsManageWebProjects," +
            "jnt:serverSettingsPasswordPolicy," +
            "jnt:serverSettingsReportAnIssue," +
            "jnt:serverSettingsSystemInfos";

    /** Where a settings screen is defined: a module's template definitions. */
    private static final Pattern MODULE_TEMPLATE_PATH = Pattern.compile("^/modules/[^/]+/[^/]+/templates/.+");

    /** The mixin a template carries to state an access rule, and the property that holds it. */
    private static final String DECLARING_TYPE = "jmix:requiredPermissions";
    private static final String DECLARED_PERMISSIONS = "j:requiredPermissionNames";

    private static final String STUDIO_MODE = "studiomode";

    @Activate
    public void activate() {
        // Priority 21.5: immediately after core's own permission check (TemplatePermissionCheckFilter, 21) and
        // clear of the 22.x template band. AbstractFilter breaks a priority tie on the class name, so an exact
        // 22 would order this against core's templateNodeFilter (22.0) by an accident of package naming rather
        // than by intent; 21.5 states the intended slot instead of relying on that.
        // This runs inside the fragment cache's generation scope (live only, 16 / 16.5), which is safe because
        // that cache keys on the caller's ACL signature: an entry generated for an administrator is not served
        // to a caller who lacks the grant.
        setPriority(21.5f);
        setApplyOnNodeTypes(APPLY_ON_NODE_TYPES);
        setDescription("Renders a settings component from its settings template, for a caller holding the "
                + "permissions that template declares");
        logger.debug("SettingsComponentPermissionFilter active on {}", APPLY_ON_NODE_TYPES);
    }

    @Override
    public String prepare(RenderContext renderContext, Resource resource, RenderChain chain) throws Exception {
        JCRNodeWrapper node = resource.getNode();
        String nodePath = node.getPath();

        if (!MODULE_TEMPLATE_PATH.matcher(nodePath).matches()) {
            logger.warn("Not rendering {}: a settings component renders from a module's template definitions",
                    nodePath);
            return StringUtils.EMPTY;
        }

        if (STUDIO_MODE.equals(renderContext.getEditModeConfigName())) {
            return null;
        }

        List<String> declared = declaredPermissions(node);
        if (declared.isEmpty()) {
            logger.warn("Not rendering {}: no template ancestor declares {}", nodePath, DECLARED_PERMISSIONS);
            return StringUtils.EMPTY;
        }

        JCRNodeWrapper contextNode = contextNode(renderContext);
        if (contextNode == null) {
            logger.warn("No resource to evaluate {} against; not rendering it", nodePath);
            return StringUtils.EMPTY;
        }

        for (String permission : declared) {
            if (!contextNode.hasPermission(permission)) {
                if (logger.isWarnEnabled()) {
                    logger.warn("Not rendering {}: {} does not hold {} on {}", nodePath,
                            renderContext.getUser() != null ? renderContext.getUser().getName() : "the current user",
                            permission, contextNode.getPath());
                }
                return StringUtils.EMPTY;
            }
        }

        return null;
    }

    /**
     * The permissions required by the nearest ancestor that declares an access rule, empty when none does.
     */
    private static List<String> declaredPermissions(JCRNodeWrapper node) throws RepositoryException {
        JCRNodeWrapper declaring = node.isNodeType(DECLARING_TYPE)
                ? node
                : JCRContentUtils.getParentOfType(node, DECLARING_TYPE);
        if (declaring == null || !declaring.hasProperty(DECLARED_PERMISSIONS)) {
            return Collections.emptyList();
        }
        List<String> permissions = new ArrayList<>();
        for (Value value : declaring.getProperty(DECLARED_PERMISSIONS).getValues()) {
            String permission = value.getString();
            if (StringUtils.isNotBlank(permission)) {
                permissions.add(permission);
            }
        }
        return permissions;
    }

    /**
     * The resource the access rule is evaluated against: the ajax resource of an ajax sub-render, otherwise
     * the main resource of the render.
     */
    private static JCRNodeWrapper contextNode(RenderContext renderContext) {
        Resource contextResource = renderContext.getAjaxResource() != null
                ? renderContext.getAjaxResource()
                : renderContext.getMainResource();
        return contextResource != null ? contextResource.getNode() : null;
    }
}
