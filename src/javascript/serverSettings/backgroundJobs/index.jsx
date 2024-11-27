import React, {useState} from 'react';
import {Header, LayoutContent, Paper, Tab, TabItem} from '@jahia/moonstone';
import HistoryBackgroundJobsTable from './HistoryBackgroundJobsTable';
import ScheduledBackgroundJobsTable from './ScheduledBackgroundJobsTable';

const BackgroundJobsTabs = () => {
    const [activeTab, setActiveTab] = useState('history');

    const content = activeTab === 'history' ? <HistoryBackgroundJobsTable/> : <ScheduledBackgroundJobsTable/>;

    return (
        <LayoutContent
            header={<Header title="Background Jobs"/>}
            content={(
                <Paper>
                    <Tab>
                        <TabItem
                            id="history"
                            label="HISTORY"
                            size="big"
                            isSelected={activeTab === 'history'}
                            data-testid="background-jobs-history-tab"
                            onClick={() => setActiveTab('history')}
                        />
                        <TabItem
                            id="scheduled"
                            label="SCHEDULED"
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
