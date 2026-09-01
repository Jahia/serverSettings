import {useQuery} from 'react-apollo';
import {GET_BACKGROUND_JOBS} from './BackgroundJobs.gql-queries';
import {useMemo, useState} from 'react';

// The DataTable search only sees the rows it was given, so every job is loaded
// at once and the table paginates locally
const FETCH_ALL_LIMIT = 1000;

export const useHistoryBackgroundJobs = () => {
    const [page, setPage] = useState(1);
    const [limit, setLimit] = useState(10);
    const {data, loading, error, refetch} = useQuery(GET_BACKGROUND_JOBS, {
        variables: {
            includeStatuses: null,
            excludeStatuses: ['SCHEDULED'],
            offset: 0,
            limit: FETCH_ALL_LIMIT
        },
        fetchPolicy: 'network-only'
    });

    const jobs = useMemo(() => data?.admin?.jahia?.scheduler?.paginatedJobs?.nodes || [], [data]);
    const totalCount = useMemo(() => data?.admin?.jahia?.scheduler?.paginatedJobs?.pageInfo?.totalCount || 0, [data]);

    return {
        jobs,
        totalCount,
        currentPage: page,
        refetch,
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
    const {data, loading, error, refetch} = useQuery(GET_BACKGROUND_JOBS, {
        variables: {
            includeStatuses: ['SCHEDULED'],
            excludeStatuses: null,
            offset: 0,
            limit: FETCH_ALL_LIMIT
        },
        fetchPolicy: 'network-only'
    });

    const jobs = useMemo(() => data?.admin?.jahia?.scheduler?.paginatedJobs?.nodes || [], [data]);
    const totalCount = useMemo(() => data?.admin?.jahia?.scheduler?.paginatedJobs?.pageInfo?.totalCount || 0, [data]);

    return {
        jobs,
        totalCount,
        currentPage: page,
        setPage,
        refetch,
        limit,
        setLimit,
        loading,
        error
    };
};
