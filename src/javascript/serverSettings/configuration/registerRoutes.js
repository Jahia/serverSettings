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
};
