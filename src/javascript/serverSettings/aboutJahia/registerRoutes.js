import {registry} from '@jahia/ui-extender';

export const registerRoutes = function () {
    registry.add('adminRoute', 'aboutJahia', {
        targets: ['administration-server:0'],
        icon: null,
        label: 'serverSettings:aboutJahia.label',
        isSelectable: true,
        iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/en/settings.aboutJahia.html?redirect=false'
    });
};
