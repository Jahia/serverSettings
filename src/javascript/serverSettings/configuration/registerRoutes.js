import {registry} from '@jahia/ui-extender';

export const registerRoutes = function () {
    const level = 'server';
    const parentTarget = 'administration-server';

    const cPath = '/administration/configuration';
    registry.add('adminRoute', `${level}-${cPath.toLowerCase()}`, {
        targets: [`${parentTarget}:1`],
        path: cPath,
        route: null,
        defaultPath: cPath,
        icon: null,
        label: 'serverSettings:configuration.label',
        childrenTarget: 'configuration',
        isSelectable: false,
        level: level
    });

    const mssPath = '/administration/mailServerSettings';
    const mssRouteId = 'mailServerSettings';
    registry.add('adminRoute', `${level}-${mssPath.toLowerCase()}`, {
        id: mssRouteId,
        targets: [`${parentTarget}-configuration:0`],
        path: mssPath,
        route: mssRouteId,
        defaultPath: mssPath,
        requiredPermission: 'adminEmailSettings',
        icon: null,
        label: 'serverSettings:configuration.mailServerSettings',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const ssPath = '/administration/search-settings';
    const ssRouteId = 'search-settings';
    registry.add('adminRoute', `${level}-${ssPath.toLowerCase()}`, {
        id: ssRouteId,
        targets: [`${parentTarget}-configuration:1`],
        path: ssPath,
        route: ssRouteId,
        defaultPath: ssPath,
        requiredPermission: 'searchSettings',
        icon: null,
        label: 'serverSettings:configuration.searchSettings',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
