import React, {useCallback, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {useMutation, useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Add, Banner, Button, Chip, Copy, DataTable, Delete, EmptyData, Header, LayoutContent, Loader, Paper, SearchInput, Typography} from '@jahia/moonstone';
import {stringColumn} from '@jahia/moonstone/DataTable';
import {CREATE_ROLE, DELETE_ROLE, DUPLICATE_ROLE, GET_ROLES, RESET_ROLE} from './RolesAndPermissions.gql-queries';
import ConfirmDestructiveDialog from './ConfirmDestructiveDialog';
import RoleNameDialog from './RoleNameDialog';
import RoleWarnings from './RoleWarnings';
import classes from './styles.css';

const ANY_SCOPE = '';

/**
 * True when deleting the role takes something away, so the name has to be typed.
 *
 * A role nobody holds and that nothing is nested inside can be deleted with one confirmation. A role
 * somebody holds, or one with roles nested inside it, cannot be brought back.
 */
const isCostlyDelete = role => role.usage.entryCount > 0 || role.subRoleNames.length > 0;

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

export const RoleList = ({onOpenRole}) => {
    const {t, i18n} = useTranslation('serverSettings');

    /** What deleting the role takes away, stated one fact per line. */
    const deleteConsequences = role => {
        const lines = [];
        if (role.usage.entryCount > 0) {
            lines.push(t('rolesAndPermissions.confirm.deleteHeld', {
                count: role.usage.entryCount,
                principals: role.usage.principals.join(', ') + (role.usage.isTruncated ? '…' : '')
            }));
        } else {
            lines.push(t('rolesAndPermissions.confirm.deleteUnused'));
        }

        if (role.subRoleNames.length > 0) {
            lines.push(t('rolesAndPermissions.confirm.deleteSubRoles', {
                names: role.subRoleNames.join(', ')
            }));
        }

        if (role.directPermissionNames.length > 0) {
            lines.push(t('rolesAndPermissions.confirm.deletePermissions', {
                count: role.directPermissionNames.length
            }));
        }

        return lines;
    };

    const language = i18n.language || 'en';

    const [search, setSearch] = useState('');
    const [scope, setScope] = useState(ANY_SCOPE);
    const [dialog, setDialog] = useState(null);
    const [dialogError, setDialogError] = useState(null);
    const [pendingDelete, setPendingDelete] = useState(null);

    const {data, loading, error, refetch} = useQuery(GET_ROLES, {
        variables: {language},
        fetchPolicy: 'network-only'
    });

    const [createRole] = useMutation(CREATE_ROLE);
    const [duplicateRole] = useMutation(DUPLICATE_ROLE);
    const [deleteRole] = useMutation(DELETE_ROLE);

    // The server refuses a name another role carries, and its message is what the dialog shows. The
    // check cannot live here: two administrators could pick one name at the same time.
    const confirmDialog = async ({name, roleGroup, parentRole, withSubRoles}) => {
        setDialogError(null);
        try {
            if (dialog.mode === 'create') {
                await createRole({variables: {name, roleGroup, parentRole}});
            } else {
                await duplicateRole({variables: {role: dialog.sourceRole, newName: name, withSubRoles}});
            }

            setDialog(null);
            refetch();
        } catch (mutationError) {
            setDialogError(mutationError.message);
        }
    };

    // Deleting a role cannot be undone, and it can take access away from people without telling
    // them: an access control entry holds a role NAME, and the entry stays behind naming a role the
    // repository no longer has. So the confirmation states that, and asks for the name to be typed
    // whenever something is actually lost.
    const removeRole = useCallback(async () => {
        setDialogError(null);
        try {
            await deleteRole({variables: {role: pendingDelete.name}});
            setPendingDelete(null);
            refetch();
        } catch (mutationError) {
            setDialogError(mutationError.message);
        }
    }, [deleteRole, refetch, pendingDelete]);

    const answer = data?.admin?.rolesAndPermissions;
    const roles = useMemo(() => answer?.roles || [], [answer]);
    const roleGroups = useMemo(() => answer?.roleGroups || [], [answer]);
    // A deleted role is in no row, so the only place it can be offered back is here.
    const missingRoles = useMemo(() => answer?.missingDeclaredRoles || [], [answer]);
    const [restoring, setRestoring] = useState(null);
    const [resetRole] = useMutation(RESET_ROLE);

    const restore = useCallback(async name => {
        setRestoring(name);
        try {
            // No revision: there is no role to have read one from, and nothing to be stale against.
            await resetRole({variables: {role: name, revision: null}});
            await refetch();
        } finally {
            setRestoring(null);
        }
    }, [resetRole, refetch]);
    const rows = useMemo(() => filterRoles(roles, search, scope), [roles, search, scope]);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: t('rolesAndPermissions.list.columns.role'),
            // A sub-role is indented, so the chain that decides what it adds to is visible without a
            // second widget. The repository nests roles one level deep in practice.
            render: ({data: role}) => (
                <button
                    type="button"
                    className={role.parentRoleName ?
                        `${classes.roleNameButton} ${classes.subRoleName}` :
                        `${classes.roleNameButton} ${classes.roleName}`}
                    data-testid={`role-name-${role.name}`}
                    onClick={() => onOpenRole(role.name)}
                >
                    <Typography variant="body">{role.title || role.name}</Typography>
                    <Typography variant="caption" className={classes.roleTechnicalName}>
                        {role.parentRoleName ?
                            t('rolesAndPermissions.list.subRoleOf', {name: role.name, parent: role.parentRoleName}) :
                            role.name}
                    </Typography>
                </button>
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
            // No fixed width. The chips of a role with several flags outgrew one, and the overflow
            // covered the action button of the row below.
            render: ({data: role}) => (
                <span className={classes.warningRow} data-testid={`role-flags-${role.name}`}>
                    {role.hasEffectivePrivilegedAccess ?
                        <Chip
                            label={role.hasPrivilegedAccess ?
                                t('rolesAndPermissions.list.privileged') :
                                t('rolesAndPermissions.list.privilegedVia', {parent: role.parentRoleName})}
                            data-testid={`role-privileged-${role.name}`}/> :
                        null}
                    {role.isHidden ?
                        <Chip label={t('rolesAndPermissions.list.hidden')} data-testid={`role-hidden-${role.name}`}/> :
                        null}
                    <RoleWarnings roleName={role.name} warnings={role.warnings}/>
                </span>
            )
        },
        {
            key: 'path',
            label: t('rolesAndPermissions.list.columns.actions'),
            width: '110px',
            render: ({data: role}) => (
                <span className={classes.rowActions}>
                    <Button
                        variant="ghost"
                        icon={<Copy/>}
                        data-testid={`role-duplicate-${role.name}`}
                        onClick={() => {
                            setDialogError(null);
                            setDialog({mode: 'duplicate', sourceRole: role.name});
                        }}/>
                    <Button
                        variant="ghost"
                        icon={<Delete/>}
                        data-testid={`role-delete-${role.name}`}
                        onClick={() => {
                            setDialogError(null);
                            setPendingDelete(role);
                        }}/>
                </span>
            )
        }
    ], [t, onOpenRole]);

    const missingBanner = () => {
        if (missingRoles.length === 0) {
            return null;
        }

        return (
            <div className={classes.missingRoles} data-testid="missing-declared-roles">
                <Typography variant="body">
                    {t('rolesAndPermissions.list.missingDeclared', {count: missingRoles.length})}
                </Typography>
                <div className={classes.chipRow}>
                    {missingRoles.map(name => (
                        <Button
                            key={name}
                            size="default"
                            variant="outlined"
                            isDisabled={restoring === name}
                            label={t('rolesAndPermissions.list.restoreRole', {role: name})}
                            data-testid={`restore-role-${name}`}
                            onClick={() => restore(name)}/>
                    ))}
                </div>
            </div>
        );
    };

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
            <>
                {missingBanner()}
                <DataTable
                    enablePagination={false}
                    data={rows}
                    columns={columns}
                    primaryKey="path"
                    data-testid="role-table"/>
            </>
        );
    };

    return (
        <LayoutContent
            isLoading={loading}
            header={
                <Header
                    title={t('rolesAndPermissions.title')}
                    data-testid="role-list-header"
                    mainActions={[
                        <Button
                            key="create"
                            size="big"
                            color="accent"
                            icon={<Add/>}
                            label={t('rolesAndPermissions.list.create')}
                            data-testid="role-create"
                            onClick={() => {
                                setDialogError(null);
                                setDialog({mode: 'create'});
                            }}/>
                    ]}/>
            }
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

                    {pendingDelete ?
                        <ConfirmDestructiveDialog
                            title={t('rolesAndPermissions.confirm.deleteTitle', {role: pendingDelete.name})}
                            message={t('rolesAndPermissions.confirm.deleteMessage', {
                                role: pendingDelete.name
                            })}
                            confirmLabel={t('rolesAndPermissions.confirm.deleteConfirm')}
                            consequences={deleteConsequences(pendingDelete)}
                            confirmWord={isCostlyDelete(pendingDelete) ? pendingDelete.name : null}
                            error={dialogError}
                            onCancel={() => setPendingDelete(null)}
                            onConfirm={removeRole}/> :
                        null}

                    {dialog ?
                        <RoleNameDialog
                            mode={dialog.mode}
                            sourceRole={dialog.sourceRole}
                            roleGroups={roleGroups}
                            roleNames={roles.map(role => role.name)}
                            error={dialogError}
                            onCancel={() => setDialog(null)}
                            onConfirm={confirmDialog}/> :
                        null}
                </Paper>
            }/>
    );
};

RoleList.propTypes = {
    onOpenRole: PropTypes.func.isRequired
};

export default RoleList;
