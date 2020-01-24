import React from 'react';
import {registry} from '@jahia/registry';
import Info from '@jahia/moonstone/dist/icons/Info';

export const registerRoutes = function () {
    const level = 'server';
    const path = '/administration/aboutJahia';

    registry.add(`${level}-${path.toLowerCase()}`, {
        type: 'route',
        target: ['administration-server:0'],
        path: path,
        route: 'aboutJahia',
        defaultPath: path,
        icon: <Info/>,
        label: 'About Jahia',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
