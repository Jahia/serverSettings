import React from 'react';
import {registry} from '@jahia/ui-extender';
import {WebProject} from '@jahia/moonstone';

export const registerRoutes = function () {
    registry.add('adminRoute', 'webProjectSettings', {
        targets: ['administration-server:10'],
        requiredPermission: 'adminVirtualSites',
        icon: <WebProject/>,
        label: 'serverSettings:webProjects.label',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.webProjectSettings.html?redirect=false'
    });
};
