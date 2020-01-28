import {registry} from '@jahia/registry';

export const registerRoutes = function (t) {
    const level = 'server';
    const path = '/administration/webProjectSettings';
    const routeId = 'webProjectSettings';
    registry.add(`${level}-${path.toLowerCase()}`, {
        id: routeId,
        type: 'route',
        target: ['administration-server:5'],
        path: path,
        route: routeId,
        defaultPath: path,
        icon: null,
        label: t('webProjects.label'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
