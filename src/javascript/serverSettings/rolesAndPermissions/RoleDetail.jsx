import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Button, ChevronLeft, EmptyData, Header, LayoutContent, Loader, Paper, Tab, TabItem, Typography} from '@jahia/moonstone';
import {GET_PERMISSION_CATALOG, GET_ROLE} from './RolesAndPermissions.gql-queries';
import RoleIdentityTab from './RoleIdentityTab';
import RolePermissionsTab from './RolePermissionsTab';
import RoleWarnings from './RoleWarnings';
import classes from './styles.css';

export const RoleDetail = ({roleName, onClose}) => {
    const {t, i18n} = useTranslation('serverSettings');
    const language = i18n.language || 'en';
    const [activeTab, setActiveTab] = useState('permissions');

    const roleQuery = useQuery(GET_ROLE, {
        variables: {name: roleName, language},
        fetchPolicy: 'network-only'
    });
    const catalogQuery = useQuery(GET_PERMISSION_CATALOG, {
        variables: {language},
        fetchPolicy: 'network-only'
    });

    const answer = roleQuery.data?.admin?.rolesAndPermissions;
    const role = answer?.role;
    const catalog = catalogQuery.data?.admin?.rolesAndPermissions?.permissionCatalog;
    const loading = roleQuery.loading || catalogQuery.loading;

    const header = (
        <Header
            title={role ? (role.title || role.name) : roleName}
            data-testid="role-detail-header"
            backButton={
                <Button
                    variant="ghost"
                    icon={<ChevronLeft/>}
                    label={t('rolesAndPermissions.detail.back')}
                    data-testid="role-detail-back"
                    onClick={onClose}/>
            }
            mainActions={role ?
                [<RoleWarnings key="warnings" roleName={role.name} warnings={role.warnings}/>] :
                []}/>
    );

    if (loading) {
        return (
            <LayoutContent
                isLoading
                header={header}
                content={<Paper><div className={classes.detailEmpty}><Loader size="big"/></div></Paper>}/>
        );
    }

    if (roleQuery.error || catalogQuery.error || !role) {
        return (
            <LayoutContent
                header={header}
                content={
                    <Paper>
                        <div className={classes.detailEmpty} data-testid="role-detail-error">
                            <EmptyData message={t('rolesAndPermissions.detail.notFound', {name: roleName})}/>
                        </div>
                    </Paper>
                }/>
        );
    }

    const reload = () => {
        roleQuery.refetch();
    };

    return (
        <LayoutContent
            header={header}
            content={
                <Paper>
                    <div className={classes.targetBar}>
                        <Typography variant="caption" className={classes.detailHeaderName}>
                            {role.parentRoleName ?
                                t('rolesAndPermissions.detail.subRoleOf', {
                                    name: role.name,
                                    parent: role.parentRoleName
                                }) :
                                role.name}
                        </Typography>
                    </div>

                    <Tab>
                        <TabItem
                            id="permissions"
                            size="big"
                            label={t('rolesAndPermissions.detail.permissionsTab')}
                            isSelected={activeTab === 'permissions'}
                            data-testid="role-tab-permissions"
                            onClick={() => setActiveTab('permissions')}/>
                        <TabItem
                            id="identity"
                            size="big"
                            label={t('rolesAndPermissions.detail.identityTab')}
                            isSelected={activeTab === 'identity'}
                            data-testid="role-tab-identity"
                            onClick={() => setActiveTab('identity')}/>
                    </Tab>

                    {activeTab === 'permissions' ?
                        <RolePermissionsTab role={role} catalog={catalog} onChanged={reload}/> :
                        <RoleIdentityTab
                            role={role}
                            roleGroups={answer.roleGroups}
                            language={language}
                            onSaved={reload}/>}
                </Paper>
            }/>
    );
};

RoleDetail.propTypes = {
    roleName: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired
};

export default RoleDetail;
