package org.jahia.modules.serversettings.roles;

import java.util.Locale;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.apache.commons.lang.StringUtils;
import org.jahia.data.templates.JahiaTemplatesPackage;
import org.jahia.services.templates.JahiaTemplateManagerService;
import org.jahia.utils.i18n.Messages;

/**
 * The human label and description of a permission.
 * <p>
 * The resource bundle key is {@code label.permission.<name>}, with a dash replaced by an underscore.
 * Core answers that key from its own bundle and a module answers it from the module bundle, so the
 * resolver reads core first and then every module that declares the permission. That is the same key
 * and the same order the {@code rolesmanager} screen uses, so no label changes in the new interface.
 * <p>
 * When no bundle answers, the name itself becomes the label: {@code newContentFolderAction} reads as
 * "New content folder action". A permission is therefore never shown as a bare key.
 */
public class PermissionLabelResolver {

    private static final Pattern UNDERSCORE_OR_DASH = Pattern.compile("[_-]");
    private static final Pattern UPPERCASE_LETTER = Pattern.compile("([A-Z])");
    private static final Pattern DASH = Pattern.compile("-");

    // One lowercase letter, then an uppercase one, then the rest of that word. This is the
    // Jahia product prefix, as in jContent and jExperience.
    private static final Pattern PRODUCT_PREFIX = Pattern.compile("[a-z][A-Z][a-z0-9]*");

    private static final String KEY_PREFIX = "label.permission.";
    private static final String DESCRIPTION_SUFFIX = ".description";

    private final JahiaTemplateManagerService templateManagerService;

    public PermissionLabelResolver(JahiaTemplateManagerService templateManagerService) {
        this.templateManagerService = templateManagerService;
    }

    /**
     * The label of the given permission in the given locale.
     *
     * @param entry the permission
     * @param locale the locale to read the bundles in
     * @return the label, and the humanised name when no bundle answers
     */
    public String getLabel(PermissionEntry entry, Locale locale) {
        String localName = toLocalName(entry.getName());
        return resolve(entry, KEY_PREFIX + toBundleKey(localName), locale, humanise(localName));
    }

    /**
     * The description of the given permission in the given locale.
     *
     * @param entry the permission
     * @param locale the locale to read the bundles in
     * @return the description, and an empty string when no bundle answers
     */
    public String getDescription(PermissionEntry entry, Locale locale) {
        String key = KEY_PREFIX + toBundleKey(toLocalName(entry.getName())) + DESCRIPTION_SUFFIX;
        return resolve(entry, key, locale, "");
    }

    private String resolve(PermissionEntry entry, String key, Locale locale, String fallback) {
        String fromCore = Messages.getInternal(key, locale, fallback);
        for (String moduleId : entry.getProvidedByModules()) {
            JahiaTemplatesPackage module = templateManagerService.getTemplatePackageById(moduleId);
            if (module == null) {
                continue;
            }
            String fromModule = Messages.get(module, key, locale, fromCore);
            // A module that does not declare the key answers with the value passed as the default, so a
            // different answer is the module's own and the first such answer wins.
            if (!StringUtils.equals(fromModule, fromCore)) {
                return fromModule;
            }
        }
        return fromCore;
    }

    /** The name without its namespace prefix, so {@code jcr:read_live} keys on {@code read_live}. */
    private static String toLocalName(String permissionName) {
        return StringUtils.contains(permissionName, ':')
                ? StringUtils.substringAfterLast(permissionName, ":")
                : permissionName;
    }

    /** A bundle key holds no dash, so a dash in the name becomes an underscore. */
    private static String toBundleKey(String localName) {
        return DASH.matcher(localName).replaceAll("_");
    }

    /**
     * The name read as words: {@code newContentFolderAction} reads as "New content folder action".
     * <p>
     * A name opening with one lowercase letter and then an uppercase one carries a Jahia product
     * prefix, as {@code jContent} and {@code jExperience} do. That prefix is a product name, so it
     * keeps its own case and stays whole: {@code jContentActions} reads as "jContent actions".
     */
    private static String humanise(String localName) {
        Matcher productPrefix = PRODUCT_PREFIX.matcher(localName);
        if (productPrefix.lookingAt()) {
            String prefix = productPrefix.group();
            String rest = splitWords(localName.substring(prefix.length()));
            return rest.isEmpty() ? prefix : prefix + " " + rest.toLowerCase();
        }
        return StringUtils.capitalize(splitWords(localName).toLowerCase());
    }

    /** One space before each uppercase letter, and one for each underscore or dash. */
    private static String splitWords(String name) {
        String spaced = UPPERCASE_LETTER.matcher(name).replaceAll(" $0");
        return UNDERSCORE_OR_DASH.matcher(spaced).replaceAll(" ").trim();
    }
}
