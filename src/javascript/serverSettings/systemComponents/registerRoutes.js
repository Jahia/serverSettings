import {registry} from '@jahia/registry';

export const registerRoutes = function () {
    const level = 'server';
    const parentTarget = 'administration-server';

    const scPath = '/administration/systemComponents';
    registry.add(`${level}-${scPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}:2`],
        path: scPath,
        route: null,
        defaultPath: scPath,
        icon: null,
        label: 'System Components',
        childrenTarget: 'systemcomponents',
        isSelectable: false,
        level: level
    });

    const mpPath = '/administration/managePortlets';
    registry.add(`${level}-${mpPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}-systemcomponents:0`],
        path: mpPath,
        route: 'managePortlets',
        defaultPath: mpPath,
        icon: null,
        label: 'Portlets',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
