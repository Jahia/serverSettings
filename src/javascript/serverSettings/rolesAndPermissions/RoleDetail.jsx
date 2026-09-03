import React, {useCallback, useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {useLazyQuery, useMutation, useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {
    Button,
    ChevronLeft,
    Edit,
    EmptyData,
    Header,
    LayoutContent,
    Loader,
    Menu,
    MenuItem,
    MoreVert,
    Paper
} from '@jahia/moonstone';
import {
    DELETE_ROLE,
    DUPLICATE_ROLE,
    GET_PERMISSION_CATALOG,
    GET_ROLE,
    RESET_ROLE,
    ROLE_RESET_PLAN
} from './RolesAndPermissions.gql-queries';
import RoleEditDialog from './RoleEditDialog';
import RolePermissionsTab from './RolePermissionsTab';
import RoleNameDialog from './RoleNameDialog';
import RoleResetDialog from './RoleResetDialog';
import ConfirmDestructiveDialog from './ConfirmDestructiveDialog';
import {deleteConsequences, isCostlyDelete} from './roleDelete';
import RoleWarnings from './RoleWarnings';
import classes from './styles.css';

// The header of the role page. The action you came for is a button, and everything else that acts on
// the role as a whole is behind the menu, which is the rule the role list follows too.
const RoleHeader = ({role, roleName, menuAnchor, t, onClose, onEdit, onToggleMenu}) => (
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
        mainActions={role ? [
            <RoleWarnings key="warnings" roleName={role.name} warnings={role.warnings}/>,
            <Button
                key="edit"
                size="big"
                color="accent"
                icon={<Edit/>}
                label={t('rolesAndPermissions.detail.edit')}
                data-testid="role-edit"
                onClick={onEdit}/>,
            <span key="more" ref={menuAnchor} className={classes.rowActions}>
                <Button
                    size="big"
                    variant="ghost"
                    icon={<MoreVert/>}
                    aria-label={t('rolesAndPermissions.detail.moreActions')}
                    title={t('rolesAndPermissions.detail.moreActions')}
                    data-testid="role-more-actions"
                    onClick={onToggleMenu}/>
            </span>
        ] : []}/>
);

RoleHeader.propTypes = {
    role: PropTypes.object,
    roleName: PropTypes.string.isRequired,
    menuAnchor: PropTypes.object.isRequired,
    t: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
    onEdit: PropTypes.func.isRequired,
    onToggleMenu: PropTypes.func.isRequired
};

RoleHeader.defaultProps = {role: null};

// One role, and what it grants.
//
// The page has one subject, so it shows one thing: the permissions. Everything that acts on the role
// as a whole sits in the header and follows the rule the role list follows: the action you came for is
// a button, and the rest is behind the menu. The role name is the page title, so the body never
// repeats it.
export const RoleDetail = ({roleName, onClose, onOpenRole}) => {
    const {t, i18n} = useTranslation('serverSettings');
    const language = i18n.language || 'en';

    const [dialog, setDialog] = useState(null);
    const [dialogError, setDialogError] = useState(null);
    const [isMenuOpen, setMenuOpen] = useState(false);
    const [resetPlan, setResetPlan] = useState(null);
    const [isApplyingReset, setApplyingReset] = useState(false);
    const menuAnchor = useRef(null);

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
    const reload = roleQuery.refetch;

    const [duplicateRole] = useMutation(DUPLICATE_ROLE);
    const [deleteRole] = useMutation(DELETE_ROLE);
    const [resetRole] = useMutation(RESET_ROLE);

    // The plan is read when the reset is asked for, and never with the role. Reading it walks every
    // installed module bundle, which is not work to do on a page that may never reset anything.
    const [readResetPlan] = useLazyQuery(ROLE_RESET_PLAN, {
        fetchPolicy: 'network-only',
        onCompleted: data => {
            const plan = data?.admin?.rolesAndPermissions?.role?.resetPlan;
            if (!plan?.applicable) {
                setDialogError(t('rolesAndPermissions.reset.notDeclared'));
                return;
            }

            if (plan.noop) {
                setDialogError(t('rolesAndPermissions.reset.alreadyMatches'));
                return;
            }

            setResetPlan({...plan, revision: data.admin.rolesAndPermissions.role.revision});
        },
        onError: () => setDialogError(t('rolesAndPermissions.reset.planFailed'))
    });

    // The dialog answers with everything it collected, and the copy needs the name and whether the
    // roles nested inside come along.
    const onCloned = useCallback(async ({name: newName, withSubRoles}) => {
        setDialogError(null);
        try {
            await duplicateRole({variables: {role: roleName, newName, withSubRoles: Boolean(withSubRoles)}});
            setDialog(null);
            // The copy is what the administrator asked for, so the copy is what they land on.
            onOpenRole(newName);
        } catch (e) {
            setDialogError(e.message);
        }
    }, [duplicateRole, roleName, onOpenRole]);

    const onDeleted = useCallback(async () => {
        setDialogError(null);
        try {
            await deleteRole({variables: {role: roleName}});
        } catch (mutationError) {
            // The dialog stays open on the refusal. Closing it and leaving the page would report the
            // deletion the confirmation just asked about.
            setDialogError(mutationError.message);
            return;
        }

        setDialog(null);
        // The page has lost its subject, so it cannot stay open on it.
        onClose();
    }, [deleteRole, roleName, onClose]);

    const onReset = useCallback(async () => {
        setApplyingReset(true);
        setDialogError(null);
        try {
            const result = await resetRole({variables: {role: roleName, revision: resetPlan.revision}});
            const outcome = result?.data?.admin?.rolesAndPermissions?.resetRoleToDeclared?.outcome;
            if (outcome === 'REFUSED_STALE_REVISION') {
                // Somebody wrote to the role between the preview and the apply, so the difference on
                // screen is not the difference that would be written.
                setDialogError(t('rolesAndPermissions.reset.stale'));
                return;
            }

            setResetPlan(null);
            reload();
        } catch (e) {
            setDialogError(e.message);
        } finally {
            setApplyingReset(false);
        }
    }, [resetRole, roleName, resetPlan, reload, t]);

    const openDialog = action => {
        setMenuOpen(false);
        setDialogError(null);
        setDialog(action);
    };

    const header = (
        <RoleHeader
            role={role}
            roleName={roleName}
            menuAnchor={menuAnchor}
            t={t}
            onClose={onClose}
            onEdit={() => openDialog('edit')}
            onToggleMenu={() => setMenuOpen(open => !open)}/>
    );

    if (loading) {
        return (
            <LayoutContent
                isLoading
                header={header}
                content={<Paper><div className={classes.detailEmpty}><Loader size="big"/></div></Paper>}/>
        );
    }

    // A read that failed and a role that is not there are different facts. Reporting a refusal or a
    // network failure as a missing role sends the administrator looking for a role that does exist.
    const readError = roleQuery.error || catalogQuery.error;
    if (readError || !role) {
        return (
            <LayoutContent
                header={header}
                content={
                    <Paper>
                        <div className={classes.detailEmpty} data-testid="role-detail-error">
                            <EmptyData message={readError ?
                                t('rolesAndPermissions.detail.readFailed', {error: readError.message}) :
                                t('rolesAndPermissions.detail.notFound', {name: roleName})}/>
                        </div>
                    </Paper>
                }/>
        );
    }

    return (
        <LayoutContent
            header={header}
            content={
                <Paper>
                    <RolePermissionsTab role={role} catalog={catalog} onChanged={reload}/>

                    <Menu
                        isDisplayed={isMenuOpen}
                        anchorEl={menuAnchor}
                        data-testid="role-actions-menu"
                        onClose={() => setMenuOpen(false)}
                    >
                        <MenuItem
                            label={t('rolesAndPermissions.list.duplicate')}
                            data-testid="role-action-clone"
                            onClick={() => openDialog('clone')}/>
                        <MenuItem
                            label={t('rolesAndPermissions.reset.action')}
                            data-testid="role-action-reset"
                            onClick={() => {
                                setMenuOpen(false);
                                setDialogError(null);
                                readResetPlan({variables: {role: roleName}});
                            }}/>
                        <MenuItem
                            label={t('rolesAndPermissions.list.delete')}
                            data-testid="role-action-delete"
                            onClick={() => openDialog('delete')}/>
                    </Menu>

                    {dialogError && !dialog && !resetPlan ?
                        <div className={classes.targetBar} data-testid="role-action-message">
                            <EmptyData message={dialogError}/>
                        </div> :
                        null}

                    {dialog === 'edit' ?
                        <RoleEditDialog
                            role={role}
                            roleGroups={answer.roleGroups}
                            language={language}
                            onSaved={reload}
                            onClose={() => setDialog(null)}/> :
                        null}

                    {dialog === 'clone' ?
                        <RoleNameDialog
                            mode="duplicate"
                            sourceRole={role.name}
                            roleGroups={answer.roleGroups}
                            roleNames={[]}
                            error={dialogError}
                            onConfirm={onCloned}
                            onCancel={() => setDialog(null)}/> :
                        null}

                    {dialog === 'delete' ?
                        <ConfirmDestructiveDialog
                            title={t('rolesAndPermissions.confirm.deleteTitle', {role: role.name})}
                            confirmLabel={t('rolesAndPermissions.confirm.deleteConfirm')}
                            message={t('rolesAndPermissions.confirm.deleteMessage')}
                            consequences={deleteConsequences(role, t)}
                            confirmWord={isCostlyDelete(role) ? role.name : null}
                            error={dialogError}
                            onConfirm={onDeleted}
                            onCancel={() => setDialog(null)}/> :
                        null}

                    {resetPlan ?
                        <RoleResetDialog
                            roleName={role.name}
                            plan={resetPlan}
                            error={dialogError}
                            isApplying={isApplyingReset}
                            onConfirm={onReset}
                            onCancel={() => {
                                setResetPlan(null);
                                setDialogError(null);
                            }}/> :
                        null}
                </Paper>
            }/>
    );
};

RoleDetail.propTypes = {
    roleName: PropTypes.string.isRequired,
    onClose: PropTypes.func.isRequired,
    onOpenRole: PropTypes.func.isRequired
};

export default RoleDetail;
