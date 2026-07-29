/*
 * Copyright (C) 2002-2022 Jahia Solutions Group SA. All rights reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
package org.jahia.modules.serversettings.render;

import org.apache.commons.lang.StringUtils;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.render.filter.AbstractFilter;
import org.jahia.services.render.filter.RenderChain;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Renders a settings component only when the caller holds an administration permission on the
 * resource the request is actually made against.
 * <p>
 * The settings components of this module are ordinary, instantiable content types, so the container
 * they were designed for is not the only place they can end up being rendered from. The permission
 * requirements declared on the settings templates ({@code j:requiredPermissionNames}) are a property
 * of those templates, so a component rendered through any other resource carries no requirement at
 * all — and the flow behind it would then be handed to whoever can render that resource. This filter
 * makes the requirement a property of the component instead, so it holds on every render path.
 * <p>
 * The check is evaluated against the <strong>main resource</strong> of the render, not against the
 * component node: the component node of a settings screen lives inside the module
 * ({@code /modules/&lt;module&gt;/...}), whereas the main resource of the server administration route
 * is the global settings node — the node the server administrator role is granted through. Checking
 * the component node instead would refuse legitimate administrators.
 * <p>
 * Failing to resolve a main resource, or a missing configuration, yields an empty fragment rather
 * than a rendered component.
 */
public class SettingsComponentPermissionFilter extends AbstractFilter {

    private static final Logger logger = LoggerFactory.getLogger(SettingsComponentPermissionFilter.class);

    private String[] requiredPermissions = new String[0];

    /**
     * Sets the permissions accepted by this filter, as a comma-separated list. A caller holding any
     * one of them on the main resource may render the component.
     *
     * @param requiredPermissions comma-separated list of permission names
     */
    public void setRequiredPermissions(String requiredPermissions) {
        String[] parsed = StringUtils.split(StringUtils.defaultString(requiredPermissions), ',');
        for (int i = 0; i < parsed.length; i++) {
            parsed[i] = parsed[i].trim();
        }
        this.requiredPermissions = parsed;
    }

    @Override
    public String prepare(RenderContext renderContext, Resource resource, RenderChain chain) throws Exception {
        if (requiredPermissions.length == 0) {
            logger.error("No permission configured for {}; refusing to render {}",
                    getClass().getName(), resource.getNodePath());
            return StringUtils.EMPTY;
        }

        Resource mainResource = renderContext.getMainResource();
        JCRNodeWrapper contextNode = mainResource != null ? mainResource.getNode() : null;
        if (contextNode == null) {
            logger.warn("No main resource to evaluate {} against; not rendering it", resource.getNodePath());
            return StringUtils.EMPTY;
        }

        for (String permission : requiredPermissions) {
            if (contextNode.hasPermission(permission)) {
                return null;
            }
        }

        logger.warn("Not rendering {}: {} holds none of {} on {}", resource.getNodePath(),
                renderContext.getUser() != null ? renderContext.getUser().getName() : "the current user",
                StringUtils.join(requiredPermissions, ", "), contextNode.getPath());
        return StringUtils.EMPTY;
    }
}
