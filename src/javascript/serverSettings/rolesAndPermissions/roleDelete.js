/**
 * What deleting a role takes away, stated the same way wherever the deletion is offered.
 *
 * The list and the detail both offer it, and both have to say the same thing. Written twice they
 * parted once already: one appended the ellipsis for a truncated principal list and the other did
 * not, so the same role read as held by twenty principals in one place and by exactly those twenty
 * in the other.
 */

/** True when the deletion takes something away, so the role name has to be typed to confirm it. */
export const isCostlyDelete = role => role.usage.entryCount > 0 || role.subRoleNames.length > 0;

/**
 * The consequence lines for the confirmation, in reading order.
 *
 * @param role the role, with its usage, sub-role names and own permission names
 * @param t the translation function
 * @returns an array of strings, never empty
 */
export const deleteConsequences = (role, t) => {
    const lines = [];

    if (role.usage.entryCount > 0) {
        lines.push(t('rolesAndPermissions.confirm.deleteHeld', {
            count: role.usage.entryCount,
            // The server cuts the list at its own limit, and says so. Without the ellipsis the
            // confirmation names twenty principals and reads as if those were all of them.
            principals: role.usage.principals.join(', ') + (role.usage.isTruncated ? '…' : '')
        }));
    } else {
        lines.push(t('rolesAndPermissions.confirm.deleteUnused'));
    }

    if (role.subRoleNames.length > 0) {
        lines.push(t('rolesAndPermissions.confirm.deleteSubRoles', {
            names: role.subRoleNames.join(', ')
        }));
    }

    if (role.directPermissionNames.length > 0) {
        lines.push(t('rolesAndPermissions.confirm.deletePermissions', {
            count: role.directPermissionNames.length
        }));
    }

    return lines;
};
