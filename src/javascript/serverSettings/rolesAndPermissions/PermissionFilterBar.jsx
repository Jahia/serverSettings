import React from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Dropdown, SearchInput} from '@jahia/moonstone';
import {ANY, emptyFilters} from './permissionFilters';
import classes from './styles.css';

// Each option carries its own test attribute. Moonstone renders the option list itself, so a test
// that reached for the menu markup would break on a Moonstone upgrade.
const option = (label, value, group) => ({
    label,
    value,
    attributes: {'data-testid': `permission-option-${group}-${value || 'any'}`}
});

// A dropdown option list that always opens with "any", so clearing one filter never needs a second
// control.
const withAnyOption = (values, anyLabel, group) => [
    option(anyLabel, ANY, group),
    ...values.map(value => option(value, value, group))
];

export const PermissionFilterBar = ({filters, setFilters, areas, modules, matchCount, totalCount}) => {
    const {t} = useTranslation('serverSettings');

    const update = change => setFilters({...filters, ...change});

    return (
        <div className={classes.filterBar} data-testid="permission-filter-bar">
            <SearchInput
                className={classes.search}
                placeholder={t('rolesAndPermissions.explorer.searchPlaceholder')}
                value={filters.search}
                data-testid="permission-search"
                onChange={event => update({search: event.target.value})}
                onClear={() => update({search: ''})}
            />

            <Dropdown
                variant="outlined"
                size="small"
                placeholder={t('rolesAndPermissions.explorer.anyWorkspace')}
                value={filters.workspace}
                data-testid="permission-filter-workspace"
                data={[
                    option(t('rolesAndPermissions.explorer.anyWorkspace'), ANY, 'workspace'),
                    option(t('rolesAndPermissions.workspace.EDIT'), 'EDIT', 'workspace'),
                    option(t('rolesAndPermissions.workspace.LIVE'), 'LIVE', 'workspace'),
                    option(t('rolesAndPermissions.workspace.NONE'), 'NONE', 'workspace')
                ]}
                onChange={(event, item) => update({workspace: item.value})}
            />

            <Dropdown
                variant="outlined"
                size="small"
                placeholder={t('rolesAndPermissions.explorer.anyArea')}
                value={filters.area}
                data-testid="permission-filter-area"
                data={withAnyOption(areas, t('rolesAndPermissions.explorer.anyArea'), 'area')}
                onChange={(event, item) => update({area: item.value})}
            />

            <Dropdown
                variant="outlined"
                size="small"
                placeholder={t('rolesAndPermissions.explorer.anyModule')}
                value={filters.module}
                data-testid="permission-filter-module"
                data={withAnyOption(modules, t('rolesAndPermissions.explorer.anyModule'), 'module')}
                onChange={(event, item) => update({module: item.value})}
            />

            <button
                type="button"
                className={classes.linkButton}
                data-testid="permission-filter-reset"
                onClick={() => setFilters(emptyFilters)}
            >
                {t('rolesAndPermissions.explorer.reset')}
            </button>

            <span className={classes.matchCount} data-testid="permission-match-count">
                {t('rolesAndPermissions.explorer.matchCount', {count: matchCount, total: totalCount})}
            </span>
        </div>
    );
};

PermissionFilterBar.propTypes = {
    filters: PropTypes.shape({
        search: PropTypes.string.isRequired,
        workspace: PropTypes.string.isRequired,
        area: PropTypes.string.isRequired,
        module: PropTypes.string.isRequired
    }).isRequired,
    setFilters: PropTypes.func.isRequired,
    areas: PropTypes.arrayOf(PropTypes.string).isRequired,
    modules: PropTypes.arrayOf(PropTypes.string).isRequired,
    matchCount: PropTypes.number.isRequired,
    totalCount: PropTypes.number.isRequired
};

export default PermissionFilterBar;
