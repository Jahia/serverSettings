import React from 'react';
import {useHistory, useLocation} from 'react-router-dom';
import RoleList from './RoleList';
import RoleDetail from './RoleDetail';

// One administration route carries both screens, and the role name lives in the query string. The
// administration navigation gives a route no path parameter, so a query string is what keeps a role
// deep-linkable: an administrator can send a colleague the address of the role they are discussing.
export const RolesAndPermissions = () => {
    const location = useLocation();
    const history = useHistory();

    const selectedRole = new URLSearchParams(location.search).get('role');

    const openRole = roleName => history.push(`${location.pathname}?role=${encodeURIComponent(roleName)}`);
    const closeRole = () => history.push(location.pathname);

    return selectedRole ?
        <RoleDetail roleName={selectedRole} onClose={closeRole} onOpenRole={openRole}/> :
        <RoleList onOpenRole={openRole}/>;
};

export default RolesAndPermissions;
