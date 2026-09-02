import gql from 'graphql-tag';

export const GET_ROLE_GROUPS = gql`
    query GetRoleGroups {
        admin {
            rolesAndPermissions {
                roleGroups
            }
        }
    }
`;
