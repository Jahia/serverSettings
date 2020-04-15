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
package org.jahia.modules.serversettings.portlets;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.io.IOException;
import java.util.jar.JarEntry;
import java.util.jar.JarInputStream;

import org.apache.commons.io.FileUtils;
import org.apache.commons.io.IOUtils;
import org.apache.pluto.util.assemble.Assembler;
import org.apache.pluto.util.assemble.AssemblerConfig;
import org.apache.pluto.util.assemble.war.WarAssembler;
import org.jahia.settings.SettingsBean;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * . User: jahia Date: 15 avr. 2009 Time: 12:31:07
 */
public class AssemblerTask {

    private static final Logger logger = LoggerFactory.getLogger(AssemblerTask.class);

    private File tempDir;
    private File webapp;

    public AssemblerTask(File tempDir, File webapp) {
        this.tempDir = tempDir;
        this.webapp = webapp;
    }

    public File execute() throws Exception {
        long timer = System.currentTimeMillis();
        logger.info("Got a command to prepare " + getWebapp() + " WAR file to be deployed into the Pluto container");
        validateArgs();

        BasePortletHelper portletHelper = getPortletHelperInstance();

        if (!needRewriting(getWebapp())) {
            File destFile = new File(tempDir, getWebapp().getName());
            FileUtils.copyFile(getWebapp(), destFile, true);
            return portletHelper != null ? portletHelper.process(destFile) : destFile;
        }

        final File tempDir = getTempDir();
        final AssemblerConfig config = new AssemblerConfig();
        config.setSource(getWebapp());
        config.setDestination(tempDir);

        WarAssembler assembler = new WarAssembler();
        assembler.assemble(config);

        File destFile = new File(tempDir, getWebapp().getName());

        if (portletHelper != null) {
            destFile = portletHelper.process(destFile);
        }

        logger.info("Done assembling WAR file {} in {} ms.", destFile, (System.currentTimeMillis() - timer));

        return destFile;
    }

    private BasePortletHelper getPortletHelperInstance() {
        String srv = SettingsBean.getInstance().getServer();
        if (srv == null) {
            return null;
        }
        if (srv.startsWith("jboss")) {
            return new JBossPortletHelper();
        } else if (srv.startsWith("was")) {
            return new WebSpherePortletHelper();
        }

        return null;
    }

    public File getTempDir() {
        return tempDir;
    }

    public File getWebapp() {
        return webapp;
    }

    private boolean needRewriting(File source) throws FileNotFoundException, IOException {
        final JarInputStream jarIn = new JarInputStream(new FileInputStream(source));
        String webXml = null;
        JarEntry jarEntry;
        try {
            // Read the source archive entry by entry
            while ((jarEntry = jarIn.getNextJarEntry()) != null) {
                if (Assembler.SERVLET_XML.equals(jarEntry.getName())) {
                    webXml = IOUtils.toString(jarIn);
                }
                jarIn.closeEntry();
            }
        } finally {
            jarIn.close();
        }

        return webXml == null || !webXml.contains(Assembler.DISPATCH_SERVLET_CLASS);
    }

    private void validateArgs() throws Exception {
        if (webapp != null) {
            if (!webapp.exists()) {
                throw new Exception("webapp " + webapp.getAbsolutePath() + " does not exist");
            }
            return;
        }
    }

}