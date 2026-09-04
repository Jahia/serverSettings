import React, {useMemo, useState} from 'react';
import PropTypes from 'prop-types';
import {useApolloClient, useMutation} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Button, Checkbox, Chip, EmptyData, SearchInput, Tab, TabItem, TreeView, Typography} from '@jahia/moonstone';
import {
    COLLAPSE_PERMISSION,
    GET_COLLAPSE_PLAN,
    GET_REVOKE_PLAN,
    GRANT_PERMISSIONS,
    REVOKE_PERMISSION
} from './RolesAndPermissions.gql-queries';
import PermissionChangeDialog from './PermissionChangeDialog';
import classes from './styles.css';

/**
 * The row state, derived from the two facts the server answers.
 *
 * The role naming a permission and something else holding it are two facts, and a row the role names
 * is editable whatever else holds it. So isDirect decides the state and lockKind is read only when the
 * role names nothing. Reading lockKind first would report a redundant name as inherited, hide it from
 * the caption and disable the checkbox that removes it.
 */
const rowStateOf = effective => {
    if (!effective) {
        return 'NOT_GRANTED';
    }

    if (effective.isDirect) {
        return 'DIRECT';
    }

    if (effective.lockKind === 'INHERITED_FROM_ROLE') {
        return 'INHERITED';
    }

    if (effective.lockKind === 'IMPLIED_BY_PERMISSION') {
        return 'IMPLIED';
    }

    return 'DIRECT';
};

