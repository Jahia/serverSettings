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
import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.exceptions.JahiaException;
import org.jahia.modules.serversettings.users.admin.AdminProperties;
import org.jahia.registries.ServicesRegistry;
import org.jahia.services.sites.JahiaSitesService;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.binding.message.MessageBuilder;
import org.springframework.binding.message.MessageContext;
import org.springframework.binding.validation.ValidationContext;

import java.io.Serializable;
import java.util.*;

public class SiteBean implements Serializable {
    private static final long serialVersionUID = 2151226556427659305L;

    private static final Logger logger = LoggerFactory.getLogger(SiteBean.class);

    static final String SITE_KEY_FIELD = "siteKey";
    static final String SERVER_NAME_FIELD = "serverName";
    static final String SERVER_NAME_ALIASES_FIELD = "serverNameAliases";

    private static final String TITLE_FIELD = "title";
    private static final String TEMPLATE_SET_FIELD = "templateSet";
    private static final String MODULES_FIELD = "modules";

    private AdminProperties adminProperties;

    private boolean createAdmin = false;
    private boolean editModules = false;
    private boolean defaultSite = false;

    private String title = "My Site";
    private String siteKey = "mySite";
    private String description;
    private String templateSet;
    private String language;
    private String serverName = "localhost";
    private String serverNameAliases = "";
    private String templatePackageName;
    private String templateFolder;

    private List<String> modules = new ArrayList<>();

    public AdminProperties getAdminProperties() {
        if (adminProperties == null) {
            adminProperties = new AdminProperties();
            adminProperties.setUsername(siteKey + "-admin");
        }
        return adminProperties;
    }

    public String getDescription() {
        return description;
    }

    public String getLanguage() {
        return language;
    }

    public List<JahiaTemplatesPackage> getModulePackages() {
        List<JahiaTemplatesPackage> packs = new LinkedList<>();
        JahiaTemplateManagerService templateManagerService = ServicesRegistry.getInstance()
                .getJahiaTemplateManagerService();
        for (String module : modules) {
            packs.add(templateManagerService.getTemplatePackageById(module));
        }

        return packs;
    }

    public List<String> getModules() {
        return modules;
    }

    public String getServerName() {
        return serverName;
    }

    public String getServerNameAliases() {
        return serverNameAliases;
    }

    public String getSiteKey() {
        return siteKey;
    }

    public String getTemplateSet() {
        return templateSet;
    }

    public JahiaTemplatesPackage getTemplateSetPackage() {
        return ServicesRegistry.getInstance().getJahiaTemplateManagerService()
                .getTemplatePackageById(templateSet);
    }

    public String getTitle() {
        return title;
    }

    public String getTemplatePackageName() {
        return templatePackageName;
    }

    public String getTemplateFolder() {
        return templateFolder;
    }

    public boolean isCreateAdmin() {
        return createAdmin;
    }

    public boolean isDefaultSite() {
        return defaultSite;
    }

    public void setAdminProperties(AdminProperties adminProperties) {
        this.adminProperties = adminProperties;
    }

    public void setCreateAdmin(boolean createAdmin) {
        this.createAdmin = createAdmin;
    }

