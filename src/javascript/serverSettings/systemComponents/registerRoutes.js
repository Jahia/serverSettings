import {registry} from '@jahia/ui-extender';

export const registerRoutes = function (t) {
    const level = 'server';
    const parentTarget = 'administration-server';

    const scPath = '/administration/systemComponents';
    registry.add('adminRoute', `${level}-${scPath.toLowerCase()}`, {
        targets: [`${parentTarget}:2`],
        path: scPath,
        route: null,
        defaultPath: scPath,
        icon: null,
        label: t('systemComponents.label'),
        childrenTarget: 'systemcomponents',
        isSelectable: false,
        level: level
    });

    const mpPath = '/administration/managePortlets';
    const mpRouteId = 'managePortlets';
    registry.add('adminRoute', `${level}-${mpPath.toLowerCase()}`, {
        id: mpRouteId,
        targets: [`${parentTarget}-systemcomponents:0`],
        path: mpPath,
        route: mpRouteId,
        defaultPath: mpPath,
        icon: null,
        label: t('systemComponents.portlets'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
