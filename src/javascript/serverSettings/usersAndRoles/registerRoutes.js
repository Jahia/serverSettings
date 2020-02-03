import {registry} from '@jahia/ui-extender';

export const registerRoutes = function (t) {
    const level = 'server';
    const parentTarget = 'administration-server';

    const urPath = '/administration/usersAndRoles';
    registry.addOrReplace('adminRoute', `${level}-${urPath.toLowerCase()}`, {
        targets: [`${parentTarget}:4`],
        path: urPath,
        route: null,
        defaultPath: urPath,
        icon: null,
        label: t('usersAndRoles.label'),
        childrenTarget: 'usersandroles',
        isSelectable: false,
        level: level
    });

    const apPath = '/administration/adminProperties';
    const apRouteId = 'adminProperties';
    registry.addOrReplace('adminRoute', `${level}-${apPath.toLowerCase()}`, {
        id: apRouteId,
        targets: [`${parentTarget}-usersandroles:0`],
        path: apPath,
        route: apRouteId,
        defaultPath: apPath,
        icon: null,
        label: t('usersAndRoles.adminProperties'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const ppPath = '/administration/passwordPolicy';
    const ppRouteId = 'passwordPolicy';
    registry.addOrReplace('adminRoute', `${level}-${ppPath.toLowerCase()}`, {
        id: ppRouteId,
        targets: [`${parentTarget}-usersandroles:5`],
        path: ppPath,
        route: ppRouteId,
        defaultPath: ppPath,
        icon: null,
        label: t('usersAndRoles.passwordPolicy'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
