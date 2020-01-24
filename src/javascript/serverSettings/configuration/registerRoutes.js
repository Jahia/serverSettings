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
    registry.add(`${level}-${mssPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}-configuration:0`],
        path: mssPath,
        route: 'mailServerSettings',
        defaultPath: mssPath,
        icon: null,
        label: 'Mail Server Settings',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const ssPath = '/administration/search-settings';
    registry.add(`${level}-${ssPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}-configuration:1`],
        path: ssPath,
        route: 'search-settings',
        defaultPath: ssPath,
        icon: null,
        label: 'Search Settings',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
