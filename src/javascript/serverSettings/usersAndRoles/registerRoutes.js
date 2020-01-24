import React from 'react';
import { registry } from '@jahia/registry';

export const registerRoutes = function () {
    const level = 'server';
    const parentTarget = 'administration-server';

    const urPath = '/administration/usersAndRoles';
    registry.add(`${level}-${urPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}:4`],
        path: urPath,
        route: null,
        defaultPath: urPath,
        icon: null,
        label: 'Users and Roles',
        childrenTarget: 'usersandroles',
        isSelectable: false,
        level: level
    });

    const apPath = '/administration/adminProperties';
    registry.add(`${level}-${apPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}-usersandroles:0`],
        path: apPath,
        route: 'adminProperties',
        defaultPath: apPath,
        icon: null,
        label: 'Admin Properties',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