export const RolePermissionsTab = ({role, catalog, onChanged}) => {
    const {t} = useTranslation('serverSettings');
    const client = useApolloClient();

    const [targetId, setTargetId] = useState(role.grants[0]?.id ?? '');
    const [area, setArea] = useState(catalog.areas[0] ?? '');
    const [search, setSearch] = useState('');
    const [change, setChange] = useState(null);
    const [notice, setNotice] = useState(null);

    const [grant] = useMutation(GRANT_PERMISSIONS);
    const [revoke] = useMutation(REVOKE_PERMISSION);
    const [collapse] = useMutation(COLLAPSE_PERMISSION);

    const target = role.grants.find(candidate => candidate.id === targetId) || role.grants[0];

    const effectiveByName = useMemo(() => {
        const map = new Map();
        (target?.effectivePermissions || []).forEach(effective => map.set(effective.name, effective));
        return map;
    }, [target]);

    // A count per area, so an administrator sees where a role actually grants before opening an area.
    const grantedByArea = useMemo(() => {
        const counts = new Map();
        catalog.entries.forEach(entry => {
            const current = counts.get(entry.area) || {granted: 0, total: 0};
            current.total += 1;
            if (effectiveByName.has(entry.name)) {
                current.granted += 1;
            }

            counts.set(entry.area, current);
        });
        return counts;
    }, [catalog, effectiveByName]);

    const rows = useMemo(() => {
        const needle = search.trim().toLowerCase();
        return catalog.entries.filter(entry => {
            if (needle === '') {
                return entry.area === area;
            }

            return entry.name.toLowerCase().includes(needle) ||
                (entry.label || '').toLowerCase().includes(needle);
        });
    }, [catalog, area, search]);

    // A granted name the catalog does not declare has no row of its own, so it is listed apart. It
    // grants nothing and stays until an administrator removes it.
    const unknownNames = useMemo(
        () => (target?.directPermissions || []).filter(name => !effectiveByName.get(name)?.isKnown),
        [target, effectiveByName]
    );

    // Every write here can be refused, and a refusal rejects the promise rather than answering an
    // outcome. Without this the checkbox stays where it was and nothing is rendered, which on a
    // permission row reads as "it worked". applyResult covers the outcomes the server REPORTS; this
    // covers the one it THROWS, and both land in the same notice bar.
    const guarded = async run => {
        try {
            await run();
        } catch (mutationError) {
            setNotice(mutationError.message);
        }
    };

    const applyResult = (result, operation) => {
        if (result?.outcome === 'REFUSED_STALE_REVISION') {
            setNotice(t('rolesAndPermissions.detail.staleRevision'));
        } else if (result?.outcome === 'NOT_APPLICABLE') {
            setNotice(t('rolesAndPermissions.detail.notApplicable', {operation}));
        } else {
            setNotice(null);
        }

        onChanged();
    };

    const onGrant = permission => guarded(async () => {
        const {data} = await grant({
            variables: {
                role: role.name,
                target: target.id,
                permissions: [permission],
                revision: target.revision
            }
        });
        applyResult(data?.admin?.rolesAndPermissions?.grantPermissions, 'grant');
    });

    const onRevokeClicked = permission => guarded(async () => {
        const {data} = await client.query({
            query: GET_REVOKE_PLAN,
            variables: {name: role.name, target: target.id, permission},
            fetchPolicy: 'network-only'
        });
        const plan = data?.admin?.rolesAndPermissions?.role?.grant?.revokePlan;

        // No plan is not an empty plan. The dialog reads plan.outcome, so opening it on an answer
        // that carried no data takes the screen down instead of stating a problem.
        if (!plan) {
            setNotice(t('rolesAndPermissions.detail.planUnavailable'));
            return;
        }

        // A removal with no consequence beyond the row is applied straight away. Everything else is
        // shown first, because the administrator has to see what it costs.
        if (plan.outcome === 'IMMEDIATE') {
            const result = await revoke({
                variables: {
                    role: role.name,
                    target: target.id,
                    permission,
                    revision: target.revision
                }
            });
            applyResult(result.data?.admin?.rolesAndPermissions?.revokePermission, 'revoke');
            return;
        }

        setChange({kind: 'revoke', permission, plan});
    });

    const onCollapseClicked = permission => guarded(async () => {
        const {data} = await client.query({
            query: GET_COLLAPSE_PLAN,
            variables: {name: role.name, target: target.id, permission},
            fetchPolicy: 'network-only'
        });
        const plan = data?.admin?.rolesAndPermissions?.role?.grant?.collapsePlan;
        if (!plan) {
            setNotice(t('rolesAndPermissions.detail.planUnavailable'));
            return;
        }

        setChange({kind: 'collapse', permission, plan});
    });

    const confirmChange = () => guarded(async () => {
        const {kind, permission} = change;
        setChange(null);
        const mutate = kind === 'revoke' ? revoke : collapse;
        const {data} = await mutate({
            variables: {
                role: role.name,
                target: target.id,
                permission,
                revision: target.revision
            }
        });
        const answer = kind === 'revoke' ?
            data?.admin?.rolesAndPermissions?.revokePermission :
            data?.admin?.rolesAndPermissions?.collapsePermission;
        applyResult(answer, kind);
    });

    /*
     * A tab names where the role reaches, in words.
     *
     * A path is not that. `/` and `/modules` say nothing to an administrator choosing where to grant a
     * permission, and the granted node of a server role is the whole server rather than a piece of
     * content, so one kind reads differently depending on the scope the role belongs to. The label
     * therefore comes from the pair, and falls back to the path when the pair is one nobody named.
     */
    const ABSOLUTE_PATH_LABELS = {
        '/': 'rolesAndPermissions.target.wholeServer',
        '/modules': 'rolesAndPermissions.target.studio',
        '/sites/systemsite': 'rolesAndPermissions.target.systemSite'
    };

    const CURRENT_NODE_LABELS = {
        'server-role': 'rolesAndPermissions.target.wholeServer',
        'system-role': 'rolesAndPermissions.target.systemTools',
        'site-role': 'rolesAndPermissions.target.currentSite'
    };

    const targetLabel = candidate => {
        if (candidate.kind === 'CURRENT_NODE') {
            return t(CURRENT_NODE_LABELS[role.roleGroup] || 'rolesAndPermissions.target.currentNode');
        }

        if (candidate.kind === 'CURRENT_SITE') {
            return t('rolesAndPermissions.target.currentSite');
        }

        const named = ABSOLUTE_PATH_LABELS[candidate.path];
        return named ? t(named) : t('rolesAndPermissions.target.absolutePath', {path: candidate.path});
    };

    /*
     * Why a checkbox is ticked and cannot be unticked.
     *
     * Only the parent-role lock is stated, because it is the one an administrator cannot act on from
     * this role and the one that greys the checkbox. A permission granted through an ancestor
     * permission is not stated: the caption slot under the label carries the technical name, which is
     * what an administrator matches against a log line or a piece of documentation.
     */
    const inheritedFrom = (entry, state) => {
        const effective = effectiveByName.get(entry.name);
        if (state === 'INHERITED' || (state === 'DIRECT' && effective?.lockKind === 'INHERITED_FROM_ROLE')) {
            return effective.lockedBy;
        }

        return null;
    };

    return (
        <div data-testid="role-permissions-tab">
            {/*
              * A target is a tab. The role grants a different set on each one, so choosing a target is
              * switching view rather than filtering, exactly as choosing a scope is on the role list.
              * Adding and removing a target is editing the role, so both live in the edit form.
              */}
            <Tab data-testid="role-target-bar">
                {role.grants.map(candidate => (
                    <TabItem
                        key={candidate.id || 'currentNode'}
                        size="big"
                        label={targetLabel(candidate)}
                        isSelected={candidate.id === target.id}
                        data-testid={`role-target-${candidate.id || 'currentNode'}`}
                        onClick={() => setTargetId(candidate.id)}/>
                ))}
            </Tab>

            {target.isInheritedOnly ?
                <div className={classes.targetBar} data-testid="role-target-inherited-only">
                    <Typography variant="caption">
                        {t('rolesAndPermissions.detail.targetInheritedOnly')}
                    </Typography>
                </div> :
                null}

            {notice ?
                <div className={classes.targetBar} data-testid="role-permissions-notice">
                    <Typography variant="body" className={classes.formError}>{notice}</Typography>
                </div> :
                null}

            {unknownNames.length > 0 ?
                <div className={classes.targetBar} data-testid="role-unknown-permissions">
                    <Typography variant="body" className={classes.permissionUnknown}>
                        {t('rolesAndPermissions.detail.unknownGranted', {names: unknownNames.join(', ')})}
                    </Typography>
                    {unknownNames.map(name => (
                        <Button
                            key={name}
                            size="default"
                            variant="outlined"
                            label={t('rolesAndPermissions.detail.removeUnknown', {name})}
                            data-testid={`role-remove-unknown-${name}`}
                            onClick={() => onRevokeClicked(name)}/>
                    ))}
                </div> :
                null}

            <div className={classes.permissionsBody}>
                <div className={classes.areaRail} data-testid="role-area-rail">
                    {/*
                      * A rail of areas, one selected. TreeView carries the selected state and the
                      * keyboard navigation, so neither is written here. Its label is a string and its
                      * trailing slot takes an icon, so the count rides in the label rather than beside
                      * it: the component decides how a row looks, and this screen supplies the words.
                      */}
                    <TreeView
                        size="small"
                        data={catalog.areas.map(candidate => {
                            const counts = grantedByArea.get(candidate) || {granted: 0, total: 0};
                            return {
                                id: candidate,
                                label: t('rolesAndPermissions.detail.areaWithCount', {
                                    area: candidate,
                                    ...counts
                                }),
                                // An area the role already grants something in is marked, so the areas
                                // worth opening are visible without reading every count.
                                className: counts.granted > 0 ? classes.areaWithGrants : undefined,
                                treeItemProps: {
                                    'data-testid': `role-area-${candidate}`,
                                    'data-granted': counts.granted > 0 ? 'yes' : 'no'
                                }
                            };
                        })}
                        selectedItems={search.trim() === '' ? [area] : []}
                        onClickItem={node => {
                            setSearch('');
                            setArea(node.id);
                        }}/>
                </div>

                <div className={classes.permissionPane}>
                    <div className={classes.targetBar}>
                        <SearchInput
                            className={classes.search}
                            placeholder={t('rolesAndPermissions.detail.searchPlaceholder')}
                            value={search}
                            data-testid="role-permission-search"
                            onChange={event => setSearch(event.target.value)}
                            onClear={() => setSearch('')}/>
                    </div>

                    {rows.length === 0 ?
                        <div className={classes.detailEmpty}>
                            <EmptyData message={t('rolesAndPermissions.explorer.noMatch')}/>
                        </div> :
                        rows.map(entry => {
                            const state = rowStateOf(effectiveByName.get(entry.name));
                            const locked = state === 'INHERITED';
                            const inherited = inheritedFrom(entry, state);
                            const canCollapse = target.collapsablePermissions.includes(entry.name);

                            return (
                                <div
                                    key={entry.logicalPath}
                                    className={classes.permissionEditRow}
                                    style={{paddingLeft: `${12 + ((entry.depth - 1) * 16)}px`}}
                                    data-testid={`role-permission-${entry.name}`}
                                    data-state={state}
                                >
                                    {/*
                                      * Moonstone's Field renders a label with no htmlFor, and the
                                      * row's own label is a sibling span, so the input has no
                                      * accessible name of its own. ControlledCheckbox spreads its
                                      * props onto the input, so aria-label reaches it.
                                      */}
                                    <Checkbox
                                        checked={state !== 'NOT_GRANTED'}
                                        isDisabled={locked}
                                        aria-label={entry.label || entry.name}
                                        data-testid={`role-permission-checkbox-${entry.name}`}
                                        onChange={() => (state === 'NOT_GRANTED' ?
                                            onGrant(entry.name) :
                                            onRevokeClicked(entry.name))}/>

                                    <span className={classes.permissionEditLabel}>
                                        <span className={classes.permissionEditTitle}>
                                            <Typography variant="body">{entry.label}</Typography>
                                            {inherited ?
                                                <Chip
                                                    label={t('rolesAndPermissions.reason.inheritedFromRole', {role: inherited})}
                                                    data-testid={`role-permission-inherited-${entry.name}`}/> :
                                                null}
                                        </span>
                                        {/*
                                          * The technical name, always. It is what an administrator
                                          * matches against a log line, a piece of documentation or a
                                          * Groovy script, and the label alone cannot be searched for.
                                          */}
                                        <Typography
                                            variant="caption"
                                            className={classes.permissionReason}
                                            data-testid={`role-permission-name-${entry.name}`}
                                        >
                                            {entry.name}
                                        </Typography>
                                    </span>

                                    <span className={classes.rowActions}>
                                        {canCollapse ?
                                            <Button
                                                size="default"
                                                variant="outlined"
                                                label={t('rolesAndPermissions.detail.collapse')}
                                                data-testid={`role-collapse-${entry.name}`}
                                                onClick={() => onCollapseClicked(entry.name)}/> :
                                            null}
                                    </span>
                                </div>
                            );
                        })}
                </div>
            </div>

            <PermissionChangeDialog
                change={change}
                onCancel={() => setChange(null)}
                onConfirm={confirmChange}/>

        </div>
    );
};

RolePermissionsTab.propTypes = {
    role: PropTypes.shape({
        name: PropTypes.string.isRequired,
        /** The scope decides what the granted node IS, so it decides how the tab names it. */
        roleGroup: PropTypes.string,
        grants: PropTypes.array.isRequired
    }).isRequired,
    catalog: PropTypes.shape({
        areas: PropTypes.arrayOf(PropTypes.string).isRequired,
        entries: PropTypes.array.isRequired
    }).isRequired,
    onChanged: PropTypes.func.isRequired
};

export default RolePermissionsTab;
