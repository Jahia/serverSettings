import React, {useState} from 'react';
import {Header, LayoutContent, Paper, Tab, TabItem} from '@jahia/moonstone';
import HistoryBackgroundJobsTable from './HistoryBackgroundJobsTable';
import ScheduledBackgroundJobsTable from './ScheduledBackgroundJobsTable';
import {useTranslation} from 'react-i18next';

const BackgroundJobsTabs = () => {
    const {t} = useTranslation('serverSettings');
    const [activeTab, setActiveTab] = useState('history');

    const content = activeTab === 'history' ? <HistoryBackgroundJobsTable/> : <ScheduledBackgroundJobsTable/>;

    return (
        <LayoutContent
            header={<Header title={t('backgroundJobs.title')}/>}
            content={(
                <Paper>
                    <Tab>
                        <TabItem
                            id="history"
                            label={t('backgroundJobs.tabs.history').toUpperCase()}
                            size="big"
                            isSelected={activeTab === 'history'}
                            data-testid="background-jobs-history-tab"
                            onClick={() => setActiveTab('history')}
                        />
                        <TabItem
                            id="scheduled"
                            label={t('backgroundJobs.tabs.scheduled').toUpperCase()}
                            size="big"
                            isSelected={activeTab === 'scheduled'}
                            data-testid="background-jobs-scheduled-tab"
                            onClick={() => setActiveTab('scheduled')}
                        />
                    </Tab>
                    {content}
                </Paper>
            )}
        />
    );
};

export default BackgroundJobsTabs;
