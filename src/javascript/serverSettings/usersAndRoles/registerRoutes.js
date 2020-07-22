import React from 'react';
import {registry} from '@jahia/ui-extender';
import Groups from '@jahia/moonstone/dist/icons/Group';

export const registerRoutes = function () {
    registry.add('adminRoute', 'usersAndRoles', {
        targets: ['administration-server:20'],
        icon: <Groups/>,
        label: 'serverSettings:usersAndRoles.label',
        isSelectable: false
    });

    registry.add('adminRoute', 'adminProperties', {
        targets: ['administration-server-usersAndRoles:70'],
        requiredPermission: 'adminRootUser',
        icon: null,
        label: 'serverSettings:usersAndRoles.adminProperties',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.adminProperties.html?redirect=false'
    });

    registry.add('adminRoute', 'passwordPolicy', {
        targets: ['administration-server-usersAndRoles:50'],
        requiredPermission: 'adminPasswordPolicy',
        icon: null,
        label: 'serverSettings:usersAndRoles.passwordPolicy',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.passwordPolicy.html?redirect=false'
    });

    registry.add('adminRoute', 'manageServerRoles', {
        targets: ['administration-server-usersAndRoles:40'],
        requiredPermission: 'adminServerRoles',
        icon: null,
        label: 'serverSettings:usersAndRoles.serverRoles',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.manageServerRoles.html?redirect=false'
    });

    registry.add('adminRoute', 'manageSystemRoles', {
        targets: ['administration-server-usersAndRoles:41'],
        requiredPermission: 'systemToolsAccess',
        icon: null,
        label: 'serverSettings:usersAndRoles.systemRoles',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.manageSystemRoles.html?redirect=false'
    });
};
