import React from 'react';
import {registry} from '@jahia/ui-extender';
import RolesAndPermissions from './index';

// A second entry next to the rolesmanager one, which stays installed. rolesmanager registers
// 'rolesAndPermissions' at position 30 of the same target, so this entry sits right after it.
export const registerRoutes = function () {
    registry.add('adminRoute', 'rolesAndPermissionsV2', {
        targets: ['administration-server-usersAndRoles:31'],
        requiredPermission: 'adminRoles',
        icon: null,
        label: 'serverSettings:rolesAndPermissions.label',
        isSelectable: true,
        render: () => <RolesAndPermissions/>
    });
};
