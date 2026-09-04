import React from 'react';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';
import {Chip, Typography} from '@jahia/moonstone';
import {grantableOnApplies} from './RoleIdentityTab';
import classes from './styles.css';

// One fact per entry, stated in words. A value that is a set is a row of chips, and a value that is a
// choice between two states names the state it is in rather than showing a switch, because nothing
// here is editable.
const Fact = ({label, children, testId}) => (
    <div className={classes.fact} data-testid={testId}>
        <Typography variant="caption" className={classes.factLabel}>{label}</Typography>
        <div className={classes.factValue}>{children}</div>
    </div>
);

Fact.propTypes = {
    label: PropTypes.string.isRequired,
    children: PropTypes.node.isRequired,
    testId: PropTypes.string.isRequired
};

/**
 * Everything the role IS, on the page that is about it.
 *
 * These facts used to be readable only by opening the dialog that edits them, so reading what a role
 * applies on meant entering an editing form and leaving it again. The page is about one role, so the
 * role's own properties belong on it, and stating them read-only keeps the editing in one place.
 *
 * An empty value is stated rather than left blank wherever the emptiness means something: no node
 * type means any node type, and no privileged access is a fact about the role. A set that is empty
 * carries nothing, so a role that is nested inside nothing shows no row for it.
 */
export const RoleFacts = ({role}) => {
    const {t} = useTranslation('serverSettings');

    // Three answers, not two. AclListener reads j:privilegedAccess on the whole role chain, so a
    // sub-role of a privileged role is privileged whatever its own property says, and that is the one
    // case where nothing on this role can change the answer. So the line names the parent there.
    const privilegedAccess = () => {
        if (!role.hasEffectivePrivilegedAccess) {
            return t('rolesAndPermissions.detail.notPrivileged');
        }

        if (role.hasPrivilegedAccess) {
            return t('rolesAndPermissions.detail.privilegedYes');
        }

        return t('rolesAndPermissions.detail.privilegedViaParent', {parent: role.parentRoleName});
    };

    return (
        <div className={classes.factsBar} data-testid="role-facts">
            {role.description ?
                <Fact
                    testId="role-facts-description"
                    label={t('rolesAndPermissions.detail.descriptionPlain')}
                >
                    <Typography variant="body">{role.description}</Typography>
                </Fact> :
                null}

            <Fact testId="role-facts-scope" label={t('rolesAndPermissions.detail.scope')}>
                {role.roleGroup ?
                    <Chip label={role.roleGroup}/> :
                    <Typography variant="body">{t('rolesAndPermissions.list.noScope')}</Typography>}
            </Fact>

            {/*
              * No node type means the role can be granted on anything, so the empty case is a fact
              * and not a blank. It was readable only from the edit form until now.
              *
              * The fact is absent on a scope the restriction cannot act on. A server, system or site
              * role is granted on the server, the system tools or the site itself, never on a piece of
              * content, and "Any node type" there states a freedom the role never had.
              */}
            {grantableOnApplies(role) ?
                <Fact testId="role-facts-nodetypes" label={t('rolesAndPermissions.detail.nodeTypes')}>
                    {role.nodeTypes.length > 0 ?
                        <div className={classes.chipRow}>
                            {role.nodeTypes.map(nodeType => <Chip key={nodeType} label={nodeType}/>)}
                        </div> :
                        <Typography variant="body">{t('rolesAndPermissions.detail.anyNodeType')}</Typography>}
                </Fact> :
                null}

            {/* The value answers the label, so it does not repeat it. */}
            <Fact testId="role-facts-privileged" label={t('rolesAndPermissions.detail.privileged')}>
                <Typography variant="body">{privilegedAccess()}</Typography>
            </Fact>

            <Fact testId="role-facts-visibility" label={t('rolesAndPermissions.detail.visibility')}>
                <Typography variant="body">
                    {role.isHidden ?
                        t('rolesAndPermissions.list.hidden') :
                        t('rolesAndPermissions.detail.visibleInPicker')}
                </Typography>
            </Fact>

            {role.subRoleNames.length > 0 ?
                <Fact testId="role-facts-subroles" label={t('rolesAndPermissions.detail.subRoles')}>
                    <div className={classes.chipRow}>
                        {role.subRoleNames.map(subRole => <Chip key={subRole} label={subRole}/>)}
                    </div>
                </Fact> :
                null}

            {role.dependencies.length > 0 ?
                <Fact testId="role-facts-dependencies" label={t('rolesAndPermissions.detail.dependencies')}>
                    <div className={classes.chipRow}>
                        {role.dependencies.map(dependency => <Chip key={dependency} label={dependency}/>)}
                    </div>
                </Fact> :
                null}
        </div>
    );
};

RoleFacts.propTypes = {
    role: PropTypes.shape({
        description: PropTypes.string,
        roleGroup: PropTypes.string,
        nodeTypes: PropTypes.arrayOf(PropTypes.string).isRequired,
        isHidden: PropTypes.bool.isRequired,
        hasPrivilegedAccess: PropTypes.bool.isRequired,
        hasEffectivePrivilegedAccess: PropTypes.bool.isRequired,
        parentRoleName: PropTypes.string,
        subRoleNames: PropTypes.arrayOf(PropTypes.string).isRequired,
        dependencies: PropTypes.arrayOf(PropTypes.string).isRequired
    }).isRequired
};

export default RoleFacts;
