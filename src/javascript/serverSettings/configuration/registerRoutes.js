import {registry} from '@jahia/registry';

export const registerRoutes = function () {
    const level = 'server';
    const parentTarget = 'administration-server';

    const cPath = '/administration/configuration';
    registry.add(`${level}-${cPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}:1`],
        path: cPath,
        route: null,
        defaultPath: cPath,
        icon: null,
        label: 'Configuration',
        childrenTarget: 'configuration',
        isSelectable: false,
        level: level
    });

    const mssPath = '/administration/mailServerSettings';
    const mssRouteId = 'mailServerSettings';
    registry.add(`${level}-${mssPath.toLowerCase()}`, {
        id: mssRouteId,
        type: 'route',
        target: [`${parentTarget}-configuration:0`],
        path: mssPath,
        route: mssRouteId,
        defaultPath: mssPath,
        icon: null,
        label: 'Mail Server Settings',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const ssPath = '/administration/search-settings';
    const ssRouteId = 'search-settings';
    registry.add(`${level}-${ssPath.toLowerCase()}`, {
        id: ssRouteId,
        type: 'route',
        target: [`${parentTarget}-configuration:1`],
        path: ssPath,
        route: ssRouteId,
        defaultPath: ssPath,
        icon: null,
        label: 'Search Settings',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
