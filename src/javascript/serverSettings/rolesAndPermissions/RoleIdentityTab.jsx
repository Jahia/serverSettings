import React, {useCallback, useState} from 'react';
import PropTypes from 'prop-types';
import {useLazyQuery, useMutation} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Button, Chip, Dropdown, Field, Input, Switch, Textarea, Typography} from '@jahia/moonstone';
import {RESET_ROLE, ROLE_RESET_PLAN, SAVE_ROLE_GROUP, SAVE_ROLE_METADATA, SAVE_ROLE_TEXT} from './RolesAndPermissions.gql-queries';
import RoleResetDialog from './RoleResetDialog';
import classes from './styles.css';

export const RoleIdentityTab = ({role, roleGroups, language, onSaved}) => {
    const {t} = useTranslation('serverSettings');

    const [title, setTitle] = useState(role.title || '');
    const [description, setDescription] = useState(role.description || '');
    const [roleGroup, setRoleGroup] = useState(role.roleGroup || '');
    const [nodeTypes, setNodeTypes] = useState((role.nodeTypes || []).join(', '));
    const [hidden, setHidden] = useState(role.isHidden);
    const [privileged, setPrivileged] = useState(role.hasPrivilegedAccess);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState(null);

    const [resetPlan, setResetPlan] = useState(null);
    const [resetError, setResetError] = useState(null);
    const [resetting, setResetting] = useState(false);

    // The plan is read when the action is asked for, and not with the role. Reading it walks every
    // installed bundle, which is not work to do on a screen that may never reset anything.
    const [readResetPlan] = useLazyQuery(ROLE_RESET_PLAN, {
        fetchPolicy: 'network-only',
        onCompleted: data => {
            const answer = data?.admin?.rolesAndPermissions?.role;
            if (!answer?.resetPlan?.applicable) {
                setResetError(t('rolesAndPermissions.reset.notDeclared'));
                return;
            }

            if (answer.resetPlan.noop) {
                setResetError(t('rolesAndPermissions.reset.alreadyMatches'));
                return;
            }

            setResetPlan({...answer.resetPlan, revision: answer.revision});
        },
        onError: () => setResetError(t('rolesAndPermissions.reset.planFailed'))
    });

    const [resetRole] = useMutation(RESET_ROLE);

    const applyReset = useCallback(async () => {
        setResetting(true);
        setResetError(null);
        try {
            const answer = await resetRole({variables: {role: role.name, revision: resetPlan.revision}});
            const outcome = answer?.data?.admin?.rolesAndPermissions?.resetRoleToDeclared?.outcome;
            if (outcome === 'REFUSED_STALE_REVISION') {
                // Somebody wrote to the role between the preview and the apply, so the difference on
                // screen is not the difference that would be written.
                setResetError(t('rolesAndPermissions.reset.stale'));
                return;
            }

            setResetPlan(null);
            onSaved();
        } catch (e) {
            setResetError(e.message);
        } finally {
            setResetting(false);
        }
    }, [resetRole, resetPlan, role, onSaved, t]);

    const [saveMetadata] = useMutation(SAVE_ROLE_METADATA);
    const [saveRoleGroup] = useMutation(SAVE_ROLE_GROUP);
    const [saveText] = useMutation(SAVE_ROLE_TEXT);

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

            <div className={classes.formActions}>
                <Button
                    size="big"
                    color="accent"
                    isDisabled={saving}
                    label={t('rolesAndPermissions.detail.save')}
                    data-testid="role-identity-save"
                    onClick={save}/>
                <Button
                    size="big"
                    variant="outlined"
                    label={t('rolesAndPermissions.reset.action')}
                    data-testid="role-reset"
                    onClick={() => {
                        setResetError(null);
                        readResetPlan({variables: {role: role.name}});
                    }}/>
                {saved ?
                    <Typography variant="body" data-testid="role-identity-saved">
                        {t('rolesAndPermissions.detail.saved')}
                    </Typography> :
                    null}
                {resetError && !resetPlan ?
                    <Typography variant="body" className={classes.formError} data-testid="role-reset-message">
                        {resetError}
                    </Typography> :
                    null}
            </div>

            {resetPlan ?
                <RoleResetDialog
                    roleName={role.name}
                    plan={resetPlan}
                    error={resetError}
                    isApplying={resetting}
                    onConfirm={applyReset}
                    onCancel={() => {
                        setResetPlan(null);
                        setResetError(null);
                    }}/> :
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
        hasEffectivePrivilegedAccess: PropTypes.bool.isRequired
    }).isRequired,
    roleGroups: PropTypes.arrayOf(PropTypes.string).isRequired,
    language: PropTypes.string.isRequired,
    onSaved: PropTypes.func.isRequired
};

export default RoleIdentityTab;
