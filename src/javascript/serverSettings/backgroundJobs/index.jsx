import React, {useMemo, useRef, useState} from 'react';
import {Button, Header, LayoutContent, Paper, Tab, TabItem, Reload} from '@jahia/moonstone';
import HistoryBackgroundJobsTable from './HistoryBackgroundJobsTable';
import ScheduledBackgroundJobsTable from './ScheduledBackgroundJobsTable';
import {useTranslation} from 'react-i18next';
import classes from './styles.css';

const BackgroundJobsTabs = () => {
    const {t} = useTranslation('serverSettings');
    const [activeTab, setActiveTab] = useState('history');
    const historyRef = useRef(null);
    const historyTable = useMemo(() => <HistoryBackgroundJobsTable ref={historyRef}/>, []);

    const scheduledRef = useRef(null);
    const scheduledTable = useMemo(() => <ScheduledBackgroundJobsTable ref={scheduledRef}/>, []);

    return (
        <LayoutContent
            header={<Header title={t('backgroundJobs.title')}/>}
            content={(
                <Paper>
                    <Tab className={classes.tabs}>
                        <TabItem
                            id="history"
                            label={t('backgroundJobs.tabs.history')}
                            size="big"
                            isSelected={activeTab === 'history'}
                            data-testid="background-jobs-history-tab"
                            onClick={() => setActiveTab('history')}
                        />
                        <TabItem
                            id="scheduled"
                            label={t('backgroundJobs.tabs.scheduled')}
                            size="big"
                            isSelected={activeTab === 'scheduled'}
                            data-testid="background-jobs-scheduled-tab"
                            onClick={() => setActiveTab('scheduled')}
                        />
                        <div className={classes.spacer}/>
                        <Button
                            variant="ghost"
                            icon={<Reload/>}
                            onClick={() => {
                                if (activeTab === 'history') {
                                    historyRef.current.refetch();
                                } else {
                                    scheduledRef.current.refetch();
                                }
                            }}
                        />
                    </Tab>
                    <div style={activeTab === 'history' ? {} : {display: 'none'}}>
                        {historyTable}
                    </div>
                    <div style={activeTab === 'scheduled' ? {} : {display: 'none'}}>
                        {scheduledTable}
                    </div>
                </Paper>
            )}
        />
    );
};

export default BackgroundJobsTabs;
