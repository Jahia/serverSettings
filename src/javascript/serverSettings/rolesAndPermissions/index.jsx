import React from 'react';
import PropTypes from 'prop-types';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Chip, Header, LayoutContent, Paper, Typography} from '@jahia/moonstone';
import {GET_ROLE_GROUPS} from './RolesAndPermissions.gql-queries';
import classes from './styles.css';

// The scope bar of the role list. It states every j:roleGroup the repository holds, so an
// administrator sees the scope families before they see a single role.
const ScopeBar = ({roleGroups}) => {
    const {t} = useTranslation('serverSettings');

    if (roleGroups.length === 0) {
        return (
            <div className={classes.scopeBar} data-testid="roles-scope-bar">
                <Typography variant="body">{t('rolesAndPermissions.noScope')}</Typography>
            </div>
        );
    }

    return (
        <div className={classes.scopeBar} data-testid="roles-scope-bar">
            <Typography isNowrap variant="caption" className={classes.scopeBarLabel}>
                {t('rolesAndPermissions.scope')}
            </Typography>
            {roleGroups.map(group => (
                <Chip key={group} label={group} data-testid={`roles-scope-${group}`}/>
            ))}
        </div>
    );
};

ScopeBar.propTypes = {
    roleGroups: PropTypes.arrayOf(PropTypes.string).isRequired
};

export const RolesAndPermissions = () => {
    const {t} = useTranslation('serverSettings');
    const {data, loading, error} = useQuery(GET_ROLE_GROUPS, {fetchPolicy: 'network-only'});

    const roleGroups = data?.admin?.rolesAndPermissions?.roleGroups || [];

    return (
        <LayoutContent
            isLoading={loading}
            header={<Header title={t('rolesAndPermissions.title')} data-testid="roles-header"/>}
            content={(
                <Paper>
                    {error ?
                        <div className={classes.scopeBar} data-testid="roles-error">
                            <Typography variant="body">{t('rolesAndPermissions.loadError')}</Typography>
                        </div> :
                        <ScopeBar roleGroups={roleGroups}/>}
                </Paper>
            )}
        />
    );
};

export default RolesAndPermissions;
