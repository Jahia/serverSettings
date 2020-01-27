import {registry} from '@jahia/registry';

export const registerRoutes = function () {
    const level = 'server';
    const parentTarget = 'administration-server';

    const shPath = '/administration/systemHealth';
    registry.add(`${level}-${shPath.toLowerCase()}`, {
        type: 'route',
        target: [`${parentTarget}:3`],
        path: shPath,
        route: null,
        defaultPath: shPath,
        icon: null,
        label: 'System Health',
        childrenTarget: 'systemhealth',
        isSelectable: false,
        level: level
    });

    const cmPath = '/administration/cacheManagement';
    const cmRouteId = 'cacheManagement';
    registry.add(`${level}-${cmPath.toLowerCase()}`, {
        id: cmRouteId,
        type: 'route',
        target: [`${parentTarget}-systemhealth:0`],
        path: cmPath,
        route: cmRouteId,
        defaultPath: cmPath,
        icon: null,
        label: 'Cache Management',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    // TODO fix issue with label being used for tree item selection (compare this to cacheManagement)
    const mmPath = '/administration/manageMemory';
    const mmRouteId = 'manageMemory';
    registry.add(`${level}-${mmPath.toLowerCase()}`, {
        id: mmRouteId,
        type: 'route',
        target: [`${parentTarget}-systemhealth:1`],
        path: mmPath,
        route: mmRouteId,
        defaultPath: mmPath,
        icon: null,
        label: 'Memory Management',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const riPath = '/administration/reportAnIssue';
    const riRouteId = 'reportAnIssue';
    registry.add(`${level}-${riPath.toLowerCase()}`, {
        id: riRouteId,
        type: 'route',
        target: [`${parentTarget}-systemhealth:2`],
        path: riPath,
        route: riRouteId,
        defaultPath: riPath,
        icon: null,
        label: 'Report an Issue',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });

    const siPath = '/administration/systemInfos';
    const siRouteId = 'systemInfos';
    registry.add(`${level}-${siPath.toLowerCase()}`, {
        id: siRouteId,
        type: 'route',
        target: [`${parentTarget}-systemhealth:3`],
        path: siPath,
        route: siRouteId,
        defaultPath: siPath,
        icon: null,
        label: 'System Information',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
