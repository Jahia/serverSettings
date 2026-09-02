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

// The whole catalog in one read. Every entry names its parent and its children, so the client builds
// the tree once and needs no second request per level. `grantedBy` is left out on purpose: selecting
// it is what makes the server read the roles, and the table does not need it.
export const GET_PERMISSION_CATALOG = gql`
    query GetPermissionCatalog($language: String!) {
        admin {
            rolesAndPermissions {
                permissionCatalog {
                    totalCount
                    areas
                    ambiguousNames
                    entries {
                        name
                        logicalPath
                        parentName
                        childNames
                        area
                        depth
                        workspace
                        providedByModules
                        isAbstract
                        label(language: $language)
                    }
                }
            }
        }
    }
`;

// Read for the selected permission only, so the roles are read when a permission is opened and not
// on the first paint.
export const GET_PERMISSION_DETAIL = gql`
    query GetPermissionDetail($name: String!, $language: String!) {
        admin {
            rolesAndPermissions {
                permissionCatalog {
                    permission(name: $name) {
                        name
                        logicalPath
                        label(language: $language)
                        description(language: $language)
                        dependencies
                        childNames
                        providedByModules
                        grantedBy {
                            roleName
                            grantId
                            targetKind
                            targetPath
                            effective {
                                isDirect
                                isKnown
                                lockKind
                                lockedBy
                            }
                        }
                    }
                }
            }
        }
    }
`;
