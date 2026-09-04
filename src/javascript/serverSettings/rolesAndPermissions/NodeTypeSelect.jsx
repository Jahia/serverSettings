import React, {useMemo} from 'react';
import PropTypes from 'prop-types';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Dropdown, Typography} from '@jahia/moonstone';
import {GET_NODE_TYPES} from './RolesAndPermissions.gql-queries';
import classes from './styles.css';

/**
 * The node types a role can be granted on.
 *
 * The list is long and flat on purpose. Core matches j:nodeTypes with isNodeType, so a mixin and an
 * abstract type answer as well as a concrete one, and grouping them would state a hierarchy the match
 * does not follow. The search is what makes 449 entries usable.
 */
const NodeTypeSelect = ({values, language, onChange}) => {
    const {t} = useTranslation('serverSettings');
    const {data, loading, error} = useQuery(GET_NODE_TYPES, {variables: {language}});

    const options = useMemo(() => {
        const nodes = data?.jcr?.nodeTypes?.nodes || [];
        const known = nodes.map(nodeType => ({
            label: nodeType.displayName && nodeType.displayName !== nodeType.name ?
                `${nodeType.displayName} (${nodeType.name})` :
                nodeType.name,
            value: nodeType.name,
            attributes: {'data-testid': `role-nodetype-option-${nodeType.name}`}
        }));

        // A type whose module was uninstalled is still written on the role. Dropping it from the
        // options would drop it from the value on the next save, so the role would silently widen.
        const names = new Set(nodes.map(nodeType => nodeType.name));
        const orphans = values.filter(value => !names.has(value)).map(value => ({
            label: t('rolesAndPermissions.detail.nodeTypeUnknown', {name: value}),
            value,
            attributes: {'data-testid': `role-nodetype-option-${value}`}
        }));

        return [...orphans, ...known.sort((one, other) => one.label.localeCompare(other.label))];
    }, [data, values, t]);

    if (error) {
        return (
            <Typography variant="body" className={classes.formError} data-testid="role-nodetypes-error">
                {error.message}
            </Typography>
        );
    }

    // Moonstone disables the dropdown while it loads, so a click lands on nothing until the types are
    // in. The wrapper states that, which is what a test has to wait for and what a person sees.
    return (
        <span data-testid="role-nodetypes-select-state" data-loading={String(loading)}>
            <Dropdown
                hasSearch
                isLoading={loading}
                variant="outlined"
                size="small"
                className={classes.textInput}
                placeholder={t('rolesAndPermissions.detail.anyNodeType')}
                searchEmptyText={t('rolesAndPermissions.detail.nodeTypeNoMatch')}
                label={values.length === 0 ?
                    t('rolesAndPermissions.detail.anyNodeType') :
                    t('rolesAndPermissions.detail.nodeTypeCount', {count: values.length})}
                values={values}
                data={options}
                data-testid="role-nodetypes-select"
                onChange={(event, item) => onChange(
                    values.includes(item.value) ?
                        values.filter(value => value !== item.value) :
                        [...values, item.value]
                )}/>
        </span>
    );
};

NodeTypeSelect.propTypes = {
    values: PropTypes.arrayOf(PropTypes.string).isRequired,
    language: PropTypes.string.isRequired,
    onChange: PropTypes.func.isRequired
};

export default NodeTypeSelect;
