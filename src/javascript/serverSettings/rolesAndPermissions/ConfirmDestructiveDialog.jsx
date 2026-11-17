import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Button, Field, Input, Modal, ModalBody, ModalFooter, ModalHeader, Typography} from '@jahia/moonstone';
import classes from './styles.css';

// The confirmation for an action that cannot be undone.
//
// It states the consequence rather than asking "are you sure", because an administrator who has read
// "are you sure" a hundred times does not read it the hundred and first time. And when the action
// takes something away from somebody, it asks for the name to be typed: the friction is proportionate
// to what is lost, and it makes the wrong row impossible to delete by a stray click.
export const ConfirmDestructiveDialog = ({title, message, consequences, confirmLabel, confirmWord, error, onConfirm, onCancel}) => {
    const {t} = useTranslation('serverSettings');
    const [typed, setTyped] = useState('');

    const gated = Boolean(confirmWord);
    const ready = !gated || typed.trim() === confirmWord;

    return (
        <Modal isOpen size="medium" onOpenChange={open => !open && onCancel()}>
            <div data-testid="confirm-destructive-dialog">
                <ModalHeader title={title}/>
                <ModalBody>
                    <Typography variant="body" data-testid="confirm-destructive-message">{message}</Typography>

                    {consequences.length > 0 ?
                        <ul className={classes.dialogList} data-testid="confirm-destructive-consequences">
                            {consequences.map(consequence => (
                                <li key={consequence}>
                                    <Typography variant="caption">{consequence}</Typography>
                                </li>
                            ))}
                        </ul> :
                        null}

                    {gated ?
                        <Field id="confirm-destructive-field" label={t('rolesAndPermissions.confirm.typeToConfirm')}>
                            {/*
                              * The word sits beside the label rather than inside it, and keeps its own
                              * case. A role name is case-sensitive, and a label that spells it out is
                              * one rename away from telling the administrator to type the wrong thing.
                              */}
                            <Typography variant="body" className={classes.confirmWord} data-testid="confirm-destructive-expected">
                                {confirmWord}
                            </Typography>
                            <Input
                                className={classes.textInput}
                                value={typed}
                                data-testid="confirm-destructive-word"
                                onChange={event => setTyped(event.target.value)}/>
                        </Field> :
                        null}

                    {error ?
                        <Typography variant="body" className={classes.formError} data-testid="confirm-destructive-error">
                            {error}
                        </Typography> :
                        null}
                </ModalBody>
                <ModalFooter>
                    <Button
                        variant="ghost"
                        size="big"
                        label={t('rolesAndPermissions.dialog.cancel')}
                        data-testid="confirm-destructive-cancel"
                        onClick={onCancel}/>
                    <Button
                        size="big"
                        color="danger"
                        isDisabled={!ready}
                        label={confirmLabel}
                        data-testid="confirm-destructive-confirm"
                        onClick={onConfirm}/>
                </ModalFooter>
            </div>
        </Modal>
    );
};

ConfirmDestructiveDialog.propTypes = {
    title: PropTypes.string.isRequired,
    message: PropTypes.string.isRequired,
    consequences: PropTypes.arrayOf(PropTypes.string),
    /** The verb on the confirm button. It names the action, so it is never "OK". */
    confirmLabel: PropTypes.string.isRequired,
    /** When set, the action stays disabled until this exact word is typed. */
    confirmWord: PropTypes.string,
    error: PropTypes.string,
    onConfirm: PropTypes.func.isRequired,
    onCancel: PropTypes.func.isRequired
};

ConfirmDestructiveDialog.defaultProps = {consequences: [], confirmWord: null, error: null};

export default ConfirmDestructiveDialog;
