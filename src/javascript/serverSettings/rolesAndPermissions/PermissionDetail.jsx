import React from 'react';
import PropTypes from 'prop-types';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Chip, EmptyData, Loader, Typography} from '@jahia/moonstone';
import {GET_PERMISSION_DETAIL} from './RolesAndPermissions.gql-queries';
import classes from './styles.css';

/** Where a target applies, said in words rather than in the j:path value. */
const targetLabel = (usage, t) => {
    if (usage.targetKind === 'CURRENT_NODE') {
        return t('rolesAndPermissions.target.currentNode');
    }

    if (usage.targetKind === 'CURRENT_SITE') {
        return t('rolesAndPermissions.target.currentSite');
    }

    return t('rolesAndPermissions.target.absolutePath', {path: usage.targetPath});
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

const Field = ({label, children}) => (
    <div className={classes.field}>
        <Typography isUpperCase variant="caption" className={classes.fieldLabel}>{label}</Typography>
        <div className={classes.fieldValue}>{children}</div>
    </div>
);

Field.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired
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

            <Field label={t('rolesAndPermissions.explorer.logicalPath')}>
                <code data-testid="permission-detail-path">{permission.logicalPath}</code>
            </Field>

            <Field label={t('rolesAndPermissions.explorer.declaredBy')}>
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
                <Field label={t('rolesAndPermissions.explorer.dependencies')}>
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
