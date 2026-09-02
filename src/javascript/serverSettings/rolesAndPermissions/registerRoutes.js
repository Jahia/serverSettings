import React from 'react';
import {registry} from '@jahia/ui-extender';
import RoleList from './RoleList';
import PermissionExplorer from './PermissionExplorer';

// Two entries next to the rolesmanager one, which stays installed. rolesmanager registers
// 'rolesAndPermissions' at position 30 of the same target, so these two sit right after it.
//
// The entries are siblings and not nested, because the administration navigation renders one level of
// children under a group and 'usersAndRoles' is already that group.
export const registerRoutes = function () {
    registry.add('adminRoute', 'rolesAndPermissionsV2', {
        targets: ['administration-server-usersAndRoles:31'],
        requiredPermission: 'adminRoles',
        icon: null,
        label: 'serverSettings:rolesAndPermissions.label',
        isSelectable: true,
        render: () => <RoleList/>
    });

    registry.add('adminRoute', 'permissionsExplorer', {
        targets: ['administration-server-usersAndRoles:32'],
        requiredPermission: 'adminRoles',
        icon: null,
        label: 'serverSettings:rolesAndPermissions.explorer.label',
        isSelectable: true,
        render: () => <PermissionExplorer/>
    });
};
