import React from 'react';
import {Add, Chip, Check, Clock, Close} from '@jahia/moonstone';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';

const statusMap = {
    ADDED: {icon: <Add/>, color: 'accent'},
    EXECUTING: {icon: <Clock/>, color: 'accent'},
    SUCCESSFUL: {icon: <Check/>, color: 'success'},
    FAILED: {icon: <Close/>, color: 'danger'},
    CANCELED: {icon: <Close/>, color: 'danger'}
};

const JobStatusBadge = ({status}) => {
    const {t} = useTranslation('serverSettings');
    const label = t(`backgroundJobs.statuses.${status.toLowerCase()}`);
    return (
        <Chip
            style={{textTransform: 'capitalize'}}
            label={label}
            color={statusMap[status].color}
            icon={statusMap[status].icon}
        />
    );
};

JobStatusBadge.propTypes = {
    status: PropTypes.string.isRequired
};

export default JobStatusBadge;
