import React, {useMemo, forwardRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useScheduledBackgroundJobs} from './hooks';
import BackgroundJobsTable from './BackgroundJobsTable';

const ScheduledBackgroundJobsTable = forwardRef((_, ref) => {
    const {t} = useTranslation('serverSettings');
    const {
        jobs,
        limit,
        setLimit,
        totalCount,
        currentPage,
        setPage,
        refetch,
        loading,
        error
    } = useScheduledBackgroundJobs();

    const columns = useMemo(() => {
        return [
            {
                Header: t('backgroundJobs.columns.name'),
                accessor: 'name'
            },
            {
                Header: t('backgroundJobs.columns.user'),
                accessor: 'group'
            }
        ];
    }, [t]);

    const tableProps = useMemo(() => ({
        data: jobs,
        columns,
        disableSortRemove: true
    }), [jobs, columns]);

    return (
        <BackgroundJobsTable
            ref={ref}
            tableProps={tableProps}
            paginationProps={{limit, setLimit, totalCount, currentPage, setPage}}
            loading={loading}
            refetch={refetch}
            error={error}
            data-testid="scheduled-background-jobs-table"
        />
    );
});

export default ScheduledBackgroundJobsTable;
