import React, {useState} from 'react';
import PropTypes from 'prop-types';
import {useMutation} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Add, Button, Chip, Delete, Dropdown, Field, Input, Switch, Textarea, Typography} from '@jahia/moonstone';
import {ADD_TARGET, REMOVE_TARGET, SAVE_ROLE_GROUP, SAVE_ROLE_METADATA, SAVE_ROLE_TEXT} from './RolesAndPermissions.gql-queries';
import ConfirmDestructiveDialog from './ConfirmDestructiveDialog';
import classes from './styles.css';

export const RoleIdentityTab = ({role, roleGroups, language, saveRef, onSaved}) => {
    const {t} = useTranslation('serverSettings');

    const [title, setTitle] = useState(role.title || '');
    const [description, setDescription] = useState(role.description || '');
    const [roleGroup, setRoleGroup] = useState(role.roleGroup || '');
    const [nodeTypes, setNodeTypes] = useState((role.nodeTypes || []).join(', '));
    const [hidden, setHidden] = useState(role.isHidden);
    const [privileged, setPrivileged] = useState(role.hasPrivilegedAccess);
    const [newTargetPath, setNewTargetPath] = useState('');
    const [pendingTargetRemoval, setPendingTargetRemoval] = useState(null);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    const [addTarget] = useMutation(ADD_TARGET);
    const [removeTarget] = useMutation(REMOVE_TARGET);

    // A target is created and removed as its own write, and not on save. It carries permissions, so
    // batching it with the metadata would make one Save button do two very different things.
    const onAddTarget = async () => {
        const path = newTargetPath.trim();
        if (path === '') {
            return;
        }

        await addTarget({variables: {role: role.name, path}});
        setNewTargetPath('');
        onSaved();
    };

    const onRemoveTarget = async () => {
        await removeTarget({variables: {role: role.name, target: pendingTargetRemoval.id}});
        setPendingTargetRemoval(null);
        onSaved();
    };

    const [saveMetadata] = useMutation(SAVE_ROLE_METADATA);
    const [saveRoleGroup] = useMutation(SAVE_ROLE_GROUP);
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
            await saveMetadata({
                variables: {
                    path: role.path,
                    nodeTypes: nodeTypes.split(',').map(value => value.trim()).filter(Boolean),
                    hidden: String(hidden),
                    privileged: String(privileged)
                }
            });
            if (roleGroup !== (role.roleGroup || '')) {
                await saveRoleGroup({variables: {path: role.path, roleGroup}});
            }

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
        } finally {
            setSaving(false);
        }
    };

    if (saveRef) {
        saveRef.current = {save, isSaving: saving, isSaved: saved};
    }

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

            <Field
                id="role-scope-field"
                data-testid="role-scope-field"
                label={t('rolesAndPermissions.detail.scope')}
                helper={t('rolesAndPermissions.detail.scopeHint')}
            >
                <Dropdown
                    variant="outlined"
                    size="small"
                    placeholder={t('rolesAndPermissions.list.noScope')}
                    value={roleGroup}
                    data-testid="role-scope-select"
                    data={roleGroups.map(group => ({
                        label: group,
                        value: group,
                        attributes: {'data-testid': `role-scope-option-${group}`}
                    }))}
                    onChange={(event, item) => setRoleGroup(item.value)}/>
            </Field>

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
            </Field>

            {/*
              * Where the role reaches. This is a property of the role, so it is edited here and not on
              * the screen that grants permissions: that screen reads a target and never creates one.
              * A target only an ancestor role declares is shown and cannot be removed, because such a
              * target is not this role's to remove.
              */}
            <Field
                id="role-targets-field"
                data-testid="role-targets-field"
                label={t('rolesAndPermissions.detail.appliesOn')}
                helper={t('rolesAndPermissions.detail.appliesOnHint')}
            >
                <div className={classes.chipRow}>
                    {role.grants.map(grant => (
                        <span key={grant.id || 'currentNode'} className={classes.targetChip}>
                            <Chip
                                label={grant.id === '' ?
                                    t('rolesAndPermissions.target.currentNode') :
                                    (grant.path || grant.id)}
                                data-testid={`role-edit-target-${grant.id || 'currentNode'}`}/>
                            {/*
                              * The removal is its own button. Chip takes a label, a colour and an
                              * icon, and nothing else, so a chip cannot carry an action.
                              */}
                            {grant.id !== '' && !grant.isInheritedOnly ?
                                <Button
                                    size="small"
                                    variant="ghost"
                                    icon={<Delete/>}
                                    data-testid={`role-remove-target-${grant.id}`}
                                    onClick={() => setPendingTargetRemoval(grant)}/> :
                                null}
                        </span>
                    ))}
                </div>
                <div className={classes.switchRow}>
                    <Input
                        className={classes.targetInput}
                        value={newTargetPath}
                        placeholder={t('rolesAndPermissions.detail.newTargetPlaceholder')}
                        data-testid="role-new-target-path"
                        onChange={event => setNewTargetPath(event.target.value)}/>
                    <Button
                        size="default"
                        variant="outlined"
                        icon={<Add/>}
                        isDisabled={newTargetPath.trim() === ''}
                        label={t('rolesAndPermissions.detail.addTarget')}
                        data-testid="role-add-target"
                        onClick={onAddTarget}/>
                </div>
            </Field>

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

            <Field
                id="role-privileged-field"
                data-testid="role-privileged-field"
                label={t('rolesAndPermissions.detail.privileged')}
                helper={role.hasEffectivePrivilegedAccess && !privileged ?
                    t('rolesAndPermissions.detail.privilegedByParentHint', {parent: role.parentRoleName}) :
                    t('rolesAndPermissions.detail.privilegedHint')}
            >
                <span className={classes.switchRow}>
                    <Switch
                        checked={privileged}
                        data-testid="role-privileged-switch"
                        onChange={() => {
                            setSaved(false);
                            setPrivileged(!privileged);
                        }}/>
                    <Typography variant="body">{t('rolesAndPermissions.list.privileged')}</Typography>
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

            {pendingTargetRemoval ?
                <ConfirmDestructiveDialog
                    title={t('rolesAndPermissions.confirm.removeTargetTitle')}
                    confirmLabel={t('rolesAndPermissions.confirm.removeTargetConfirm')}
                    message={t('rolesAndPermissions.confirm.removeTargetMessage', {
                        path: pendingTargetRemoval.path
                    })}
                    consequences={pendingTargetRemoval.directPermissions.length === 0 ? [] : [
                        t('rolesAndPermissions.confirm.removeTargetPermissions', {
                            count: pendingTargetRemoval.directPermissions.length,
                            names: pendingTargetRemoval.directPermissions.join(', ')
                        })
                    ]}
                    confirmWord={pendingTargetRemoval.directPermissions.length > 0 ?
                        pendingTargetRemoval.path :
                        null}
                    onConfirm={onRemoveTarget}
                    onCancel={() => setPendingTargetRemoval(null)}/> :
                null}
        </div>
    );
};

