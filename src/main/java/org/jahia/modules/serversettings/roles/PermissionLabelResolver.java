package org.jahia.modules.serversettings.roles;

import java.util.Locale;
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

    /** {@code newContentFolderAction} reads as "New content folder action". */
    private static String humanise(String localName) {
        String spaced = UPPERCASE_LETTER.matcher(localName).replaceAll(" $0");
        return StringUtils.capitalize(UNDERSCORE_OR_DASH.matcher(spaced).replaceAll(" ").toLowerCase());
    }
}
