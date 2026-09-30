import React from 'react';
import {registry} from '@jahia/ui-extender';
import {Build} from '@jahia/moonstone';

export const registerRoutes = function () {
    registry.add('adminRoute', 'configuration', {
        targets: ['administration-server:40'],
        icon: <Build/>,
        label: 'serverSettings:configuration.label',
        isSelectable: false
    });

    registry.add('adminRoute', 'mailServerSettings', {
        targets: ['administration-server-configuration:0'],
        requiredPermission: 'adminEmailSettings',
        icon: null,
        label: 'serverSettings:configuration.mailServerSettings',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.mailServerSettings.html?redirect=false'
    });
};