RoleIdentityTab.propTypes = {
    role: PropTypes.shape({
        name: PropTypes.string.isRequired,
        path: PropTypes.string.isRequired,
        parentRoleName: PropTypes.string,
        title: PropTypes.string,
        description: PropTypes.string,
        roleGroup: PropTypes.string,
        nodeTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
        dependencies: PropTypes.arrayOf(PropTypes.string).isRequired,
        subRoleNames: PropTypes.arrayOf(PropTypes.string).isRequired,
        isHidden: PropTypes.bool.isRequired,
        hasPrivilegedAccess: PropTypes.bool.isRequired,
        hasEffectivePrivilegedAccess: PropTypes.bool.isRequired,
        grants: PropTypes.arrayOf(PropTypes.shape({
            id: PropTypes.string.isRequired,
            path: PropTypes.string,
            isInheritedOnly: PropTypes.bool,
            directPermissions: PropTypes.arrayOf(PropTypes.string).isRequired
        })).isRequired
    }).isRequired,
    roleGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
    /** When given, the form writes its save handler here and draws no button of its own. */
    saveRef: PropTypes.object,
    language: PropTypes.string.isRequired,
    onSaved: PropTypes.func.isRequired
};

RoleIdentityTab.defaultProps = {saveRef: null};

export default RoleIdentityTab;
