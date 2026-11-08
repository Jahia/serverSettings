import React from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Button, Modal, ModalBody, ModalFooter, ModalHeader, Typography} from '@jahia/moonstone';
import classes from './styles.css';

// One dialog for both operations, because both answer the same question: what does this change cost.
// It is shown only when the effect exceeds the row the administrator clicked, so a plain removal with
// no consequence never opens it.
const NameList = ({label, names, testId}) => {
    if (names.length === 0) {
        return null;
    }

    return (
        <div data-testid={testId}>
            <Typography isUpperCase variant="caption" className={classes.fieldLabel}>{label}</Typography>
            <ul className={classes.dialogList}>
                {names.map(name => <li key={name}><Typography variant="caption">{name}</Typography></li>)}
            </ul>
        </div>
    );
};

NameList.propTypes = {
    label: PropTypes.string.isRequired,
    names: PropTypes.arrayOf(PropTypes.string).isRequired,
    testId: PropTypes.string
};

NameList.defaultProps = {testId: undefined};

export const PermissionChangeDialog = ({change, onConfirm, onCancel}) => {
    const {t} = useTranslation('serverSettings');

    if (!change) {
        return null;
    }

    const {kind, permission, plan} = change;
    const blocked = kind === 'revoke' && plan.outcome === 'BLOCKED_BY_PARENT_ROLE';

    // A parent role holding the permission does not always make the change pointless. When the target
    // names the permission too, removing that name is the change, and the permission stays granted by
    // the parent. Only a plan that removes no name at all has nothing to apply.
    const nothingToApply = blocked && plan.removedPermissions.length === 0;

    const headline = () => {
        if (nothingToApply) {
            return t('rolesAndPermissions.dialog.blocked', {permission, role: plan.blockedBy});
        }

        if (blocked) {
            return t('rolesAndPermissions.dialog.blockedButNamed', {permission, role: plan.blockedBy});
        }

        if (kind === 'collapse') {
            return t('rolesAndPermissions.dialog.collapse', {
                permission,
                count: plan.removedPermissions.length
            });
        }

        if (plan.outcome === 'EXPANDS_ANCESTORS') {
            return t('rolesAndPermissions.dialog.expands', {
                permission,
                ancestor: plan.removedPermissions[0],
                count: plan.addedPermissions.length
            });
        }

        return t('rolesAndPermissions.dialog.cascades', {
            permission,
            count: Math.max(plan.lostPermissions.length - 1, 0)
        });
    };

    return (
        <Modal isOpen size="medium" onOpenChange={open => !open && onCancel()}>
            <div data-testid="permission-change-dialog">
                <ModalHeader title={t(`rolesAndPermissions.dialog.${kind}Title`)}/>
                <ModalBody>
                    <Typography variant="body" data-testid="permission-change-headline">{headline()}</Typography>

                    {/*
                      * A blocked plan loses nothing, because the parent role goes on granting the
                      * permission. Listing the effective sets there would state a loss that does not
                      * happen, so only the names removed from this role are shown.
                      */}
                    {blocked ?
                        <NameList
                            testId="permission-change-removed"
                            label={t('rolesAndPermissions.dialog.removed')}
                            names={plan.removedPermissions}/> :
                        <>
                            <NameList
                                testId="permission-change-lost"
                                label={kind === 'collapse' ?
                                    t('rolesAndPermissions.dialog.gained') :
                                    t('rolesAndPermissions.dialog.lost')}
                                names={kind === 'collapse' ? plan.gainedPermissions : plan.lostPermissions}/>
                            <NameList
                                testId="permission-change-added"
                                label={t('rolesAndPermissions.dialog.added')}
                                names={plan.addedPermissions}/>
                            <NameList
                                testId="permission-change-removed"
                                label={t('rolesAndPermissions.dialog.removed')}
                                names={plan.removedPermissions}/>
                        </>}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        size="big"
                        label={t('rolesAndPermissions.dialog.cancel')}
                        data-testid="permission-change-cancel"
                        onClick={onCancel}/>
                    {nothingToApply ?
                        null :
                        <Button
                            size="big"
                            color="accent"
                            label={t('rolesAndPermissions.dialog.confirm')}
                            data-testid="permission-change-confirm"
                            onClick={onConfirm}/>}
                </ModalFooter>
            </div>
        </Modal>
    );
};

PermissionChangeDialog.propTypes = {
    change: PropTypes.shape({
        kind: PropTypes.oneOf(['revoke', 'collapse']).isRequired,
        permission: PropTypes.string.isRequired,
        plan: PropTypes.object.isRequired
    }),
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

PermissionChangeDialog.defaultProps = {change: null};

export default PermissionChangeDialog;
