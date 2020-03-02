import {registry} from '@jahia/ui-extender';

export const registerRoutes = function () {
    const level = 'server';
    const path = '/administration/webProjectSettings';
    const routeId = 'webProjectSettings';
    registry.add('adminRoute', `${level}-${path.toLowerCase()}`, {
        id: routeId,
        targets: ['administration-server:5'],
        path: path,
        route: routeId,
        defaultPath: path,
        requiredPermission: 'adminVirtualSites',
        icon: null,
        label: 'serverSettings:webProjects.label',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
