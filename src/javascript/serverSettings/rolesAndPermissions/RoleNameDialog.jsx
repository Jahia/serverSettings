import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Button, Checkbox, Dropdown, Input, Modal, ModalBody, ModalFooter, ModalHeader, Typography} from '@jahia/moonstone';
import classes from './styles.css';

// Creating a role and copying one both come down to naming it, so one dialog carries both. A name
// another role already carries is refused by the server, and the message it answers is shown here.
export const RoleNameDialog = ({mode, sourceRole, roleGroups, error, onConfirm, onCancel}) => {
    const {t} = useTranslation('serverSettings');
    const [name, setName] = useState(mode === 'duplicate' ? `${sourceRole}-copy` : '');
    const [roleGroup, setRoleGroup] = useState(roleGroups[0] || '');
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
                        </div> :
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
                        onClick={() => onConfirm({name: name.trim(), roleGroup, withSubRoles})}/>
                </ModalFooter>
            </div>
        </Modal>
    );
};

RoleNameDialog.propTypes = {
    mode: PropTypes.oneOf(['create', 'duplicate']).isRequired,
    sourceRole: PropTypes.string,
    roleGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
    error: PropTypes.string,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

RoleNameDialog.defaultProps = {sourceRole: null, error: null};

export default RoleNameDialog;
