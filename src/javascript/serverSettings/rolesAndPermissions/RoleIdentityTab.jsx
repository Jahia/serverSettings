import React, {useImperativeHandle, useState} from 'react';
import PropTypes from 'prop-types';
import {useMutation} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Button, Chip, Field, Input, Switch, Textarea, Typography} from '@jahia/moonstone';
import {SAVE_ROLE_METADATA, SAVE_ROLE_TEXT} from './RolesAndPermissions.gql-queries';
import classes from './styles.css';

/**
 * The scopes on which a node type restriction means something.
 *
 * j:nodeTypes narrows the content a role can be granted on. A server, system or site role is granted
 * on the server, the system tools or the site itself, never on a piece of content, so the restriction
 * has nothing to act on there.
 */
const NODE_TYPE_SCOPES = ['edit-role', 'live-role'];

export const grantableOnApplies = role => NODE_TYPE_SCOPES.includes(role.roleGroup);

export const RoleIdentityTab = ({role, language, saveRef, onSaved}) => {
    const {t} = useTranslation('serverSettings');

    const [title, setTitle] = useState(role.title || '');
    const [description, setDescription] = useState(role.description || '');
    const [nodeTypes, setNodeTypes] = useState((role.nodeTypes || []).join(', '));
    const [hidden, setHidden] = useState(role.isHidden);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    const showNodeTypes = grantableOnApplies(role);

    const [saveMetadata] = useMutation(SAVE_ROLE_METADATA);
    const [saveText] = useMutation(SAVE_ROLE_TEXT);

    // The dialog puts Save in its footer, where it stays in view however long the form is, so the
    // form hands its save up rather than drawing a button that scrolls away.
    const save = async () => {
        setSaving(true);
        setSaved(false);
        setError(null);
        try {
            // The plain properties and the i18n text take two different paths. The title and the
            // description are i18n on the role, and the generic JCR mutation carries no language.
            //
            // The privileged access is not on this form and the node types are absent on a scope they
            // do not apply to, so both are written back as they were read. The mutation replaces every
            // property it names, and leaving one out of the variables would clear it.
            await saveMetadata({
                variables: {
                    path: role.path,
                    nodeTypes: showNodeTypes ?
                        nodeTypes.split(',').map(value => value.trim()).filter(Boolean) :
                        (role.nodeTypes || []),
                    hidden: String(hidden),
                    privileged: String(role.hasPrivilegedAccess)
                }
            });

            await saveText({
                variables: {
                    role: role.name,
                    language,
                    title: title.trim() === '' ? null : title,
                    description: description.trim() === '' ? null : description
                }
            });
            setSaved(true);
            onSaved();
        } catch (mutationError) {
            setError(mutationError.message);
            // The error is shown here AND rethrown. The dialog owns the footer, so a caller that
            // swallowed this would report a save that did not happen.
            throw mutationError;
        } finally {
            setSaving(false);
        }
    };

    // A ref assigned in the render body outlives a render React discards, which is the one thing a
    // render is asked not to leave behind. This says the same thing where React expects it.
    useImperativeHandle(saveRef, () => ({save}));

    return (
        <div className={classes.form} data-testid="role-identity-tab">
            <Field
                id="role-title-field"
                data-testid="role-title-field"
                label={t('rolesAndPermissions.detail.title', {language})}
                helper={t('rolesAndPermissions.detail.titleHint')}
            >
                <Input
                    className={classes.textInput}
                    value={title}
                    data-testid="role-title-input"
                    onChange={event => {
                        setSaved(false);
                        setTitle(event.target.value);
                    }}/>
            </Field>

            <Field
                id="role-description-field"
                data-testid="role-description-field"
                label={t('rolesAndPermissions.detail.description', {language})}
            >
                <Textarea
                    className={classes.textInput}
                    value={description}
                    data-testid="role-description-input"
                    onChange={event => {
                        setSaved(false);
                        setDescription(event.target.value);
                    }}/>
            </Field>

            {showNodeTypes ?
                <Field
                    id="role-nodetypes-field"
                    data-testid="role-nodetypes-field"
                    label={t('rolesAndPermissions.detail.nodeTypes')}
                    helper={t('rolesAndPermissions.detail.nodeTypesHint')}
                >
                    <Input
                        className={classes.textInput}
                        value={nodeTypes}
                        placeholder="rep:root, jnt:virtualsite"
                        data-testid="role-nodetypes-input"
                        onChange={event => {
                            setSaved(false);
                            setNodeTypes(event.target.value);
                        }}/>
                </Field> :
                null}

            <Field id="role-hidden-field" data-testid="role-hidden-field" label={t('rolesAndPermissions.detail.visibility')}>
                <span className={classes.switchRow}>
                    <Switch
                        checked={hidden}
                        data-testid="role-hidden-switch"
                        onChange={() => {
                            setSaved(false);
                            setHidden(!hidden);
                        }}/>
                    <Typography variant="body">{t('rolesAndPermissions.list.hidden')}</Typography>
                </span>
            </Field>

            {role.dependencies.length > 0 ?
                <Field id="role-dependencies-field" data-testid="role-dependencies-field" label={t('rolesAndPermissions.detail.dependencies')}>
                    <div className={classes.chipRow}>
                        {role.dependencies.map(dependency => (
                            <Chip key={dependency} label={dependency}/>
                        ))}
                    </div>
                </Field> :
                null}

            {role.subRoleNames.length > 0 ?
                <Field id="role-subroles-field" data-testid="role-subroles-field" label={t('rolesAndPermissions.detail.subRoles')}>
                    <div className={classes.chipRow}>
                        {role.subRoleNames.map(subRole => (
                            <Chip key={subRole} label={subRole}/>
                        ))}
                    </div>
                </Field> :
                null}

            {error ?
                <Typography variant="body" className={classes.formError} data-testid="role-identity-error">
                    {error}
                </Typography> :
                null}

            {saveRef ?
                null :
                <div className={classes.formActions}>
                    <Button
                        size="big"
                        color="accent"
                        isDisabled={saving}
                        label={t('rolesAndPermissions.detail.save')}
                        data-testid="role-identity-save"
                        onClick={save}/>
                    {saved ?
                        <Typography variant="body" data-testid="role-identity-saved">
                            {t('rolesAndPermissions.detail.saved')}
                        </Typography> :
                        null}
                </div>}
        </div>
    );
};

RoleIdentityTab.propTypes = {
    role: PropTypes.shape({
        name: PropTypes.string.isRequired,
        path: PropTypes.string.isRequired,
        title: PropTypes.string,
        description: PropTypes.string,
        roleGroup: PropTypes.string,
        nodeTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
        dependencies: PropTypes.arrayOf(PropTypes.string).isRequired,
        subRoleNames: PropTypes.arrayOf(PropTypes.string).isRequired,
        isHidden: PropTypes.bool.isRequired,
        hasPrivilegedAccess: PropTypes.bool.isRequired
    }).isRequired,
    /** When given, the form writes its save handler here and draws no button of its own. */
    saveRef: PropTypes.object,
    language: PropTypes.string.isRequired,
    onSaved: PropTypes.func.isRequired
};

RoleIdentityTab.defaultProps = {saveRef: null};

export default RoleIdentityTab;
