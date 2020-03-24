import React from 'react';
import {registry} from '@jahia/ui-extender';
import Puzzle from '@jahia/moonstone/dist/icons/Puzzle';

export const registerRoutes = function () {
    registry.add('adminRoute', 'systemComponents', {
        targets: ['administration-server:2'],
        icon: <Puzzle/>,
        label: 'serverSettings:systemComponents.label',
        isSelectable: false
    });

    registry.add('adminRoute', 'managePortlets', {
        targets: ['administration-server-systemComponents:4'],
        requiredPermission: 'adminPortlets',
        icon: null,
        label: 'serverSettings:systemComponents.portlets',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.managePortlets.html?redirect=false'
    });
};
