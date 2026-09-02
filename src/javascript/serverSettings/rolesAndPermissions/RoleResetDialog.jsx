import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Button, Chip, Input, Loader, Modal, ModalBody, ModalFooter, ModalHeader, Typography} from '@jahia/moonstone';
import classes from './styles.css';

// One side of the difference: the names written, and the permissions the role then grants or stops
// granting. Both are shown because they differ. A granted permission grants its descendants, so one
// added name can add fifty permissions, and a reader who only saw the names would not know.
const DiffSide = ({direction, names, permissions, t}) => {
    if (names.length === 0) {
        return null;
    }

    const extra = permissions.length - names.length;
    return (
        <div className={classes.diffSide} data-testid={`reset-diff-${direction}`}>
            <Typography isUpperCase variant="caption" className={classes.fieldLabel}>
                {t(`rolesAndPermissions.reset.${direction}`, {count: names.length})}
            </Typography>
            <div className={classes.chipRow}>
                {names.map(name => (
                    <Chip key={name} label={name} data-testid={`reset-${direction}-${name}`}/>
                ))}
            </div>
            {extra > 0 ?
                <Typography variant="caption" className={classes.fieldHint} data-testid={`reset-${direction}-reach`}>
                    {t(`rolesAndPermissions.reset.${direction}Reach`, {
                        count: permissions.length,
                        extra
                    })}
                </Typography> :
                null}
        </div>
    );
};

DiffSide.propTypes = {
    direction: PropTypes.oneOf(['adds', 'removes']).isRequired,
    names: PropTypes.arrayOf(PropTypes.string).isRequired,
    permissions: PropTypes.arrayOf(PropTypes.string).isRequired,
    t: PropTypes.func.isRequired
};

// The difference a reset would make, shown before anything is written.
//
// The baseline is what the installed sources declare, which is what a fresh instance carrying this
// core version and this module set would hold. It is NOT the state the role had a minute ago, so the
// dialog names its sources and shows what goes as well as what comes back.
export const RoleResetDialog = ({roleName, plan, error, isApplying, onConfirm, onCancel}) => {
    const {t} = useTranslation('serverSettings');
    const [typed, setTyped] = useState('');

    // Typing the name is asked for when the role would start granting something it does not grant
    // today. Restoring what was lost costs nothing; widening a role is the change worth a pause.
    const gated = plan.widening;
    const ready = !gated || typed.trim() === roleName;

    const changed = plan.targets.filter(target => target.addedNames.length > 0 || target.removedNames.length > 0);

    return (
        <Modal isOpen size="big" onOpenChange={open => !open && onCancel()}>
            <div data-testid="role-reset-dialog">
                <ModalHeader title={t('rolesAndPermissions.reset.title', {role: roleName})}/>
                <ModalBody>
                    <Typography variant="body" data-testid="reset-baseline">
                        {t('rolesAndPermissions.reset.baseline', {sources: plan.sourceLabels.join(', ')})}
                    </Typography>

                    {plan.unreadableSources.length > 0 ?
                        <Typography variant="body" className={classes.formError} data-testid="reset-incomplete">
                            {t('rolesAndPermissions.reset.incomplete', {sources: plan.unreadableSources.join(', ')})}
                        </Typography> :
                        null}

                    {plan.roleExists ? null :
                    <Typography variant="body" data-testid="reset-recreates">
                        {t('rolesAndPermissions.reset.recreates')}
                    </Typography>}

                    {changed.map(target => (
                        <div key={target.id} className={classes.diffTarget} data-testid={`reset-target-${target.id || 'own'}`}>
                            <Typography variant="subheading">
                                {target.id ?
                                    t('rolesAndPermissions.reset.onTarget', {path: target.path || target.id}) :
                                    t('rolesAndPermissions.reset.onRole')}
                            </Typography>
                            <DiffSide direction="adds" names={target.addedNames} permissions={target.gainedPermissions} t={t}/>
                            <DiffSide direction="removes" names={target.removedNames} permissions={target.lostPermissions} t={t}/>
                        </div>
                    ))}

                    {plan.targets.filter(target => target.kind === 'LIVE_ONLY').map(target => (
                        <Typography
                            key={target.id}
                            variant="caption"
                            className={classes.fieldHint}
                            data-testid={`reset-kept-${target.id}`}
                        >
                            {t('rolesAndPermissions.reset.keptTarget', {path: target.path || target.id})}
                        </Typography>
                    ))}

                    {plan.roleGroupChange || plan.privilegedAccessChange || plan.hiddenChange ?
                        <Typography variant="caption" className={classes.fieldHint} data-testid="reset-identity">
                            {t('rolesAndPermissions.reset.identity', {
                                changes: [
                                    plan.roleGroupChange && t('rolesAndPermissions.reset.roleGroupChange', {value: plan.roleGroupChange}),
                                    plan.privilegedAccessChange && t('rolesAndPermissions.reset.privilegedChange', {value: plan.privilegedAccessChange}),
                                    plan.hiddenChange && t('rolesAndPermissions.reset.hiddenChange', {value: plan.hiddenChange})
                                ].filter(Boolean).join(', ')
                            })}
                        </Typography> :
                        null}

                    {gated ?
                        <div className={classes.formField}>
                            <Typography isUpperCase variant="caption" className={classes.fieldLabel}>
                                {t('rolesAndPermissions.reset.typeToConfirm')}
                            </Typography>
                            <Typography variant="body" className={classes.confirmWord} data-testid="reset-expected">
                                {roleName}
                            </Typography>
                            <Input
                                className={classes.textInput}
                                value={typed}
                                data-testid="reset-word"
                                onChange={event => setTyped(event.target.value)}/>
                        </div> :
                        null}

                    {error ?
                        <Typography variant="body" className={classes.formError} data-testid="reset-error">{error}</Typography> :
                        null}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        size="big"
                        label={t('rolesAndPermissions.dialog.cancel')}
                        data-testid="reset-cancel"
                        onClick={onCancel}/>
                    <Button
                        size="big"
                        color={plan.widening ? 'danger' : 'accent'}
                        isDisabled={!ready || isApplying}
                        icon={isApplying ? <Loader size="small"/> : null}
                        label={t('rolesAndPermissions.reset.confirm')}
                        data-testid="reset-confirm"
                        onClick={onConfirm}/>
                </ModalFooter>
            </div>
        </Modal>
    );
};

RoleResetDialog.propTypes = {
    roleName: PropTypes.string.isRequired,
    plan: PropTypes.shape({
        widening: PropTypes.bool.isRequired,
        roleExists: PropTypes.bool.isRequired,
        sourceLabels: PropTypes.arrayOf(PropTypes.string).isRequired,
        unreadableSources: PropTypes.arrayOf(PropTypes.string).isRequired,
        targets: PropTypes.array.isRequired,
        roleGroupChange: PropTypes.string,
        privilegedAccessChange: PropTypes.string,
        hiddenChange: PropTypes.string
    }).isRequired,
    error: PropTypes.string,
    isApplying: PropTypes.bool,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

RoleResetDialog.defaultProps = {error: null, isApplying: false};

export default RoleResetDialog;
