import React from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Chip, Warning} from '@jahia/moonstone';
import classes from './styles.css';

// One chip per warning. The chip states the fact in words and names the value it is about, so an
// administrator can act on it without opening the role.
export const RoleWarnings = ({warnings, roleName}) => {
    const {t} = useTranslation('serverSettings');

    if (warnings.length === 0) {
        return null;
    }

    return (
        <span className={classes.warningRow} data-testid={`role-warnings-${roleName}`}>
            {warnings.map(warning => (
                <Chip
                    key={`${warning.code}-${warning.subject}`}
                    color="warning"
                    icon={<Warning/>}
                    data-testid={`role-warning-${roleName}-${warning.code}`}
                    label={t(`rolesAndPermissions.warning.${warning.code}`, {subject: warning.subject})}/>
            ))}
        </span>
    );
};

RoleWarnings.propTypes = {
    roleName: PropTypes.string.isRequired,
    warnings: PropTypes.arrayOf(PropTypes.shape({
        code: PropTypes.string.isRequired,
        subject: PropTypes.string.isRequired
    })).isRequired
};

export default RoleWarnings;
