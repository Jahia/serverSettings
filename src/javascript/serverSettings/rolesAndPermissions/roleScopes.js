/**
 * What a role's scope decides on screen.
 *
 * The scope is the j:roleGroup value. It says what a role is granted ON, so it decides both whether a
 * node type restriction means anything and what the granted node is called. Two screens need those
 * answers, so they live here rather than in whichever component asked first.
 */

/**
 * The scopes on which a node type restriction can act.
 *
 * j:nodeTypes narrows the content a role can be granted on. A server, system or site role is granted
 * on the server, the system tools or the site itself, never on a piece of content, so the restriction
 * has nothing to act on there.
 */
const NODE_TYPE_SCOPES = new Set(['edit-role', 'live-role']);

export const grantableOnApplies = role => NODE_TYPE_SCOPES.has(role.roleGroup);

/**
 * What the granted node is, per scope.
 *
 * The current-node target of an edit role is a piece of content, and of a server role it is the whole
 * server. One kind of target, two different things, so the name comes from the pair.
 */
export const CURRENT_NODE_LABELS = {
    'server-role': 'rolesAndPermissions.target.wholeServer',
    'system-role': 'rolesAndPermissions.target.systemTools',
    'site-role': 'rolesAndPermissions.target.currentSite'
};

/** The paths the product itself grants on, named. A path nobody named is shown as the path. */
export const ABSOLUTE_PATH_LABELS = {
    '/': 'rolesAndPermissions.target.wholeServer',
    '/modules': 'rolesAndPermissions.target.studio',
    '/sites/systemsite': 'rolesAndPermissions.target.systemSite'
};
