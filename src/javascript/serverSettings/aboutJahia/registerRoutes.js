import React from 'react';
import {registry} from '@jahia/ui-extender';
import Report from '@jahia/moonstone/dist/icons/Report';

export const registerRoutes = function () {
    registry.add('adminRoute', 'aboutJahia', {
        targets: ['administration-server:0'],
        icon: <Report/>,
        label: 'serverSettings:aboutJahia.label',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.aboutJahia.html?redirect=false'
    });
};
