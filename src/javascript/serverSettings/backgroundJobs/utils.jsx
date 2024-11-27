import React from 'react';
import {SortIndicator} from '@jahia/moonstone';

export const renderSortIndicator = (isSorted, isSortedDesc) => {
    const direction = isSortedDesc ? 'descending' : 'ascending';
    return <SortIndicator isSorted={isSorted} direction={direction}/>;
};

export const parseUsername = username => {
    if (username.indexOf('/users/') !== -1) {
        return username.split('/users/')[1];
    }

    return username;
};
