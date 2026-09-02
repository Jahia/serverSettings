import gql from 'graphql-tag';

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

// The role list. The three permission counts are what the current screen cannot state: what the role
// names, how far that reaches once aggregation applies, and how much of the reach comes from a parent
// role.
export const GET_ROLES = gql`
    query GetRoles($language: String!) {
        admin {
            rolesAndPermissions {
                roleGroups
                ambiguousRoleNames
                roles(includeHidden: true) {
                    name
                    path
                    parentRoleName
                    subRoleNames
                    roleGroup
                    nodeTypes
                    isHidden
                    hasPrivilegedAccess
                    hasEffectivePrivilegedAccess
                    title(language: $language)
                    directPermissionNames
                    effectivePermissionNames
                    inheritedPermissionNames
                    unknownPermissionNames
                    warnings {
                        code
                        subject
                    }
                    usage {
                        entryCount
                        principals
                        isTruncated
                    }
                    grants {
                        id
                        kind
                        path
                        isInheritedOnly
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

// One role, with every target and everything each target grants. The permissions tab renders this
// against the catalog, so the two reads together carry the whole model of one role.
export const GET_ROLE = gql`
    query GetRole($name: String!, $language: String!) {
        admin {
            rolesAndPermissions {
                roleGroups
                role(name: $name) {
                    name
                    path
                    parentRoleName
                    subRoleNames
                    roleGroup
                    nodeTypes
                    dependencies
                    isHidden
                    hasPrivilegedAccess
                    hasEffectivePrivilegedAccess
                    title(language: $language)
                    description(language: $language)
                    translatedLanguages
                    unknownPermissionNames
                    warnings {
                        code
                        subject
                    }
                    grants {
                        id
                        kind
                        path
                        isInheritedOnly
                        revision
                        directPermissions
                        collapsablePermissions
                        effectivePermissions {
                            name
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
`;

// Read before a removal is applied, so the interface states the effect whenever it exceeds the row
// the administrator clicked.
export const GET_REVOKE_PLAN = gql`
    query GetRevokePlan($name: String!, $target: String!, $permission: String!) {
        admin {
            rolesAndPermissions {
                role(name: $name) {
                    grant(id: $target) {
                        revokePlan(permission: $permission) {
                            outcome
                            addedPermissions
                            removedPermissions
                            lostPermissions
                            blockedBy
                        }
                    }
                }
            }
        }
    }
`;

export const GET_COLLAPSE_PLAN = gql`
    query GetCollapsePlan($name: String!, $target: String!, $permission: String!) {
        admin {
            rolesAndPermissions {
                role(name: $name) {
                    grant(id: $target) {
                        collapsePlan(permission: $permission) {
                            isApplicable
                            addedPermissions
                            removedPermissions
                            gainedPermissions
                        }
                    }
                }
            }
        }
    }
`;

export const GRANT_PERMISSIONS = gql`
    mutation GrantPermissions($role: String!, $target: String!, $permissions: [String!]!, $revision: String) {
        admin {
            rolesAndPermissions {
                grantPermissions(role: $role, target: $target, permissions: $permissions, expectedRevision: $revision) {
                    outcome
                    revision
                    permissions
                }
            }
        }
    }
`;

export const REVOKE_PERMISSION = gql`
    mutation RevokePermission($role: String!, $target: String!, $permission: String!, $revision: String) {
        admin {
            rolesAndPermissions {
                revokePermission(role: $role, target: $target, permission: $permission, expectedRevision: $revision) {
                    outcome
                    revision
                    permissions
                }
            }
        }
    }
`;

export const COLLAPSE_PERMISSION = gql`
    mutation CollapsePermission($role: String!, $target: String!, $permission: String!, $revision: String) {
        admin {
            rolesAndPermissions {
                collapsePermission(role: $role, target: $target, permission: $permission, expectedRevision: $revision) {
                    outcome
                    revision
                    permissions
                }
            }
        }
    }
`;

export const ADD_TARGET = gql`
    mutation AddTarget($role: String!, $path: String!) {
        admin {
            rolesAndPermissions {
                addTarget(role: $role, path: $path)
            }
        }
    }
`;

export const REMOVE_TARGET = gql`
    mutation RemoveTarget($role: String!, $target: String!) {
        admin {
            rolesAndPermissions {
                removeTarget(role: $role, target: $target)
            }
        }
    }
`;

export const CREATE_ROLE = gql`
    mutation CreateRole($name: String!, $parentRole: String, $roleGroup: String) {
        admin {
            rolesAndPermissions {
                createRole(name: $name, parentRole: $parentRole, roleGroup: $roleGroup)
            }
        }
    }
`;

export const DUPLICATE_ROLE = gql`
    mutation DuplicateRole($role: String!, $newName: String!, $withSubRoles: Boolean) {
        admin {
            rolesAndPermissions {
                duplicateRole(role: $role, newName: $newName, withSubRoles: $withSubRoles)
            }
        }
    }
`;

export const DELETE_ROLE = gql`
    mutation DeleteRole($role: String!) {
        admin {
            rolesAndPermissions {
                deleteRole(role: $role)
            }
        }
    }
`;

// The role metadata splits in two. The plain properties go through the generic JCR mutation, and the
// title and the description do not: they are i18n on jnt:role, the generic mutation takes no language,
// and a write through it reports success while leaving nothing a per-language read can find.
export const SAVE_ROLE_METADATA = gql`
    mutation SaveRoleMetadata($path: String!, $nodeTypes: [String!]!, $hidden: String!, $privileged: String!) {
        jcr {
            mutateNode(pathOrId: $path) {
                nodeTypes: mutateProperty(name: "j:nodeTypes") {
                    setValues(values: $nodeTypes, type: STRING)
                }
                hidden: mutateProperty(name: "j:hidden") {
                    setValue(value: $hidden, type: BOOLEAN)
                }
                privileged: mutateProperty(name: "j:privilegedAccess") {
                    setValue(value: $privileged, type: BOOLEAN)
                }
            }
        }
    }
`;

export const SAVE_ROLE_GROUP = gql`
    mutation SaveRoleGroup($path: String!, $roleGroup: String!) {
        jcr {
            mutateNode(pathOrId: $path) {
                roleGroup: mutateProperty(name: "j:roleGroup") {
                    setValue(value: $roleGroup, type: STRING)
                }
            }
        }
    }
`;

export const SAVE_ROLE_TEXT = gql`
    mutation SaveRoleText($role: String!, $language: String!, $title: String, $description: String) {
        admin {
            rolesAndPermissions {
                setRoleText(role: $role, language: $language, title: $title, description: $description)
            }
        }
    }
`;
