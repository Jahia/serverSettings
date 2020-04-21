import React from 'react';
import {registry} from '@jahia/ui-extender';
import Puzzle from '@jahia/moonstone/dist/icons/Puzzle';

export const registerRoutes = function () {
    registry.add('adminRoute', 'systemComponents', {
        targets: ['administration-server:30'],
        icon: <Puzzle/>,
        label: 'serverSettings:systemComponents.label',
        isSelectable: false
    });
};
