import React, {useMemo, forwardRef} from 'react';
import {useTranslation} from 'react-i18next';
import {useScheduledBackgroundJobs} from './hooks';
import BackgroundJobsTable from './BackgroundJobsTable';
import {stringColumn} from '@jahia/moonstone/DataTable';

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
                key: 'name',
                label: t('backgroundJobs.columns.name'),
                width: '200px',
                ...stringColumn(row => row.name),
                render: value => value
            },
            {
                key: 'jobDescription',
                label: t('backgroundJobs.columns.jobDescription'),
                ...stringColumn(row => row.jobDescription),
                render: value => value
            },
            {
                key: 'group',
                label: t('backgroundJobs.columns.user'),
                width: '150px',
                ...stringColumn(row => row.group),
                render: value => value
            }
        ];
    }, [t]);

    return (
        <BackgroundJobsTable
            ref={ref}
            data={jobs}
            columns={columns}
            paginationProps={{limit, setLimit, totalCount, currentPage, setPage}}
            loading={loading}
            refetch={refetch}
            error={error}
            data-testid="scheduled-background-jobs-table"
        />
    );
});

export default ScheduledBackgroundJobsTable;
