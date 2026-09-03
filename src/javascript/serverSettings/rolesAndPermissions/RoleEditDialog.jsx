import React, {useRef, useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Button, Modal, ModalBody, ModalFooter, ModalHeader, Typography} from '@jahia/moonstone';
import RoleIdentityTab from './RoleIdentityTab';
import classes from './styles.css';

// Editing the role itself: what it is called, where it applies, and how it may be granted.
//
// It is a dialog and not a second page, for the same reason creating a role is a dialog. Editing a
// role is a detour from the thing the page is for, which is deciding what the role grants, and a
// detour that keeps its subject on screen behind it is easier to come back from.
export const RoleEditDialog = ({role, roleGroups, language, onSaved, onClose}) => {
    const {t} = useTranslation('serverSettings');
    const form = useRef(null);
    const [isSaved, setSaved] = useState(false);
    const [isSaving, setSaving] = useState(false);

    return (
        <Modal isOpen size="big" onOpenChange={open => !open && onClose()}>
            <div data-testid="role-edit-dialog">
                <ModalHeader title={t('rolesAndPermissions.detail.editTitle', {role: role.name})}/>
                <ModalBody>
                    {/*
                      * The form is taller than a short window, and the modal grows with its content
                      * rather than capping itself, so the footer went off screen and Save with it.
                      * The form scrolls inside the dialog instead.
                      */}
                    <div className={classes.editBody}>
                        <RoleIdentityTab
                            role={role}
                            roleGroups={roleGroups}
                            language={language}
                            saveRef={form}
                            onSaved={onSaved}/>
                    </div>
                </ModalBody>
                {/*
                  * Save sits in the footer and not in the form. The form is long enough to scroll, and
                  * a button that scrolls out of the dialog is a button an administrator has to go
                  * looking for.
                  */}
                <ModalFooter>
                    {isSaved ?
                        <Typography variant="body" data-testid="role-identity-saved">
                            {t('rolesAndPermissions.detail.saved')}
                        </Typography> :
                        null}
                    <Button
                        variant="ghost"
                        size="big"
                        label={t('rolesAndPermissions.detail.close')}
                        data-testid="role-edit-close"
                        onClick={onClose}/>
                    {/*
                      * "Saved" is shown only when the save resolved. The form writes three mutations
                      * in sequence and reports a refusal in its own body, so a footer that announced
                      * the save regardless would contradict the message beside it.
                      *
                      * The button is disabled while the three run, because a second click sends them
                      * again.
                      */}
                    <Button
                        size="big"
                        color="accent"
                        isDisabled={isSaving}
                        label={t('rolesAndPermissions.detail.save')}
                        data-testid="role-identity-save"
                        onClick={async () => {
                            setSaved(false);
                            setSaving(true);
                            try {
                                await form.current.save();
                                setSaved(true);
                            } catch {
                                // The form states the refusal in its own body.
                            } finally {
                                setSaving(false);
                            }
                        }}/>
                </ModalFooter>
            </div>
        </Modal>
    );
};

RoleEditDialog.propTypes = {
    role: PropTypes.object.isRequired,
    roleGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
    language: PropTypes.string.isRequired,
    onSaved: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired
};

export default RoleEditDialog;
