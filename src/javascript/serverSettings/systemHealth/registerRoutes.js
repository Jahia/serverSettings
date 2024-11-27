import React from 'react';
import {registry} from '@jahia/ui-extender';
import {Heal} from '@jahia/moonstone';
import BackgroundJobsTabs from '../backgroundJobs';

export const registerRoutes = function () {
    registry.add('adminRoute', 'systemHealth', {
        targets: ['administration-server:50'],
        requiredPermission: 'adminSystemInfos',
        icon: <Heal/>,
        label: 'serverSettings:systemHealth.label',
        isSelectable: false
    });

    registry.add('adminRoute', 'cacheManagement', {
        targets: ['administration-server-systemHealth:0'],
        requiredPermission: 'adminCache',
        icon: null,
        label: 'serverSettings:systemHealth.cacheManagement',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.cacheManagement.html?redirect=false'
    });

    // TODO fix issue with label being used for tree item selection (compare this to cacheManagement)
    registry.add('adminRoute', 'manageMemory', {
        targets: ['administration-server-systemHealth:1'],
        requiredPermission: 'adminManageMemory',
        icon: null,
        label: 'serverSettings:systemHealth.memoryManagement',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.manageMemory.html?redirect=false'
    });

    registry.add('adminRoute', 'systemInfos', {
        targets: ['administration-server-systemHealth:3'],
        icon: null,
        label: 'serverSettings:systemHealth.systemInfo',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.systemInfos.html?redirect=false'
    });

    registry.add('adminRoute', 'backgroundJobs', {
        targets: ['administration-server-systemHealth:4'],
        icon: null,
        label: 'serverSettings:systemHealth.backgroundJobs',
        isSelectable: true,
        render: () => <BackgroundJobsTabs/>
    });
};
