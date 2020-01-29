import {registry} from '@jahia/ui-extender';

export const registerRoutes = function (t) {
    const level = 'server';
    const path = '/administration/webProjectSettings';
    const routeId = 'webProjectSettings';
    registry.addOrReplace('adminRoute', `${level}-${path.toLowerCase()}`, {
        id: routeId,
        targets: ['administration-server:5'],
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
