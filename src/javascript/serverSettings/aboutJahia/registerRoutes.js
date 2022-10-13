import React from 'react';
import {registry} from '@jahia/ui-extender';
import {Report} from '@jahia/moonstone';


export const registerRoutes = function () {
    registry.add('adminRoute', 'aboutJahia', {
        targets: ['administration-server:100'],
        icon: <Report/>,
        label: 'serverSettings:aboutJahia.label',
        isSelectable: false
    });
};

registry.add('adminRoute', 'license', {
    targets: ['administration-server-aboutJahia:10'],
    icon: null,
    label: 'serverSettings:aboutJahia.licenses',
    isSelectable: true,
    iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/$lang/settings.aboutJahia.html?redirect=false'
});

registry.add('adminRoute', 'reportAnIssue', {
    targets: ['administration-server-aboutJahia:20'],
    requiredPermission: 'adminIssueTracking',
    icon: null,
    label: 'serverSettings:aboutJahia.reportAnIssue',
    isSelectable: true,
    iframeUrl: window.contextJsParameters.contextPath + '/cms/adminframe/default/$lang/settings.reportAnIssue.html?redirect=false'
});
