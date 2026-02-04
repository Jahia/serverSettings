import React, {useMemo, forwardRef} from 'react';
import {Typography} from '@jahia/moonstone';
import {useTranslation} from 'react-i18next';
import {useScheduledBackgroundJobs} from './hooks';
import BackgroundJobsTable from './BackgroundJobsTable';

const ScheduledBackgroundJobsTable = forwardRef((_, ref) => {
    const {t} = useTranslation('serverSettings');
    const {
        jobs,
        refetch,
        loading,
        error
    } = useScheduledBackgroundJobs();

    const columns = useMemo(() => {
        return [
            {
                key: 'name',
                label: t('backgroundJobs.columns.name'),
                isSortable: true,
                width: '200px',
                render: value => <Typography isNowrap component="span" title={value}>{value}</Typography>
            },
            {
                key: 'jobDescription',
                label: t('backgroundJobs.columns.jobDescription'),
                isSortable: true,
                render: value => <Typography isNowrap component="span" title={value}>{value}</Typography>
            },
            {
                key: 'group',
                label: t('backgroundJobs.columns.user'),
                isSortable: true,
                width: '150px'
            }
        ];
    }, [t]);

    return (
        <BackgroundJobsTable
            ref={ref}
            data={jobs}
            columns={columns}
            primaryKey="name"
            loading={loading}
            refetch={refetch}
            error={error}
            data-testid="scheduled-background-jobs-table"
        />
    );
});

export default ScheduledBackgroundJobsTable;
