import {registry} from '@jahia/ui-extender';

export const registerRoutes = function () {
    registry.add('adminRoute', 'webProjectSettings', {
        targets: ['administration-server:5'],
        requiredPermission: 'adminVirtualSites',
        icon: null,
        label: 'serverSettings:webProjects.label',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.webProjectSettings.html?redirect=false'
    });
};
