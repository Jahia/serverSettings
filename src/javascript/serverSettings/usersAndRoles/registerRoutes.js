import {registry} from '@jahia/ui-extender';

export const registerRoutes = function () {
    const level = 'server';
    const parentTarget = 'administration-server';

    const urPath = '/administration/usersAndRoles';
    registry.add('adminRoute', `${level}-${urPath.toLowerCase()}`, {
        targets: [`${parentTarget}:4`],
        path: urPath,
        route: null,
        defaultPath: urPath,
        icon: null,
        label: 'serverSettings:usersAndRoles.label',
        childrenTarget: 'usersandroles',
        isSelectable: false,
        level: level
    });

    const apPath = '/administration/adminProperties';
    const apRouteId = 'adminProperties';
    registry.add('adminRoute', `${level}-${apPath.toLowerCase()}`, {
        id: apRouteId,
        targets: [`${parentTarget}-usersandroles:0`],
        path: apPath,
        route: apRouteId,
        defaultPath: apPath,
        icon: null,
        label: 'serverSettings:usersAndRoles.adminProperties',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const ppPath = '/administration/passwordPolicy';
    const ppRouteId = 'passwordPolicy';
    registry.add('adminRoute', `${level}-${ppPath.toLowerCase()}`, {
        id: ppRouteId,
        targets: [`${parentTarget}-usersandroles:5`],
        path: ppPath,
        route: ppRouteId,
        defaultPath: ppPath,
        icon: null,
        label: 'serverSettings:usersAndRoles.passwordPolicy',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const srPath = '/administration/manageServerRoles';
    const srRouteId = 'manageServerRoles';
    registry.add('adminRoute', `${level}-${srPath.toLowerCase()}`, {
        id: srRouteId,
        targets: [`${parentTarget}-usersandroles:2`],
        path: srPath,
        route: srRouteId,
        defaultPath: srPath,
        icon: null,
        label: 'serverSettings:usersAndRoles.serverRoles',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
