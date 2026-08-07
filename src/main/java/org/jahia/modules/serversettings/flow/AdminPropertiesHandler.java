/*
 * ==========================================================================================
 * =                   JAHIA'S DUAL LICENSING - IMPORTANT INFORMATION                       =
 * ==========================================================================================
 *
 *                                 http://www.jahia.com
 *
 *     Copyright (C) 2002-2020 Jahia Solutions Group SA. All rights reserved.
 *
 *     THIS FILE IS AVAILABLE UNDER TWO DIFFERENT LICENSES:
 *     1/GPL OR 2/JSEL
 *
 *     1/ GPL
 *     ==================================================================================
 *
 *     IF YOU DECIDE TO CHOOSE THE GPL LICENSE, YOU MUST COMPLY WITH THE FOLLOWING TERMS:
 *
 *     This program is free software: you can redistribute it and/or modify
 *     it under the terms of the GNU General Public License as published by
 *     the Free Software Foundation, either version 3 of the License, or
 *     (at your option) any later version.
 *
 *     This program is distributed in the hope that it will be useful,
 *     but WITHOUT ANY WARRANTY; without even the implied warranty of
 *     MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
 *     GNU General Public License for more details.
 *
 *     You should have received a copy of the GNU General Public License
 *     along with this program. If not, see <http://www.gnu.org/licenses/>.
 *
 *
 *     2/ JSEL - Commercial and Supported Versions of the program
 *     ===================================================================================
 *
 *     IF YOU DECIDE TO CHOOSE THE JSEL LICENSE, YOU MUST COMPLY WITH THE FOLLOWING TERMS:
 *
 *     Alternatively, commercial and supported versions of the program - also known as
 *     Enterprise Distributions - must be used in accordance with the terms and conditions
 *     contained in a separate written agreement between you and Jahia Solutions Group SA.
 *
 *     If you are unsure which license is appropriate for your use,
 *     please contact the sales department at sales@jahia.com.
 */
package org.jahia.modules.serversettings.flow;

import org.apache.commons.lang.StringUtils;
import org.jahia.modules.serversettings.users.admin.AdminProperties;
import org.jahia.services.content.JCRNodeWrapper;
import org.jahia.services.content.decorator.JCRGroupNode;
import org.jahia.services.content.decorator.JCRUserNode;
import org.jahia.services.render.RenderContext;
import org.jahia.services.render.Resource;
import org.jahia.services.usermanager.JahiaUserManagerService;
import org.jahia.taglibs.user.User;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.binding.message.MessageBuilder;
import org.springframework.binding.message.MessageContext;

import javax.jcr.RepositoryException;
import java.io.Serializable;
import java.util.LinkedList;
import java.util.List;

public class AdminPropertiesHandler implements Serializable {
    private static final long serialVersionUID = -1665000223980422529L;
    private transient static final Logger logger = LoggerFactory.getLogger(AdminPropertiesHandler.class);

    /**
     * Permission the caller must hold to write the root account's properties through this screen.
     * <p>
     * Same requirement, evaluated on the same node, as
     * {@code org.jahia.modules.serversettings.render.SettingsComponentPermissionFilter}: {@code admin} is a
     * core permission granted by the {@code server-administrator} role, and it is deliberately not one of the
     * finer per-screen permissions, which resolve to {@code false} where they are not registered on an
     * instance and would therefore fail closed for administrators too.
     */
    private static final String REQUIRED_PERMISSION = "admin";

    private AdminProperties adminProperties;

    public AdminProperties getAdminProperties() {
        return adminProperties;
    }

    /**
     * first method call in the flow. It instantiates and populates the AdminProperties bean
     */
    public void init() {
        adminProperties = new AdminProperties();
        adminProperties.populate(JahiaUserManagerService.getInstance().lookupRootUser());
    }

