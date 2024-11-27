import gql from 'graphql-tag';

export const GET_BACKGROUND_JOBS = gql`
    query GetBackgroundJobs($includeStatuses: [GqlBackgroundJobStatus], $excludeStatuses: [GqlBackgroundJobStatus], $offset: Int = 0, $limit: Int = 10) {
        admin {
            jahia {
                scheduler {
                    jobs(includeStatuses: $includeStatuses, excludeStatuses: $excludeStatuses, offset:$offset, limit:$limit) {
                        pageInfo {
                            totalCount
                        }
                        nodes {
                            name
                            duration,
                            group,
                            jobStatus,
                            userKey,
                            begin: jobLongProperty(name: "begin")
                            end: jobLongProperty(name: "end")
                        }
                    }
                }
            }
        }
    }
`;
