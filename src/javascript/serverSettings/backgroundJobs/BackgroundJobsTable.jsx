import React, {useImperativeHandle, forwardRef} from 'react';
import {DataTable, Loader, Typography} from '@jahia/moonstone';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';

const centerStyle = {display: 'flex', alignItems: 'center', justifyContent: 'center'};

const NothingToDisplay = ({isError}) => {
    const {t} = useTranslation('serverSettings');
    const message = isError ? t('backgroundJobs.error') : t('backgroundJobs.nothingToDisplay');

    return (
        <div style={{...centerStyle, height: 100}}>
            <Typography>{message}</Typography>
        </div>
    );
};

NothingToDisplay.propTypes = {
    isError: PropTypes.bool
};

const BackgroundJobsTable = forwardRef(({data, columns, primaryKey, loading, error, refetch, ...props}, ref) => {
    useImperativeHandle(ref, () => ({refetch}));

    if (loading) {
        return (
            <div style={{...centerStyle, height: 300}}>
                <Loader size="big"/>
            </div>
        );
    }

    if (error) {
        return <NothingToDisplay isError/>;
    }

    if (!data || data.length === 0) {
        return <NothingToDisplay/>;
    }

    return (
        <div style={{marginTop: 32}} data-testid={props['data-testid'] ?? 'background-jobs-table'}>
            <DataTable
                enablePagination
                enableSorting
                data={data}
                columns={columns}
                primaryKey={primaryKey}
                itemsPerPageOptions={[5, 10, 20]}

            />
        </div>
    );
});

BackgroundJobsTable.propTypes = {
    data: PropTypes.array.isRequired,
    columns: PropTypes.array.isRequired,
    primaryKey: PropTypes.string.isRequired,
    loading: PropTypes.bool,
    refetch: PropTypes.func,
    error: PropTypes.object,
    'data-testid': PropTypes.string
};

export default BackgroundJobsTable;
