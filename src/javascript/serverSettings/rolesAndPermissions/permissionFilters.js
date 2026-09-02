// The filters over the permission catalog. A filter narrows a list and never moves a permission to
// another parent, so filtering is pure and lives outside the components.

export const ANY = '';

export const emptyFilters = {
    search: '',
    workspace: ANY,
    module: ANY,
    area: ANY
};

/** Every module that declares at least one permission, sorted, for the module filter. */
export const modulesOf = entries => {
    const modules = new Set();
    entries.forEach(entry => entry.providedByModules.forEach(module => modules.add(module)));
    return [...modules].sort();
};

/**
 * The entries the given filters keep.
 *
 * The search matches the permission name, its label and its logical path, so an administrator finds a
 * permission by what the screen shows them and by what the repository holds.
 */
export const applyFilters = (entries, filters) => {
    const needle = filters.search.trim().toLowerCase();
    return entries.filter(entry => {
        if (filters.workspace !== ANY && entry.workspace !== filters.workspace) {
            return false;
        }

        if (filters.area !== ANY && entry.area !== filters.area) {
            return false;
        }

        if (filters.module !== ANY && !entry.providedByModules.includes(filters.module)) {
            return false;
        }

        if (needle === '') {
            return true;
        }

        return entry.name.toLowerCase().includes(needle) ||
            (entry.label || '').toLowerCase().includes(needle) ||
            entry.logicalPath.toLowerCase().includes(needle);
    });
};

/** True when the filters keep every entry, so the screen can say the list is unfiltered. */
export const isUnfiltered = filters =>
    filters.search.trim() === '' &&
    filters.workspace === ANY &&
    filters.module === ANY &&
    filters.area === ANY;

/**
 * The matches as tree data, for a component that draws a hierarchy.
 *
 * The hierarchy is the repository's own: a node's children are the permissions whose parent it is.
 * Nothing is ever re-parented. A filtered result is therefore returned FLAT, because a match whose
 * parent the filter removed has no place to sit, and hanging it somewhere else would invent a
 * hierarchy the repository does not have.
 *
 * @param matches the entries the filters kept
 * @param isFiltered whether any filter is active
 * @param decorate builds the node fields a component needs from one entry
 */
export const asTreeData = (matches, isFiltered, decorate) => {
    if (isFiltered) {
        return matches.map(entry => decorate(entry));
    }

    const byName = new Map(matches.map(entry => [entry.name, entry]));
    const childrenOf = new Map();
    const roots = [];

    matches.forEach(entry => {
        // A parent the matches do not carry makes this entry a root of what is shown. That happens
        // only for a genuine top-level permission when nothing is filtered.
        if (entry.parentName && byName.has(entry.parentName)) {
            const siblings = childrenOf.get(entry.parentName) || [];
            siblings.push(entry);
            childrenOf.set(entry.parentName, siblings);
        } else {
            roots.push(entry);
        }
    });

    const build = entry => {
        const children = childrenOf.get(entry.name);
        return {
            ...decorate(entry),
            ...(children ? {children: children.map(build)} : {})
        };
    };

    return roots.map(build);
};
