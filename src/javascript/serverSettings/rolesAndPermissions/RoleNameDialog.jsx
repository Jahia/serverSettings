import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Button, Checkbox, Dropdown, Input, Modal, ModalBody, ModalFooter, ModalHeader, Typography} from '@jahia/moonstone';
import classes from './styles.css';

const NO_PARENT = '';

// Creating a role and copying one both come down to naming it, so one dialog carries both. A name
// another role already carries is refused by the server, and the message it answers is shown here.
//
// A new role can be nested inside another one, which is a different thing from copying it. A nested
// role ADDS to its parent and can never subtract from it, while a copy is independent and merely
// starts with the same permission names. The dialog says so, because that is where the two get
// confused.
export const RoleNameDialog = ({mode, sourceRole, roleGroups, roleNames, error, onConfirm, onCancel}) => {
    const {t} = useTranslation('serverSettings');
    const [name, setName] = useState(mode === 'duplicate' ? `${sourceRole}-copy` : '');
    const [roleGroup, setRoleGroup] = useState(roleGroups[0] || '');
    const [parentRole, setParentRole] = useState(NO_PARENT);
    const [withSubRoles, setWithSubRoles] = useState(false);

    return (
        <Modal isOpen size="medium" onOpenChange={open => !open && onCancel()}>
            <div data-testid="role-name-dialog">
                <ModalHeader title={t(`rolesAndPermissions.list.${mode}Title`, {role: sourceRole})}/>
                <ModalBody>
                    <div className={classes.formField}>
                        <Typography isUpperCase variant="caption" className={classes.fieldLabel}>
                            {t('rolesAndPermissions.list.roleName')}
                        </Typography>
                        <Input
                            className={classes.textInput}
                            value={name}
                            data-testid="role-name-input"
                            onChange={event => setName(event.target.value)}/>
                        <Typography variant="caption" className={classes.fieldHint}>
                            {t('rolesAndPermissions.list.roleNameHint')}
                        </Typography>
                    </div>

                    {mode === 'create' ?
                        <>
                            <div className={classes.formField}>
                                <Typography isUpperCase variant="caption" className={classes.fieldLabel}>
                                    {t('rolesAndPermissions.detail.scope')}
                                </Typography>
                                <Dropdown
                                    variant="outlined"
                                    size="small"
                                    value={roleGroup}
                                    data-testid="role-new-scope"
                                    data={roleGroups.map(group => ({
                                        label: group,
                                        value: group,
                                        attributes: {'data-testid': `role-new-scope-${group}`}
                                    }))}
                                    onChange={(event, item) => setRoleGroup(item.value)}/>
                            </div>

                            <div className={classes.formField}>
                                <Typography isUpperCase variant="caption" className={classes.fieldLabel}>
                                    {t('rolesAndPermissions.list.parentRole')}
                                </Typography>
                                <Dropdown
                                    variant="outlined"
                                    size="small"
                                    value={parentRole}
                                    data-testid="role-new-parent"
                                    data={[
                                        {
                                            label: t('rolesAndPermissions.list.noParentRole'),
                                            value: NO_PARENT,
                                            attributes: {'data-testid': 'role-new-parent-none'}
                                        },
                                        ...roleNames.map(candidate => ({
                                            label: candidate,
                                            value: candidate,
                                            attributes: {'data-testid': `role-new-parent-${candidate}`}
                                        }))
                                    ]}
                                    onChange={(event, item) => setParentRole(item.value)}/>
                                <Typography variant="caption" className={classes.fieldHint}>
                                    {t('rolesAndPermissions.list.parentRoleHint')}
                                </Typography>
                            </div>
                        </> :
                        <div className={classes.switchRow}>
                            <Checkbox
                                checked={withSubRoles}
                                data-testid="role-with-subroles"
                                onChange={() => setWithSubRoles(!withSubRoles)}/>
                            <Typography variant="body">{t('rolesAndPermissions.list.withSubRoles')}</Typography>
                        </div>}

                    {error ?
                        <Typography variant="body" className={classes.formError} data-testid="role-name-error">
                            {error}
                        </Typography> :
                        null}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        size="big"
                        label={t('rolesAndPermissions.dialog.cancel')}
                        data-testid="role-name-cancel"
                        onClick={onCancel}/>
                    <Button
                        size="big"
                        color="accent"
                        isDisabled={name.trim() === ''}
                        label={t('rolesAndPermissions.dialog.confirm')}
                        data-testid="role-name-confirm"
                        onClick={() => onConfirm({
                            name: name.trim(),
                            roleGroup,
                            parentRole: parentRole === NO_PARENT ? null : parentRole,
                            withSubRoles
                        })}/>
                </ModalFooter>
            </div>
        </Modal>
    );
};

RoleNameDialog.propTypes = {
    mode: PropTypes.oneOf(['create', 'duplicate']).isRequired,
    sourceRole: PropTypes.string,
    roleGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
    roleNames: PropTypes.arrayOf(PropTypes.string).isRequired,
    error: PropTypes.string,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

RoleNameDialog.defaultProps = {sourceRole: null, error: null};

export default RoleNameDialog;
