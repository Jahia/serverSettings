import React, {useMemo, useState} from 'react';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Banner, Chip, DataTable, EmptyData, Header, LayoutContent, Loader, Paper, SearchInput, Typography} from '@jahia/moonstone';
import {stringColumn} from '@jahia/moonstone/DataTable';
import {GET_ROLES} from './RolesAndPermissions.gql-queries';
import RoleWarnings from './RoleWarnings';
import classes from './styles.css';

const ANY_SCOPE = '';

/** The roles the search and the scope chip keep. */
const filterRoles = (roles, search, scope) => {
    const needle = search.trim().toLowerCase();
    return roles.filter(role => {
        if (scope !== ANY_SCOPE && role.roleGroup !== scope) {
            return false;
        }

        if (needle === '') {
            return true;
        }

        return role.name.toLowerCase().includes(needle) ||
            (role.title || '').toLowerCase().includes(needle);
    });
};

export const RoleList = () => {
    const {t, i18n} = useTranslation('serverSettings');
    const language = i18n.language || 'en';

    const [search, setSearch] = useState('');
    const [scope, setScope] = useState(ANY_SCOPE);

    const {data, loading, error} = useQuery(GET_ROLES, {
        variables: {language},
        fetchPolicy: 'network-only'
    });

    const answer = data?.admin?.rolesAndPermissions;
    const roles = useMemo(() => answer?.roles || [], [answer]);
    const roleGroups = useMemo(() => answer?.roleGroups || [], [answer]);
    const rows = useMemo(() => filterRoles(roles, search, scope), [roles, search, scope]);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: t('rolesAndPermissions.list.columns.role'),
            // A sub-role is indented, so the chain that decides what it adds to is visible without a
            // second widget. The repository nests roles one level deep in practice.
            render: ({data: role}) => (
                <span
                    className={role.parentRoleName ? classes.subRoleName : classes.roleName}
                    data-testid={`role-name-${role.name}`}
                >
                    <Typography variant="body">{role.title || role.name}</Typography>
                    <Typography variant="caption" className={classes.roleTechnicalName}>
                        {role.parentRoleName ?
                            t('rolesAndPermissions.list.subRoleOf', {name: role.name, parent: role.parentRoleName}) :
                            role.name}
                    </Typography>
                </span>
            )
        },
        {
            key: 'roleGroup',
            label: t('rolesAndPermissions.list.columns.scope'),
            width: '140px',
            render: ({data: role}) => (role.roleGroup ?
                <Chip label={role.roleGroup} data-testid={`role-scope-${role.name}`}/> :
                <Typography variant="caption">{t('rolesAndPermissions.list.noScope')}</Typography>)
        },
        {
            key: 'nodeTypes',
            label: t('rolesAndPermissions.list.columns.grantableOn'),
            width: '180px',
            render: ({data: role}) => (
                <Typography variant="caption" data-testid={`role-nodetypes-${role.name}`}>
                    {role.nodeTypes.length === 0 ?
                        t('rolesAndPermissions.list.anyNodeType') :
                        role.nodeTypes.join(', ')}
                </Typography>
            )
        },
        {
            key: 'directPermissionNames',
            label: t('rolesAndPermissions.list.columns.names'),
            width: '90px',
            align: 'right',
            render: ({data: role}) => (
                <Typography variant="body" data-testid={`role-named-${role.name}`}>
                    {role.directPermissionNames.length}
                </Typography>
            )
        },
        {
            key: 'effectivePermissionNames',
            label: t('rolesAndPermissions.list.columns.reaches'),
            width: '150px',
            // Two numbers rather than one, because one would hide the model. The role names a set, and
            // that set reaches further once aggregation and role inheritance apply.
            render: ({data: role}) => (
                <span className={classes.roleName} data-testid={`role-reaches-${role.name}`}>
                    <Typography variant="body" data-testid={`role-reach-count-${role.name}`}>
                        {role.effectivePermissionNames.length}
                    </Typography>
                    {role.inheritedPermissionNames.length > 0 ?
                        <Typography
                            variant="caption"
                            className={classes.roleTechnicalName}
                            data-testid={`role-inherited-count-${role.name}`}
                        >
                            {t('rolesAndPermissions.list.fromParent', {
                                count: role.inheritedPermissionNames.length
                            })}
                        </Typography> :
                        null}
                </span>
            )
        },
        {
            key: 'targets',
            label: t('rolesAndPermissions.list.columns.targets'),
            width: '110px',
            ...stringColumn(role => String(role.grants.length))
        },
        {
            key: 'flags',
            label: t('rolesAndPermissions.list.columns.flags'),
            width: '230px',
            render: ({data: role}) => (
                <span className={classes.warningRow} data-testid={`role-flags-${role.name}`}>
                    {role.hasEffectivePrivilegedAccess ?
                        <Chip
                            label={role.hasPrivilegedAccess ?
                                t('rolesAndPermissions.list.privileged') :
                                t('rolesAndPermissions.list.privilegedByParent', {parent: role.parentRoleName})}
                            data-testid={`role-privileged-${role.name}`}/> :
                        null}
                    {role.isHidden ?
                        <Chip label={t('rolesAndPermissions.list.hidden')} data-testid={`role-hidden-${role.name}`}/> :
                        null}
                    <RoleWarnings roleName={role.name} warnings={role.warnings}/>
                </span>
            )
        }
    ], [t]);

    const content = () => {
        if (error) {
            return (
                <div className={classes.detailEmpty} data-testid="role-list-error">
                    <EmptyData message={t('rolesAndPermissions.loadError')}/>
                </div>
            );
        }

        if (loading) {
            return <div className={classes.detailEmpty}><Loader size="big"/></div>;
        }

        if (rows.length === 0) {
            return (
                <div className={classes.detailEmpty} data-testid="role-list-empty">
                    <EmptyData message={t('rolesAndPermissions.list.noMatch')}/>
                </div>
            );
        }

        return (
            <DataTable
                enablePagination={false}
                data={rows}
                columns={columns}
                primaryKey="path"
                data-testid="role-table"/>
        );
    };

    return (
        <LayoutContent
            isLoading={loading}
            header={<Header title={t('rolesAndPermissions.title')} data-testid="role-list-header"/>}
            content={
                <Paper>
                    {answer?.ambiguousRoleNames?.length > 0 ?
                        <Banner
                            variant="warning"
                            title={t('rolesAndPermissions.list.ambiguousTitle')}
                            data-testid="role-ambiguous-banner"
                        >
                            {t('rolesAndPermissions.list.ambiguousNames', {
                                names: answer.ambiguousRoleNames.join(', ')
                            })}
                        </Banner> :
                        null}

                    <div className={classes.filterBar} data-testid="role-filter-bar">
                        <SearchInput
                            className={classes.search}
                            placeholder={t('rolesAndPermissions.list.searchPlaceholder')}
                            value={search}
                            data-testid="role-search"
                            onChange={event => setSearch(event.target.value)}
                            onClear={() => setSearch('')}/>

                        <Chip
                            label={t('rolesAndPermissions.list.anyScope')}
                            color={scope === ANY_SCOPE ? 'accent' : 'default'}
                            className={classes.scopeChip}
                            data-testid="role-scope-filter-any"
                            onClick={() => setScope(ANY_SCOPE)}/>
                        {roleGroups.map(group => (
                            <Chip
                                key={group}
                                label={group}
                                color={scope === group ? 'accent' : 'default'}
                                className={classes.scopeChip}
                                data-testid={`role-scope-filter-${group}`}
                                onClick={() => setScope(group)}/>
                        ))}

                        <span className={classes.matchCount} data-testid="role-match-count">
                            {t('rolesAndPermissions.list.matchCount', {count: rows.length, total: roles.length})}
                        </span>
                    </div>

                    {content()}
                </Paper>
            }/>
    );
};

export default RoleList;
