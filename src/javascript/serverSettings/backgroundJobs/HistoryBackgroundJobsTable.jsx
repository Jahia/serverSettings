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
                Header: t('backgroundJobs.columns.jobDescription'),
                accessor: 'jobDescription'
            },
            {
                Header: t('backgroundJobs.columns.status'),
                accessor: 'jobStatus',
                // eslint-disable-next-line react/prop-types
                Cell: ({value}) => (<JobStatusBadge status={value}/>),
                customWidth: 140
            },
            {
                Header: t('backgroundJobs.columns.user'),
                accessor: 'userKey',
                Cell: ({value}) => parseUsername(value),
                customWidth: 100
            },
            {
                Header: t('backgroundJobs.columns.type'),
                accessor: 'group',
                customWidth: 160
            },
            {
                Header: t('backgroundJobs.columns.startedDate'),
                accessor: 'begin',
                Cell: ({value}) => new Date(value).toLocaleString(),
                customWidth: 200
            },
            {
                Header: t('backgroundJobs.columns.duration'),
                accessor: 'duration',
                Cell: ({value}) => `${value} ms`,
                customWidth: 105
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
            refetch={refetch}
            loading={loading}
            error={error}
            data-testid="history-background-jobs-table"
        />
    );
});

export default HistoryBackgroundJobsTable;
