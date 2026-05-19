import React, {useMemo, forwardRef} from 'react';
import {useHistoryBackgroundJobs} from './hooks';
const {useTranslation} = require('react-i18next');
import {parseUsername} from './utils';
import BackgroundJobsTable from './BackgroundJobsTable';
import JobStatusBadge from './JobStatusBadge';

const HistoryBackgroundJobsTable = forwardRef((_, ref) => {
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
    } = useHistoryBackgroundJobs();

    const columns = useMemo(() => {
        return [
            {
                key: 'jobDescription',
                label: t('backgroundJobs.columns.jobDescription'),
                isSortable: true,
                render: value => value
            },
            {
                key: 'jobStatus',
                label: t('backgroundJobs.columns.status'),
                render: value => <JobStatusBadge status={value}/>,
                width: '140px',
                isSortable: true
            },
            {
                key: 'userKey',
                label: t('backgroundJobs.columns.user'),
                isSortable: true,
                render: value => parseUsername(value)
            },
            {
                key: 'group',
                label: t('backgroundJobs.columns.type'),
                isSortable: true,
                render: value => value
            },
            {
                key: 'begin',
                label: t('backgroundJobs.columns.startedDate'),
                render: value => new Date(value).toLocaleString(),
                width: '175px',
                isSortable: true
            },
            {
                key: 'duration',
                label: t('backgroundJobs.columns.duration'),
                render: value => `${value} ms`,
                width: '105px',
                isSortable: true
            }
        ];
    }, [t]);

    return (
        <BackgroundJobsTable
            ref={ref}
            data={jobs}
            columns={columns}
            paginationProps={{limit, setLimit, totalCount, currentPage, setPage}}
            refetch={refetch}
            loading={loading}
            error={error}
            data-testid="history-background-jobs-table"
        />
    );
});

export default HistoryBackgroundJobsTable;
