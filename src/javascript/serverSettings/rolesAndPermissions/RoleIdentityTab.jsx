import React, {useImperativeHandle, useState} from 'react';
import PropTypes from 'prop-types';
import {useMutation} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Button, Chip, Dropdown, Field, Input, Switch, Textarea, Typography} from '@jahia/moonstone';
import {SAVE_ROLE_METADATA, SAVE_ROLE_TEXT} from './RolesAndPermissions.gql-queries';
import NodeTypeSelect from './NodeTypeSelect';
import {grantableOnApplies} from './roleScopes';
import classes from './styles.css';

/**
 * The title and the description the role carries, per language, seeded from what it already has.
 *
 * Every offered language gets an entry, so a language the role has no text in is an empty field rather
 * than a missing one, and filling it is the same gesture as changing an existing one.
 */
const textsByLanguage = (role, languages) => {
    const carried = new Map((role.texts || []).map(text => [text.language, text]));
    return languages.reduce((all, code) => ({
        ...all,
        [code]: {
            title: carried.get(code)?.title || '',
            description: carried.get(code)?.description || ''
        }
    }), {});
};

export const RoleIdentityTab = ({role, textLanguages, language, saveRef, onSaved}) => {
    const {t} = useTranslation('serverSettings');

    // The interface language is where an administrator starts, when the role can be written in it.
    const [editedLanguage, setEditedLanguage] = useState(
        textLanguages.includes(language) ? language : textLanguages[0]
    );
    const [texts, setTexts] = useState(() => textsByLanguage(role, textLanguages));
    const [nodeTypes, setNodeTypes] = useState(role.nodeTypes || []);
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
                    nodeTypes: showNodeTypes ? nodeTypes : (role.nodeTypes || []),
                    hidden: String(hidden),
                    privileged: String(role.hasPrivilegedAccess)
                }
            });

            // SetRoleText writes one language, because the text is i18n on the role and each language
            // is its own translation node. Only the languages that changed are written, so a save does
            // not touch a translation the administrator never opened.
            const initial = textsByLanguage(role, textLanguages);
            const changed = textLanguages.filter(code =>
                texts[code].title !== initial[code].title ||
                texts[code].description !== initial[code].description);

            for (const code of changed) {
                // Sequential on purpose: each call opens its own per-language session on the same node,
                // and Promise.all would have them save over one another.
                // eslint-disable-next-line no-await-in-loop
                await saveText({
                    variables: {
                        role: role.name,
                        language: code,
                        title: texts[code].title.trim() === '' ? null : texts[code].title,
                        description: texts[code].description.trim() === '' ? null :
                            texts[code].description
                    }
                });
            }

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

    const setText = (field, value) => setTexts({
        ...texts,
        [editedLanguage]: {...texts[editedLanguage], [field]: value}
    });

    // Intl names the language in the language of the interface, so a French administrator reads
    // "allemand" and not "Deutsch". A code Intl does not know is shown as the code.
    const languageLabel = code => {
        const names = new Intl.DisplayNames([language], {type: 'language'});
        return names.of(code) || code;
    };

    const filled = code => texts[code].title !== '' || texts[code].description !== '';

    return (
        <div className={classes.form} data-testid="role-identity-tab">
            {/*
              * One switcher for both fields. The title and the description of a language are written by
              * one call and read from one translation node, so splitting them across two switchers
              * would let an administrator leave a language half open.
              */}
            <Field
                id="role-language-field"
                data-testid="role-language-field"
                label={t('rolesAndPermissions.detail.textLanguage')}
                helper={t('rolesAndPermissions.detail.textLanguageHint')}
            >
                <Dropdown
                    variant="outlined"
                    size="small"
                    className={classes.textInput}
                    value={editedLanguage}
                    label={languageLabel(editedLanguage)}
                    data-testid="role-language-select"
                    data={textLanguages.map(code => ({
                        label: filled(code) ?
                            languageLabel(code) :
                            t('rolesAndPermissions.detail.languageEmpty', {language: languageLabel(code)}),
                        value: code,
                        attributes: {'data-testid': `role-language-option-${code}`}
                    }))}
                    onChange={(event, item) => setEditedLanguage(item.value)}/>
            </Field>

            <Field
                id="role-title-field"
                data-testid="role-title-field"
                label={t('rolesAndPermissions.detail.title', {language: editedLanguage})}
                helper={t('rolesAndPermissions.detail.titleHint')}
            >
                <Input
                    className={classes.textInput}
                    value={texts[editedLanguage].title}
                    data-testid="role-title-input"
                    onChange={event => {
                        setSaved(false);
                        setText('title', event.target.value);
                    }}/>
            </Field>

            <Field
                id="role-description-field"
                data-testid="role-description-field"
                label={t('rolesAndPermissions.detail.description', {language: editedLanguage})}
            >
                <Textarea
                    className={classes.textInput}
                    value={texts[editedLanguage].description}
                    data-testid="role-description-input"
                    onChange={event => {
                        setSaved(false);
                        setText('description', event.target.value);
                    }}/>
            </Field>

            {showNodeTypes ?
                <Field
                    id="role-nodetypes-field"
                    data-testid="role-nodetypes-field"
                    label={t('rolesAndPermissions.detail.nodeTypes')}
                    helper={t('rolesAndPermissions.detail.nodeTypesHint')}
                >
                    <NodeTypeSelect
                        values={nodeTypes}
                        language={language}
                        onChange={next => {
                            setSaved(false);
                            setNodeTypes(next);
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
        hasPrivilegedAccess: PropTypes.bool.isRequired,
        texts: PropTypes.arrayOf(PropTypes.shape({
            language: PropTypes.string.isRequired,
            title: PropTypes.string,
            description: PropTypes.string
        })).isRequired
    }).isRequired,
    /** The languages a role's text can be written in, from the system site. */
    textLanguages: PropTypes.arrayOf(PropTypes.string).isRequired,
    /** When given, the form writes its save handler here and draws no button of its own. */
    saveRef: PropTypes.object,
    language: PropTypes.string.isRequired,
    onSaved: PropTypes.func.isRequired
};

RoleIdentityTab.defaultProps = {saveRef: null};

export default RoleIdentityTab;
