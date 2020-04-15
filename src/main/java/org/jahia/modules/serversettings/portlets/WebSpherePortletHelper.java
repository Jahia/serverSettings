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

import java.io.IOException;
import java.io.InputStream;
import java.io.StringReader;
import java.util.jar.JarEntry;
import java.util.jar.JarFile;
import java.util.jar.JarInputStream;
import java.util.jar.JarOutputStream;
import java.util.zip.ZipEntry;

import org.apache.commons.io.IOUtils;
import org.jahia.utils.StringOutputStream;
import org.jdom.Element;
import org.jdom.JDOMException;
import org.jdom.Namespace;
import org.jdom.input.SAXBuilder;
import org.jdom.output.Format;
import org.jdom.output.XMLOutputter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

/**
 * Helper class for preparing portlet WAR files to be deployed on WebSphere Application Server.
 * 
 * @author Sergiy Shyrkov
 */
final class WebSpherePortletHelper extends BasePortletHelper {

    private static final Logger logger = LoggerFactory.getLogger(WebSpherePortletHelper.class);

    @Override
    boolean handled(JarEntry jarEntry, JarInputStream source, JarOutputStream dest) throws IOException {
        if (!"WEB-INF/web.xml".equals(jarEntry.getName())) {
            return false;
        }
        try {
            String processedWebXml = processWebXml(source);
            IOUtils.write(processedWebXml, dest);
        } catch (JDOMException e) {
            throw new IOException(e);
        }

        return true;
    }

    @Override
    boolean needsProcessing(JarFile jar) {
        ZipEntry webXml = jar.getEntry("WEB-INF/web.xml");
        if (webXml == null) {
            return false;
        }
        boolean doProcess = false;
        InputStream is = null;
        try {
            is = jar.getInputStream(webXml);
            String webXmlContent = IOUtils.toString(is, "UTF-8");
            doProcess = webXmlContent != null
                    && !webXmlContent.contains("com.ibm.websphere.portletcontainer.PortletDeploymentEnabled");
        } catch (IOException e) {
            logger.error(e.getMessage(), e);
        } finally {
            IOUtils.closeQuietly(is);
        }
        return doProcess;
    }

    @Override
    void process(JarInputStream jarIn, JarOutputStream jarOut) throws IOException {
        // do nothing
    }

    private String processWebXml(JarInputStream source) throws JDOMException, IOException {
        SAXBuilder saxBuilder = new SAXBuilder();
        saxBuilder.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        StringOutputStream os = new StringOutputStream();
        IOUtils.copy(source, os);
        org.jdom.Document jdomDocument = saxBuilder.build(new StringReader(os.toString()));
        Element root = jdomDocument.getRootElement();
        Namespace ns = root.getNamespace();

        Element displayName = root.getChild("display-name", ns);

        Element contextParam = new Element("context-param", ns);
        contextParam.addContent(new Element("param-name", ns)
                .setText("com.ibm.websphere.portletcontainer.PortletDeploymentEnabled"));
        contextParam.addContent(new Element("param-value", ns).setText("false"));

        root.addContent(displayName != null ? root.indexOf(displayName) + 1 : 0, contextParam);

        Format customFormat = Format.getPrettyFormat();
        customFormat.setLineSeparator(System.getProperty("line.separator"));
        XMLOutputter xmlOutputter = new XMLOutputter(customFormat);
        os = new StringOutputStream();
        xmlOutputter.output(jdomDocument, os);

        return os.toString();
    }

}