    public void setDefaultSite(boolean defaultSite) {
        this.defaultSite = defaultSite;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public void setLanguage(String language) {
        this.language = language;
    }

    public void setModules(List<String> modules) {
        if (modules == null) {
            this.modules = new ArrayList<>();
        } else {
            this.modules = modules;
        }
    }

    public void setServerName(String serverName) {
        this.serverName = serverName;
    }

    public void setServerNameAliases(String serverNameAliases) {
        if (StringUtils.isNotEmpty(serverNameAliases)) {
            List<String> aliases = new LinkedList<>(Arrays.asList(StringUtils.split(serverNameAliases, ", ")));
            Collections.sort(aliases);
            this.serverNameAliases = StringUtils.join(aliases, ", ");
        } else {
            this.serverNameAliases = serverNameAliases;
        }
    }

    public void setSiteKey(String siteKey) {
        this.siteKey = siteKey;
    }

    public void setTemplateSet(String templateSet) {
        this.templateSet = templateSet;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public void setTemplatePackageName(String templatePackageName) {
        this.templatePackageName = templatePackageName;
    }

    public void setTemplateFolder(String templateFolder) {
        this.templateFolder = templateFolder;
    }

    public boolean isEditModules() {
        return editModules;
    }

    public void setEditModules(boolean editModules) {
        this.editModules = editModules;
    }

    public void validateCreateSite(ValidationContext context) {
        try {
            MessageContext messages = context.getMessageContext();
            JahiaTemplateManagerService templateManagerService = ServicesRegistry.getInstance().getJahiaTemplateManagerService();

            if (templateManagerService.getNonSystemTemplateSetPackages().isEmpty()) {
                messages.addMessage(new MessageBuilder()
                        .error()
                        .code("serverSettings.manageWebProjects.warningMsg.noTemplateSets")
                        .build());
            }

            String userSiteKey = (String) context.getUserValue(SITE_KEY_FIELD);
            String userTitle = (String) context.getUserValue(TITLE_FIELD);
            String userServerName = (String) context.getUserValue(SERVER_NAME_FIELD);
            if (StringUtils.isNotBlank(userTitle) && StringUtils.isNotBlank(userServerName) && StringUtils.isNotBlank(userSiteKey)) {
                JahiaSitesService sitesService = ServicesRegistry.getInstance().getJahiaSitesService();

                if (!sitesService.isSiteKeyValid(userSiteKey)) {
                    messages.addMessage(new MessageBuilder()
                            .error()
                            .source(SITE_KEY_FIELD)
                            .code("serverSettings.manageWebProjects.warningMsg.onlyLettersDigitsUnderscore")
                            .build());
                }

                testServerNames(messages);

                if (sitesService.getSiteByKey(userSiteKey) != null) {
                    messages.addMessage(new MessageBuilder()
                            .error()
                            .source(SITE_KEY_FIELD)
                            .code("serverSettings.manageWebProjects.warningMsg.chooseAnotherSiteKey")
                            .build());
                }
            } else {
                messages.addMessage(new MessageBuilder()
                        .error()
                        .source(SITE_KEY_FIELD)
                        .code("serverSettings.manageWebProjects.warningMsg.completeRequestInfo")
                        .build());
            }
        } catch (JahiaException e) {
            logger.error(e.getMessage(), e);
        }
    }

    public void validateCreateSiteSelectModules(ValidationContext context) {
        // Fix issue https://jira.jahia.org/browse/QA-12044
        // For some reason when an empty value is received from the user the setModules method is not call,
        // So I'm using the validate method to check the field and update the model accordingly.
        if (!context.getUserEvent().equals("previous") && context.getUserValue(MODULES_FIELD) == null) {
            this.modules = new ArrayList<>();
        }

        JahiaTemplateManagerService templateManagerService = ServicesRegistry.getInstance().getJahiaTemplateManagerService();
        if (templateManagerService.getNonSystemTemplateSetPackages().isEmpty()) {
            MessageContext messages = context.getMessageContext();
            messages.addMessage(new MessageBuilder()
                    .error()
                    .source(TEMPLATE_SET_FIELD)
                    .code("serverSettings.manageWebProjects.warningMsg.noTemplateSets").build());
        }
    }

    public void validateEditSite(ValidationContext context) {
        try {
            MessageContext messages = context.getMessageContext();
            if (StringUtils.isNotBlank(title) && StringUtils.isNotBlank(serverName)) {
                testServerNames(messages);
            } else {
                messages.addMessage(new MessageBuilder()
                        .error()
                        .source(SITE_KEY_FIELD)
                        .code("serverSettings.manageWebProjects.warningMsg.completeRequestInfo")
                        .build());
            }
        } catch (JahiaException e) {
            logger.error(e.getMessage(), e);
        }
    }

    private void testServerNames(MessageContext messages) throws JahiaException {
        WebprojectHandler.validateServerNames(serverName, serverNameAliases, siteKey, messages);
    }
}
