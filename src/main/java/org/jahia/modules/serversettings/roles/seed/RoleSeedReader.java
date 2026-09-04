package org.jahia.modules.serversettings.roles.seed;

import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import javax.xml.XMLConstants;
import javax.xml.parsers.DocumentBuilder;
import javax.xml.parsers.DocumentBuilderFactory;
import javax.xml.parsers.ParserConfigurationException;

import org.w3c.dom.Document;
import org.w3c.dom.Element;
import org.w3c.dom.Node;
import org.w3c.dom.NodeList;
import org.xml.sax.SAXException;

/**
 * Reads a document view XML that declares roles.
 * <p>
 * The format is the one Jahia imports at install: an element per node, its name being the node name,
 * and its properties being attributes. A role is any element whose primary type is the role type,
 * wherever it sits, so the reader walks the whole document rather than a fixed depth. Nesting is
 * meaningful, because a role element inside a role element is a sub-role.
 */
final class RoleSeedReader {

    private static final String JCR_NS = "http://www.jcp.org/jcr/1.0";
    private static final String JAHIA_NS = "http://www.jahia.org/jahia/1.0";

    private static final String ROLE_TYPE = "jnt:role";
    private static final String EXTERNAL_PERMISSIONS_TYPE = "jnt:externalPermissions";
    private static final String TRANSLATION_TYPE = "jnt:translation";

    private final DocumentBuilder builder;

    RoleSeedReader() throws ParserConfigurationException {
        DocumentBuilderFactory factory = DocumentBuilderFactory.newInstance();
        // The files read here ship inside the running Jahia and its modules, but the parser resolves
        // no entity and loads no external document all the same. A seed file is input, and input that
        // is trusted today is read by the same code tomorrow.
        factory.setFeature(XMLConstants.FEATURE_SECURE_PROCESSING, true);
        factory.setFeature("http://apache.org/xml/features/disallow-doctype-decl", true);
        factory.setFeature("http://xml.org/sax/features/external-general-entities", false);
        factory.setFeature("http://xml.org/sax/features/external-parameter-entities", false);
        factory.setFeature("http://apache.org/xml/features/nonvalidating/load-external-dtd", false);
        factory.setXIncludeAware(false);
        factory.setExpandEntityReferences(false);
        factory.setNamespaceAware(true);
        builder = factory.newDocumentBuilder();
        builder.setEntityResolver((publicId, systemId) -> new org.xml.sax.InputSource(new java.io.StringReader("")));
    }

    /**
     * Reads every role the stream declares into the map, merging into a seed that is already there.
     *
     * @param seedsByName the map to fill, keyed by role name
     * @param source      the source to record against every role this stream declares
     */
    void read(InputStream stream, Map<String, RoleSeed> seedsByName, RoleSeedSource source)
            throws IOException, SAXException {
        Document document = builder.parse(stream);
        walk(document.getDocumentElement(), null, seedsByName, source);
    }

    private void walk(Element element, String parentRoleName, Map<String, RoleSeed> seedsByName, RoleSeedSource source) {
        String primaryType = attribute(element, JCR_NS, "primaryType");

        if (ROLE_TYPE.equals(primaryType)) {
            String name = element.getNodeName();
            RoleSeed seed = seedsByName.computeIfAbsent(name, RoleSeed::new);
            seed.merge(source,
                    parentRoleName,
                    attribute(element, JAHIA_NS, "roleGroup"),
                    booleanAttribute(element, "privilegedAccess"),
                    booleanAttribute(element, "hidden"),
                    multiple(attribute(element, JAHIA_NS, "nodeTypes")),
                    multiple(attribute(element, JAHIA_NS, "permissionNames")));

            for (Element child : children(element)) {
                String childType = attribute(child, JCR_NS, "primaryType");
                if (EXTERNAL_PERMISSIONS_TYPE.equals(childType)) {
                    seed.mergeTarget(child.getNodeName(),
                            attribute(child, JAHIA_NS, "path"),
                            multiple(attribute(child, JAHIA_NS, "permissionNames")));
                } else if (TRANSLATION_TYPE.equals(childType)) {
                    seed.mergeText(attribute(child, JCR_NS, "language"),
                            attribute(child, JCR_NS, "title"),
                            attribute(child, JCR_NS, "description"));
                } else {
                    walk(child, name, seedsByName, source);
                }
            }
            return;
        }

        // Not a role: keep descending. Core wraps its roles in a system folder, a module puts them at
        // the document root, and neither shape is worth a special case.
        for (Element child : children(element)) {
            walk(child, parentRoleName, seedsByName, source);
        }
    }

    private static List<Element> children(Element element) {
        NodeList nodes = element.getChildNodes();
        List<Element> elements = new ArrayList<>();
        for (int i = 0; i < nodes.getLength(); i++) {
            Node node = nodes.item(i);
            if (node.getNodeType() == Node.ELEMENT_NODE) {
                elements.add((Element) node);
            }
        }
        return elements;
    }

    private static String attribute(Element element, String namespace, String name) {
        String value = element.getAttributeNS(namespace, name);
        return value == null || value.isEmpty() ? null : value;
    }

    private static Boolean booleanAttribute(Element element, String name) {
        String value = attribute(element, JAHIA_NS, name);
        return value == null ? null : Boolean.valueOf(value);
    }

    /**
     * Splits a multiple-valued property. Document view separates the values with a space, and escapes
     * a space inside a value with a backslash. No permission name or node type carries one, so the
     * escape is unwrapped rather than parsed.
     */
    private static List<String> multiple(String value) {
        if (value == null) {
            return Collections.emptyList();
        }
        return Arrays.stream(value.split("(?<!\\\\)\\s+"))
                .map(String::trim)
                .filter(part -> !part.isEmpty())
                .map(part -> part.replace("\\ ", " "))
                .collect(Collectors.toList());
    }
}
