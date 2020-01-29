import {registry} from '@jahia/ui-extender';

export const registerRoutes = function (t) {
    const level = 'server';
    const path = '/administration/aboutJahia';

    const routeId = 'aboutJahia';
    registry.add('adminRoute', `${level}-${path.toLowerCase()}`, {
        id: routeId,
        targets: ['administration-server:0'],
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
