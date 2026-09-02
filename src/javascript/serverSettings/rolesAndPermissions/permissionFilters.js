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
