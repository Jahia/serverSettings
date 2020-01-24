import React from 'react';
import {registry} from '@jahia/registry';
import Language from '@jahia/moonstone/dist/icons/Language';

export const registerRoutes = function () {
    const level = 'server';
    const path = '/administration/webProjectSettings';

    registry.add(`${level}-${path.toLowerCase()}`, {
        type: 'route',
        target: ['administration-server:5'],
        path: path,
        route: 'webProjectSettings',
        defaultPath: path,
        icon: <Language/>,
        label: 'Web Projects',
        childrenTarget: null,
        isSelectable: true,
        level: level
    });
};
