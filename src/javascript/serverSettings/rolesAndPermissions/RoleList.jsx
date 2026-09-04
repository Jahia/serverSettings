import React, {useCallback, useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {useMutation, useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Add, Banner, Button, Chip, Copy, DataTable, Delete, EmptyData, Header, LayoutContent, Loader, Paper, SearchInput, Tab, TabItem, Typography} from '@jahia/moonstone';
import {CREATE_ROLE, DELETE_ROLE, DUPLICATE_ROLE, GET_ROLES, RESET_ROLE} from './RolesAndPermissions.gql-queries';
import ConfirmDestructiveDialog from './ConfirmDestructiveDialog';
import RoleNameDialog from './RoleNameDialog';
import RoleWarnings from './RoleWarnings';
import {deleteConsequences, isCostlyDelete} from './roleDelete';
import classes from './styles.css';

const ANY_SCOPE = '';

/**
 * The role the product manages on its own. Jahia writes and removes it from the j:privilegedAccess
 * mechanism, so an administrator who edits it fights the product rather than configuring it.
 */
const UNLISTED_ROLE = 'privileged';

/**
 * True when deleting the role takes something away, so the name has to be typed.
 *
 * A role nobody holds and that nothing is nested inside can be deleted with one confirmation. A role
 * somebody holds, or one with roles nested inside it, cannot be brought back.
 */

/** The roles the search and the scope chip keep. */
const filterRoles = (roles, search, scope) => {
    const needle = search.trim().toLowerCase();
    return roles.filter(role => {
        if (role.name === UNLISTED_ROLE) {
            return false;
        }

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
    const language = i18n.language || 'en';

    const [search, setSearch] = useState('');
    const [scope, setScope] = useState(ANY_SCOPE);
    const [dialog, setDialog] = useState(null);
    const [dialogError, setDialogError] = useState(null);
    const [restoreError, setRestoreError] = useState(null);
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
        setRestoreError(null);
        try {
            // No revision: there is no role to have read one from, and nothing to be stale against.
            await resetRole({variables: {role: name, revision: null}});
            await refetch();
        } catch (mutationError) {
            // The banner offers this, and a refusal has nowhere else to go. Without the message the
            // button simply stops looking busy and the role is still missing.
            setRestoreError(mutationError.message);
        } finally {
            setRestoring(null);
        }
    }, [resetRole, refetch]);
    const rows = useMemo(() => filterRoles(roles, search, scope), [roles, search, scope]);

    const columns = useMemo(() => [
        {
            key: 'name',
            label: t('rolesAndPermissions.list.columns.role'),
            // Sized on the content and not on the free space. A name cell is two short lines: the
            // title, at most 20 characters on a stock instance, and the technical name, at most 32
            // with the "inside <parent>" of a sub-role. Left flexible it took half of what the table
            // had spare, 501px for 186px of content, and the description paid for it.
            //
            // A name that does not fit ends in an ellipsis and the cell carries it as a tooltip. It
            // cannot wrap: the table gives every row one height, so a third line would be clipped
            // with nothing to show the name had been cut.
            width: '240px',
            // A sub-role is indented, so the chain that decides what it adds to is visible without a
            // second widget. The repository nests roles one level deep in practice.
            render: ({data: role}) => (
                <span className={classes.roleNameCell}>
                    <button
                        type="button"
                        className={role.parentRoleName ?
                            `${classes.roleNameButton} ${classes.subRoleName}` :
                            `${classes.roleNameButton} ${classes.roleName}`}
                        title={role.title ? `${role.title} (${role.name})` : role.name}
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

                    {/*
                      * The warning sits with the name and not in a column of its own. It is what an
                      * administrator scans a hundred roles for, and it is absent on a healthy
                      * instance, so a dedicated column stayed wide for a chip that never appeared.
                      * It is outside the button, so it is not part of the click target.
                      */}
                    <RoleWarnings roleName={role.name} warnings={role.warnings}/>
                </span>
            )
        },
        {
            key: 'roleGroup',
            label: t('rolesAndPermissions.list.columns.scope'),
            // A scope is a chip of at most 11 characters on a stock instance, "server-role" being
            // the longest.
            width: '120px',
            render: ({data: role}) => (role.roleGroup ?
                <Chip label={role.roleGroup} data-testid={`role-scope-${role.name}`}/> :
                <Typography variant="caption">{t('rolesAndPermissions.list.noScope')}</Typography>)
        },
        {
            key: 'description',
            label: t('rolesAndPermissions.list.columns.description'),
            // No width. This is the only column whose content has no bound, so it absorbs whatever
            // the others do not need.

            // The description the sources declare, and the one an administrator edits in the role
            // settings. It says what the role is FOR, which is what somebody scanning the list is
            // deciding on, and it is the role's own text rather than anything derived from what it
            // grants.
            //
            // The cell is empty when the role carries no text in the interface language, and nothing
            // stands in for it. The text of a role is declared per language, the core seed declares
            // English only, and a placeholder repeated down the column would say nothing while a
            // fallback would show a language the administrator did not ask for.
            render: ({data: role}) => (role.description ?
                <Typography
                    variant="body"
                    className={classes.roleDescription}
                    data-testid={`role-description-${role.name}`}
                >
                    {role.description}
                </Typography> :
                null)
        },
        {
            key: 'path',
            label: t('rolesAndPermissions.list.columns.actions'),
            width: '110px',
            render: ({data: role}) => (
                <span className={classes.rowActions}>
                    {/*
                      * An icon with no label announces "button" and nothing else, on the screen that
                      * administers access. The strings are already in the bundle.
                      */}
                    <Button
                        variant="ghost"
                        icon={<Copy/>}
                        aria-label={t('rolesAndPermissions.list.duplicate')}
                        title={t('rolesAndPermissions.list.duplicate')}
                        data-testid={`role-duplicate-${role.name}`}
                        onClick={() => {
                            setDialogError(null);
                            setDialog({mode: 'duplicate', sourceRole: role.name});
                        }}/>
                    <Button
                        variant="ghost"
                        icon={<Delete/>}
                        aria-label={t('rolesAndPermissions.list.delete')}
                        title={t('rolesAndPermissions.list.delete')}
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
            <Banner
                variant="warning"
                title={t('rolesAndPermissions.list.missingDeclaredTitle')}
                data-testid="missing-declared-roles"
            >
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
                {restoreError ?
                    <Typography variant="body" className={classes.formError} data-testid="restore-role-error">
                        {restoreError}
                    </Typography> :
                    null}
            </Banner>
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

                    {/*
                      * The scope is a tab and no longer a chip. A role belongs to exactly one scope,
                      * so choosing one is switching view rather than narrowing a set, and a tab says
                      * that. The search then applies inside the scope on screen.
                      */}
                    <Tab data-testid="role-scope-tabs">
                        <TabItem
                            label={t('rolesAndPermissions.list.anyScope')}
                            isSelected={scope === ANY_SCOPE}
                            data-testid="role-scope-tab-any"
                            onClick={() => setScope(ANY_SCOPE)}/>
                        {roleGroups.map(group => (
                            <TabItem
                                key={group}
                                label={group}
                                isSelected={scope === group}
                                data-testid={`role-scope-tab-${group}`}
                                onClick={() => setScope(group)}/>
                        ))}
                    </Tab>

                    <div className={classes.filterBar} data-testid="role-filter-bar">
                        <SearchInput
                            className={classes.search}
                            placeholder={t('rolesAndPermissions.list.searchPlaceholder')}
                            value={search}
                            data-testid="role-search"
                            onChange={event => setSearch(event.target.value)}
                            onClear={() => setSearch('')}/>

                        <span className={classes.matchCount} data-testid="role-match-count">
                            {t('rolesAndPermissions.list.matchCount', {
                                count: rows.length,
                                total: roles.length
                            })}
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
                            consequences={deleteConsequences(pendingDelete, t)}
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