    /**
     * save the bean in the JCR
     * <p>
     * Every write below targets the root account, so the caller's authority is established once, on entry,
     * and covers the method as a whole — the screen is administrative in its entirety, and each property it
     * writes carries the same requirement.
     */
    public void save(MessageContext messages, RenderContext renderContext) {
        if (!isAdministrationGranted(renderContext)) {
            messages.addMessage(new MessageBuilder().error().code("label.error").build());
            return;
        }

        JCRUserNode rootNode = JahiaUserManagerService.getInstance().lookupRootUser();
        if (renderContext.getUser().isRoot() && !StringUtils.isEmpty(adminProperties.getPassword())) {
            rootNode.setPassword(adminProperties.getPassword());
        }

        try {
            if (!rootNode.hasProperty("j:lastName") || !StringUtils.equals(rootNode.getProperty("j:lastName").getString(), adminProperties.getLastName())) {
                rootNode.setProperty("j:lastName", adminProperties.getLastName());
            }
            if (!rootNode.hasProperty("j:firstName") || !StringUtils.equals(rootNode.getProperty("j:firstName").getString(), adminProperties.getFirstName())) {
                rootNode.setProperty("j:firstName", adminProperties.getFirstName());
            }
            if (!rootNode.hasProperty("j:organization") || !StringUtils.equals(rootNode.getProperty("j:organization").getString(), adminProperties.getOrganization())) {
                rootNode.setProperty("j:organization", adminProperties.getOrganization());
            }
            if (!rootNode.hasProperty("emailNotificationsDisabled") || !StringUtils.equals(rootNode.getProperty("emailNotificationsDisabled").getString(), adminProperties
                    .getEmailNotificationsDisabled().toString())) {
                rootNode.setProperty("emailNotificationsDisabled",
                        Boolean.toString(adminProperties.getEmailNotificationsDisabled()));
            }
            if (!rootNode.hasProperty("j:email") || !StringUtils.equals(rootNode.getProperty("j:email").getString(), adminProperties.getEmail())) {
                rootNode.setProperty("j:email", adminProperties.getEmail());
            }
            String lang = adminProperties.getPreferredLanguage().toString();
            if (!rootNode.hasProperty("preferredLanguage") || !StringUtils.equals(rootNode.getProperty("preferredLanguage").getString(), lang)) {
                rootNode.setProperty("preferredLanguage", lang);
            }
            messages.addMessage(new MessageBuilder().info().code("label.changeSaved").build());

            rootNode.save();
        } catch (RepositoryException e) {
            messages.addMessage(new MessageBuilder().error().code("label.error").build());
            logger.error(e.getMessage(), e);
        }
    }

    /**
     * Whether the caller may write the root account's properties.
     * <p>
     * The requirement is evaluated on the render's <strong>main resource</strong> — the site or the global
     * settings node the request is actually made against, which is what an administrator role is granted on.
     * That target is load-bearing: the root user node this method writes is obtained through a system
     * session, and {@code hasPermission} answers {@code true} for any caller on such a session, so it can
     * express no requirement. The main resource is bound to the caller's own session and does.
     * <p>
     * Fails closed: without a main resource there is nothing to evaluate the requirement against, and this is
     * an administration capability.
     *
     * @param renderContext the context of the render the transition was submitted from
     * @return {@code true} when the caller holds {@link #REQUIRED_PERMISSION} on the main resource
     */
    private boolean isAdministrationGranted(RenderContext renderContext) {
        Resource mainResource = renderContext != null ? renderContext.getMainResource() : null;
        JCRNodeWrapper contextNode = mainResource != null ? mainResource.getNode() : null;
        if (contextNode == null) {
            logger.warn("No main resource to evaluate {} against; not saving the administration properties",
                    REQUIRED_PERMISSION);
            return false;
        }

        if (contextNode.hasPermission(REQUIRED_PERMISSION)) {
            return true;
        }

        if (logger.isWarnEnabled()) {
            logger.warn("Not saving the administration properties: {} does not hold {} on {}",
                    renderContext.getUser() != null ? renderContext.getUser().getName() : "the current user",
                    REQUIRED_PERMISSION, contextNode.getPath());
        }
        return false;
    }

    public List<JCRGroupNode> getUserMembership() {
        return new LinkedList<JCRGroupNode>(User.getUserMembership(JahiaUserManagerService.getInstance().lookupRootUser().getName()).values());
    }

}