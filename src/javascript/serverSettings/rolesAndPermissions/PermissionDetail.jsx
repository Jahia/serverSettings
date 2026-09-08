import React from 'react';
import PropTypes from 'prop-types';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Chip, EmptyData, Field, Loader, Pill, Typography} from '@jahia/moonstone';
import {GET_PERMISSION_DETAIL} from './RolesAndPermissions.gql-queries';
import {ABSOLUTE_PATH_LABELS} from './roleScopes';
import classes from './styles.css';

/** Where a target applies, said in words rather than in the j:path value. */
const targetLabel = (usage, t) => {
    if (usage.targetKind === 'CURRENT_NODE') {
        return t('rolesAndPermissions.target.currentNode');
    }

    if (usage.targetKind === 'CURRENT_SITE') {
        return t('rolesAndPermissions.target.currentSite');
    }

    const named = ABSOLUTE_PATH_LABELS[usage.targetPath];
    return named ? t(named) : t('rolesAndPermissions.target.absolutePath', {path: usage.targetPath});
};

/** Why the permission is granted there. A locked row names what holds it. */
const reasonLabel = (effective, t) => {
    if (effective.lockKind === 'INHERITED_FROM_ROLE') {
        return t('rolesAndPermissions.reason.inheritedFromRole', {role: effective.lockedBy});
    }

    if (effective.lockKind === 'IMPLIED_BY_PERMISSION') {
        return t('rolesAndPermissions.reason.impliedByPermission', {permission: effective.lockedBy});
    }

    return t('rolesAndPermissions.reason.direct');
};

export const PermissionDetail = ({permissionName, language}) => {
    const {t} = useTranslation('serverSettings');
    const {data, loading, error} = useQuery(GET_PERMISSION_DETAIL, {
        variables: {name: permissionName, language},
        skip: !permissionName,
        fetchPolicy: 'network-only'
    });

    if (!permissionName) {
        return (
            <div className={classes.detailEmpty} data-testid="permission-detail-empty">
                <EmptyData message={t('rolesAndPermissions.explorer.selectPrompt')}/>
            </div>
        );
    }

    if (loading) {
        return (
            <div className={classes.detailEmpty}>
                <Loader size="big"/>
            </div>
        );
    }

    const permission = data?.admin?.rolesAndPermissions?.permissionCatalog?.permission;

    if (error || !permission) {
        return (
            <div className={classes.detailEmpty} data-testid="permission-detail-error">
                <EmptyData message={t('rolesAndPermissions.explorer.detailError')}/>
            </div>
        );
    }

    return (
        <div className={classes.detail} data-testid="permission-detail">
            <Typography variant="heading" data-testid="permission-detail-label">{permission.label}</Typography>
            <Typography variant="body" className={classes.detailName}>{permission.name}</Typography>

            {permission.description ?
                <Typography variant="body" className={classes.detailDescription}>
                    {permission.description}
                </Typography> :
                null}

            {/*
              * The workspace used to be a pill on the list row. TreeView draws a row its own way, so
              * the marker lives here now. It is the only place the screen states which workspace a
              * permission decides in, and _default or _live is the whole of that decision.
              */}
            {permission.workspace === 'NONE' ?
                null :
                <Field id="permission-field-workspace" label={t('rolesAndPermissions.explorer.workspace')}>
                    <Pill
                        label={t(`rolesAndPermissions.workspace.${permission.workspace}`)}
                        data-testid="permission-detail-workspace"/>
                </Field>}

            <Field id="permission-field-logicalPath" label={t('rolesAndPermissions.explorer.logicalPath')}>
                <code data-testid="permission-detail-path">{permission.logicalPath}</code>
            </Field>

            <Field id="permission-field-declaredBy" label={t('rolesAndPermissions.explorer.declaredBy')}>
                {permission.providedByModules.length === 0 ?
                    <Typography variant="body">{t('rolesAndPermissions.explorer.coreOnly')}</Typography> :
                    <div className={classes.chipRow} data-testid="permission-detail-modules">
                        {permission.providedByModules.map(module => (
                            <Chip key={module} label={module}/>
                        ))}
                    </div>}
            </Field>

            {permission.childNames.length > 0 ?
                <Field label={t('rolesAndPermissions.explorer.aggregates', {count: permission.childNames.length})}>
                    <div className={classes.chipRow} data-testid="permission-detail-children">
                        {permission.childNames.map(child => (
                            <Chip key={child} label={child}/>
                        ))}
                    </div>
                </Field> :
                null}

            {permission.dependencies.length > 0 ?
                <Field id="permission-field-dependencies" label={t('rolesAndPermissions.explorer.dependencies')}>
                    <div className={classes.chipRow}>
                        {permission.dependencies.map(dependency => (
                            <Chip key={dependency} label={dependency}/>
                        ))}
                    </div>
                </Field> :
                null}

            <Field label={t('rolesAndPermissions.explorer.grantedBy', {count: permission.grantedBy.length})}>
                {permission.grantedBy.length === 0 ?
                    <Typography variant="body" data-testid="permission-detail-no-role">
                        {t('rolesAndPermissions.explorer.grantedByNone')}
                    </Typography> :
                    <ul className={classes.usageList} data-testid="permission-detail-granted-by">
                        {permission.grantedBy.map(usage => (
                            <li
                                key={`${usage.roleName}-${usage.grantId}`}
                                className={classes.usage}
                                data-testid={`permission-usage-${usage.roleName}-${usage.grantId || 'currentNode'}`}
                            >
                                <Typography weight="semiBold" variant="body">{usage.roleName}</Typography>
                                <Typography variant="caption" className={classes.usageTarget}>
                                    {targetLabel(usage, t)}
                                </Typography>
                                <Typography variant="caption" className={classes.usageReason}>
                                    {reasonLabel(usage.effective, t)}
                                </Typography>
                            </li>
                        ))}
                    </ul>}
            </Field>
        </div>
    );
};

PermissionDetail.propTypes = {
    permissionName: PropTypes.string,
    language: PropTypes.string.isRequired
};

PermissionDetail.defaultProps = {
    permissionName: null
};

export default PermissionDetail;
