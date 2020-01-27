import {registry} from '@jahia/registry';

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
    const apRouteId = 'adminProperties';
    registry.add(`${level}-${apPath.toLowerCase()}`, {
        id: apRouteId,
        type: 'route',
        target: [`${parentTarget}-usersandroles:0`],
        path: apPath,
        route: apRouteId,
        defaultPath: apPath,
        icon: null,
        label: 'Admin Properties',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
