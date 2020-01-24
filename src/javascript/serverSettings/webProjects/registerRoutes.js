import {registry} from '@jahia/registry';

export const registerRoutes = function () {
    const level = 'server';
    const path = '/administration/webProjectSettings';

    registry.add(`${level}-${path.toLowerCase()}`, {
        type: 'route',
        target: ['administration-server:5'],
        path: path,
        route: 'webProjectSettings',
        defaultPath: path,
        icon: null,
        label: 'Web Projects',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
