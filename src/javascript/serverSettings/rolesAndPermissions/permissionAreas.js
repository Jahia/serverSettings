/**
 * The name an area is shown under.
 *
 * An area is itself a permission: the one at the root of its subtree, which is why its name appears
 * both in `areas` and as an entry of depth 1. So it carries the same label as any other permission,
 * read from the declaring module's resource bundle and humanised from the name when no bundle
 * answers. The rail and the explorer filter showed the raw name, which made the areas the only
 * permissions on screen written as `site-admin` rather than as words.
 *
 * An area with no entry keeps its name. That happens when a module declares a permission and the
 * screen reads the catalog while the module is stopping, and a name is better than a blank.
 */
export const areaLabels = catalog => new Map(
    (catalog?.entries || [])
        .filter(entry => entry.depth === 1)
        .map(entry => [entry.name, entry.label || entry.name])
);

export const labelOf = (labels, area) => labels.get(area) || area;
