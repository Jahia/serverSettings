import React, {useMemo, forwardRef} from 'react';
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

    const truncateStyle = {
        display: 'block',
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        whiteSpace: 'nowrap'
    };

    const columns = useMemo(() => {
        return [
            {
                key: 'name',
                label: t('backgroundJobs.columns.name'),
                isSortable: true,
                width: '200px',
                render: value => <span style={truncateStyle} title={value}>{value}</span>
            },
            {
                key: 'jobDescription',
                label: t('backgroundJobs.columns.jobDescription'),
                isSortable: true,
                render: value => <span style={truncateStyle} title={value}>{value}</span>
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
