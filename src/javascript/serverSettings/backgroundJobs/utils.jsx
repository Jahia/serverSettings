import React from 'react';
import {SortIndicator} from '@jahia/moonstone';

export const renderSortIndicator = (isSorted, isSortedDesc) => {
    const direction = isSortedDesc ? 'descending' : 'ascending';
    return <SortIndicator isSorted={isSorted} direction={direction}/>;
};

export const parseUsername = username => {
    if (!username) {
        return 'Unknown user';
    }

    if (username.indexOf('/') === -1) {
        return username;
    }

    return username.split('/').pop();
};
