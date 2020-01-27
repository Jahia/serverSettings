import {registry} from '@jahia/registry';

export const registerRoutes = function () {
    const level = 'server';
    const path = '/administration/aboutJahia';

    const routeId = 'aboutJahia';
    registry.add(`${level}-${path.toLowerCase()}`, {
        id: routeId,
        type: 'route',
        target: ['administration-server:0'],
        path: path,
        route: routeId,
        defaultPath: path,
        icon: null,
        label: 'About Jahia',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
