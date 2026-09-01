import React, {useImperativeHandle, useMemo, forwardRef} from 'react';
import {DataTable, EmptyData, Loader} from '@jahia/moonstone';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';

const NothingToDisplay = ({isError}) => {
    const {t} = useTranslation('serverSettings');
    const message = isError ?
        t('backgroundJobs.error') :
        t('backgroundJobs.nothingToDisplay');

    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: 160
        }}
        >
            <EmptyData message={message}/>
        </div>
    );
};

NothingToDisplay.propTypes = {
    isError: PropTypes.bool
};

const BackgroundJobsTable = forwardRef(({data, columns, paginationProps, loading, error, refetch, ...props}, ref) => {
    const {t} = useTranslation('serverSettings');
    const {limit} = paginationProps;

    useImperativeHandle(ref, () => ({
        refetch
    }));

    const tableData = useMemo(() => data.map((row, index) => ({
        ...row,
        rowId: `${index}-${row.name ?? ''}-${row.jobDescription ?? ''}-${row.begin ?? ''}-${row.userKey ?? ''}`
    })), [data]);

    if (error) {
        return <NothingToDisplay isError/>;
    }

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300
            }}
            >
                <Loader size="big"/>
            </div>
        );
    }

    if (tableData.length === 0) {
        return <NothingToDisplay/>;
    }

    const testId = props['data-testid'] ?? 'background-jobs-table';

    return (
        <DataTable
            {...props}
            enableSorting
            enablePagination
            enableSearch
            searchColumns={['jobDescription', 'userKey', 'group']}
            searchInputProps={{placeholder: t('backgroundJobs.search.placeholder')}}
            noResultsMessage={t('backgroundJobs.search.noResults')}
            defaultItemsPerPage={limit}
            itemsPerPageOptions={[5, 10, 20]}
            data={tableData}
            columns={columns}
            primaryKey="rowId"
            data-testid={testId}
        />
    );
});

BackgroundJobsTable.propTypes = {
    data: PropTypes.array.isRequired,
    columns: PropTypes.array.isRequired,
    paginationProps: PropTypes.object.isRequired,
    // eslint-disable-next-line react/boolean-prop-naming
    loading: PropTypes.bool,
    refetch: PropTypes.func,
    error: PropTypes.object,
    'data-testid': PropTypes.string
};

export default BackgroundJobsTable;
