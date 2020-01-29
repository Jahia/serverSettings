import {registry} from '@jahia/ui-extender';

export const registerRoutes = function (t) {
    const level = 'server';
    const parentTarget = 'administration-server';

    const shPath = '/administration/systemHealth';
    registry.add('route', `${level}-${shPath.toLowerCase()}`, {
        targets: [`${parentTarget}:3`],
        path: shPath,
        route: null,
        defaultPath: shPath,
        icon: null,
        label: t('systemHealth.label'),
        childrenTarget: 'systemhealth',
        isSelectable: false,
        level: level
    });

    const cmPath = '/administration/cacheManagement';
    const cmRouteId = 'cacheManagement';
    registry.add('route', `${level}-${cmPath.toLowerCase()}`, {
        id: cmRouteId,
        targets: [`${parentTarget}-systemhealth:0`],
        path: cmPath,
        route: cmRouteId,
        defaultPath: cmPath,
        icon: null,
        label: t('systemHealth.cacheManagement'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    // TODO fix issue with label being used for tree item selection (compare this to cacheManagement)
    const mmPath = '/administration/manageMemory';
    const mmRouteId = 'manageMemory';
    registry.add('route', `${level}-${mmPath.toLowerCase()}`, {
        id: mmRouteId,
        targets: [`${parentTarget}-systemhealth:1`],
        path: mmPath,
        route: mmRouteId,
        defaultPath: mmPath,
        icon: null,
        label: t('systemHealth.memoryManagement'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const riPath = '/administration/reportAnIssue';
    const riRouteId = 'reportAnIssue';
    registry.add('route', `${level}-${riPath.toLowerCase()}`, {
        id: riRouteId,
        targets: [`${parentTarget}-systemhealth:2`],
        path: riPath,
        route: riRouteId,
        defaultPath: riPath,
        icon: null,
        label: t('systemHealth.reportAnIssue'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const siPath = '/administration/systemInfos';
    const siRouteId = 'systemInfos';
    registry.add('route', `${level}-${siPath.toLowerCase()}`, {
        id: siRouteId,
        targets: [`${parentTarget}-systemhealth:3`],
        path: siPath,
        route: siRouteId,
        defaultPath: siPath,
        icon: null,
        label: t('systemHealth.systemInformation'),
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
