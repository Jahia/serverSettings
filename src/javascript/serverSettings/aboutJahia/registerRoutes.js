import {registry} from '@jahia/registry';

export const registerRoutes = function (t) {
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
        label: t('aboutJahia.label'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
