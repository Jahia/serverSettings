import {useQuery} from 'react-apollo';
import {GET_BACKGROUND_JOBS} from './BackgroundJobs.gql-queries';
import {useMemo, useState} from 'react';

export const useHistoryBackgroundJobs = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const offset = useMemo(() => (page - 1) * limit, [page, limit]);
    const {data, loading, error} = useQuery(GET_BACKGROUND_JOBS, {
        variables: {
            includeStatuses: null,
            excludeStatuses: ['SCHEDULED'],
            offset,
            limit
        },
        fetchPolicy: 'network-only'
    });

    if (error) {
        throw error;
    }

    const jobs = useMemo(() => data?.admin?.jahia?.scheduler?.jobs?.nodes || [], [data]);
    const totalCount = useMemo(() => data?.admin?.jahia?.scheduler?.jobs?.pageInfo?.totalCount || 0, [data]);

    return {
        jobs,
        totalCount,
        currentPage: page,
        setPage,
        limit,
        setLimit,
        loading,
        error
    };
};

export const useScheduledBackgroundJobs = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const offset = useMemo(() => (page - 1) * limit, [page, limit]);
    const {data, loading, error} = useQuery(GET_BACKGROUND_JOBS, {
        variables: {
            includeStatuses: ['SCHEDULED'],
            excludeStatuses: null,
            offset,
            limit
        },
        fetchPolicy: 'network-only'
    });

    if (error) {
        throw error;
    }

    const jobs = useMemo(() => data?.admin?.jahia?.scheduler?.jobs?.nodes || [], [data]);
    const totalCount = useMemo(() => data?.admin?.jahia?.scheduler?.jobs?.pageInfo?.totalCount || 0, [data]);

    return {
        jobs,
        totalCount,
        currentPage: page,
        setPage,
        limit,
        setLimit,
        loading,
        error
    };
};
