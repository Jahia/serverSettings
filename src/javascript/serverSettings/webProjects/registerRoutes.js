import React from 'react';
import {registry} from '@jahia/ui-extender';
import WebProjects from '@jahia/moonstone/dist/icons/WebProject';

export const registerRoutes = function () {
    registry.add('adminRoute', 'webProjectSettings', {
        targets: ['administration-server:5'],
        requiredPermission: 'adminVirtualSites',
        icon: <WebProjects/>,
        label: 'serverSettings:webProjects.label',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.webProjectSettings.html?redirect=false'
    });
};
