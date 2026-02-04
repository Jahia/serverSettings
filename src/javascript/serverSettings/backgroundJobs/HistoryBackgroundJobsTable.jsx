import React, {useMemo, forwardRef} from 'react';
import {Typography} from '@jahia/moonstone';
import {useHistoryBackgroundJobs} from './hooks';
const {useTranslation} = require('react-i18next');
import {parseUsername} from './utils';
import BackgroundJobsTable from './BackgroundJobsTable';
import JobStatusBadge from './JobStatusBadge';

const HistoryBackgroundJobsTable = forwardRef((_, ref) => {
    const {t} = useTranslation('serverSettings');
    const {
        jobs,
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
                render: value => <Typography isNowrap component="span" title={value}>{value}</Typography>
            },
            {
                key: 'jobStatus',
                label: t('backgroundJobs.columns.status'),
                render: value => (<JobStatusBadge status={value}/>),
                isSortable: true,
                width: '140px'
            },
            {
                key: 'userKey',
                label: t('backgroundJobs.columns.user'),
                render: value => parseUsername(value),
                isSortable: true,
                width: '100px'
            },
            {
                key: 'group',
                label: t('backgroundJobs.columns.type'),
                isSortable: true,
                width: '160px'
            },
            {
                key: 'begin',
                label: t('backgroundJobs.columns.startedDate'),
                render: value => value ? new Date(value).toLocaleString() : '-',
                isSortable: true,
                width: '200px'
            },
            {
                key: 'duration',
                label: t('backgroundJobs.columns.duration'),
                render: value => value >= 0 ? `${value} ms` : '-',
                isSortable: true,
                width: '105px'
            }
        ];
    }, [t]);

    return (
        <BackgroundJobsTable
            ref={ref}
            data={jobs}
            columns={columns}
            primaryKey="name"
            refetch={refetch}
            loading={loading}
            error={error}
            data-testid="history-background-jobs-table"
        />
    );
});

export default HistoryBackgroundJobsTable;
