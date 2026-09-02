// What a role effectively grants, and why. This spec pins the runtime semantics the new interface is
// built on, so a change in Jahia core that moves them fails here rather than in a screen.
//
// Four rules from core are asserted, each on the roles core itself seeds in
// war/src/main/webapp/WEB-INF/etc/repository/root-roles.xml:
//
// 1. A granted permission grants everything it aggregates. `AccessManagerUtils.matchPermission` reads a
//    role's privileges AND their aggregate privileges, and a permission node's aggregates are its child
//    nodes. So `editor-in-chief` grants `jContent` on the current site and thereby grants `engineTabs`,
//    which it never names.
//
// 2. A sub-role adds to its parent role and can never subtract from it.
//    `AccessManagerUtils.getPrivileges` walks up the role parents before it reads the role's own names.
//
// 3. Role inheritance matches a target by its NODE NAME, not by its path. `getPrivileges` looks for a
//    child node of the same name on each ancestor role. And `AclListener.handleAclModifications` walks
//    that same chain when it creates the external access control entries, so a sub-role that declares
//    no target of a given name still grants what its ancestor's target of that name grants.
//    `translator-en` declares no external target and still grants what `translator/currentSite-access`
//    grants.
//
// 4. `j:privilegedAccess` is read on the role AND on every ancestor. So a sub-role of a privileged role
//    is privileged whatever its own property says. No seeded sub-role separates the two values, so this
//    spec creates one that does.
//
// The two facts per permission are asserted separately on purpose. `isDirect` is what the checkbox
// writes, and `lockKind` is what keeps the permission granted when the target stops naming it. A single
// state would have to choose between them, and the interface would then show a clearable checkbox on a
// permission that clearing does not remove.
//
// The fixture role is created with the generic JCR mutation of graphql-dxm-provider, which also shows
// that `j:permissionNames` is writable through it even though the node type declares it protected.
import gql from 'graphql-tag'

const ROLE = gql`
    query GetRole($name: String!) {
        admin {
            rolesAndPermissions {
                role(name: $name) {
                    name
                    path
                    parentRoleName
                    subRoleNames
                    roleGroup
                    nodeTypes
                    isHidden
                    hasPrivilegedAccess
                    hasEffectivePrivilegedAccess
                    grants {
                        id
                        kind
                        path
                        isInheritedOnly
                        directPermissions
                        revision
                        effectivePermissions {
                            name
                            isDirect
                            isKnown
                            lockKind
                            lockedBy
                        }
                    }
                }
            }
        }
    }
`

const GRANTED_BY = gql`
    query GetGrantedBy {
        admin {
            rolesAndPermissions {
                permissionCatalog {
                    entries(area: "admin") {
                        name
                        grantedBy {
                            roleName
                            grantId
                            targetKind
                            targetPath
                            effective {
                                isDirect
                                lockKind
                                lockedBy
                            }
                        }
                    }
                }
            }
        }
    }
`

const ADD_ROLE = gql`
    mutation AddFixtureRole($parentPath: String!, $name: String!, $permissions: [String!]!) {
        jcr {
            mutateNode(pathOrId: $parentPath) {
                addChild(name: $name, primaryNodeType: "jnt:role") {
                    mutateProperty(name: "j:permissionNames") {
                        setValues(values: $permissions, type: STRING)
                    }
                }
            }
        }
    }
`

const DELETE_ROLE = gql`
    mutation DeleteFixtureRole($path: String!) {
        jcr {
            deleteNode(pathOrId: $path)
        }
    }
`

interface Effective {
    name: string
    isDirect: boolean
    isKnown: boolean
    lockKind: 'IMPLIED_BY_PERMISSION' | 'INHERITED_FROM_ROLE' | null
    lockedBy: string | null
}

interface Grant {
    id: string
    kind: 'CURRENT_NODE' | 'CURRENT_SITE' | 'ABSOLUTE_PATH'
    path: string | null
    isInheritedOnly: boolean
    directPermissions: string[]
    revision: string
    effectivePermissions: Effective[]
}

interface Role {
    name: string
    path: string
    parentRoleName: string | null
    subRoleNames: string[]
    roleGroup: string | null
    nodeTypes: string[]
    isHidden: boolean
    hasPrivilegedAccess: boolean
    hasEffectivePrivilegedAccess: boolean
    grants: Grant[]
}

/** Read one role, and fail with a readable message when the instance has none of that name. */
const readRole = (name: string): Cypress.Chainable<Role> =>
    cy
        .apolloClient()
        .apollo({ query: ROLE, variables: { name } })
        .then((result) => {
            const role = result.data.admin.rolesAndPermissions.role
            expect(role, `the instance must seed the ${name} role`).to.not.be.null
            return role as Role
        })

/** One grant of a role, by target identity. */
const grantOf = (role: Role, id: string): Grant => {
    const grant = role.grants.find((candidate) => candidate.id === id)
    expect(grant, `${role.name} must have the target "${id}"`).to.not.be.undefined
    return grant
}

/** One effective permission of a grant. */
const effectiveOf = (grant: Grant, permission: string): Effective => {
    const effective = grant.effectivePermissions.find((candidate) => candidate.name === permission)
    expect(effective, `the target "${grant.id}" must grant ${permission}`).to.not.be.undefined
    return effective
}

describe('Roles and permissions - what a role effectively grants', () => {
    beforeEach(() => {
        cy.login()
    })

    describe('a permission granted on a target grants everything it aggregates', () => {
        it('gives editor-in-chief engineTabs on the current site, through jContent', () => {
            readRole('editor-in-chief').then((role) => {
                const site = grantOf(role, 'currentSite-access')
                expect(site.kind, 'the target resolves to the site of the granted node').to.eq('CURRENT_SITE')
                expect(site.path).to.eq('currentSite')

                // root-roles.xml gives this target exactly one permission name.
                expect(site.directPermissions, 'the target names jContent and nothing else').to.deep.eq([
                    'jContent',
                ])

                const jContent = effectiveOf(site, 'jContent')
                expect(jContent.isDirect, 'jContent is the name the target holds').to.be.true
                expect(jContent.lockKind, 'nothing else holds jContent, so the row is free').to.be.null

                // engineTabs is a child of jContent in the permission tree, and the parent role does not
                // grant it. So it is granted here, and only the local jContent grant holds it.
                const engineTabs = effectiveOf(site, 'engineTabs')
                expect(engineTabs.isDirect, 'the target does not name engineTabs').to.be.false
                expect(engineTabs.lockKind).to.eq('IMPLIED_BY_PERMISSION')
                expect(engineTabs.lockedBy, 'jContent is the ancestor that grants it').to.eq('jContent')

                // Aggregation is transitive. viewComponentRightsTab sits three levels below jContent, at
                // /permissions/jContent/engineTabs/viewRolesTab/viewComponentRightsTab, and the editor
                // role grants none of the three permissions between them. So only jContent holds it.
                const deep = effectiveOf(site, 'viewComponentRightsTab')
                expect(deep.isDirect).to.be.false
                expect(deep.lockKind).to.eq('IMPLIED_BY_PERMISSION')
                expect(deep.lockedBy, 'the lock names the granted ancestor, not the nearest one').to.eq(
                    'jContent',
                )
            })
        })
    })

    describe('a sub-role adds to its parent role', () => {
        it('gives editor-in-chief the editor permissions, locked by the parent role', () => {
            readRole('editor-in-chief').then((role) => {
                expect(role.parentRoleName).to.eq('editor')

                const node = grantOf(role, '')
                expect(node.kind, 'the empty identity is the node the role is granted on').to.eq('CURRENT_NODE')
                // root-roles.xml gives editor-in-chief these two names on the granted node.
                expect(node.directPermissions).to.include.members(['publish', 'workflow-tasks'])

                const publish = effectiveOf(node, 'publish')
                expect(publish.isDirect).to.be.true

                // editor names api-access on the granted node, and editor-in-chief does not.
                const apiAccess = effectiveOf(node, 'api-access')
                expect(apiAccess.isDirect, 'editor-in-chief does not name api-access').to.be.false
                expect(apiAccess.lockKind).to.eq('INHERITED_FROM_ROLE')
                expect(apiAccess.lockedBy).to.eq('editor')
            })
        })

        it('reports a parent role lock ahead of a local aggregate, because no local edit frees it', () => {
            readRole('editor-in-chief').then((role) => {
                // jContentAccess is granted twice over on this target. The editor role names it on its own
                // currentSite-access, and editor-in-chief grants jContent, which aggregates it. Clearing
                // jContent here would not remove it, so the parent role is the lock worth reporting.
                const site = grantOf(role, 'currentSite-access')
                const jContentAccess = effectiveOf(site, 'jContentAccess')
                expect(jContentAccess.isDirect, 'the target names jContent, not jContentAccess').to.be.false
                expect(jContentAccess.lockKind).to.eq('INHERITED_FROM_ROLE')
                expect(jContentAccess.lockedBy).to.eq('editor')
            })
        })
    })

    describe('role inheritance matches a target by node name', () => {
        it('gives translator-en the translator site permissions, on a target it does not declare', () => {
            readRole('translator-en').then((role) => {
                expect(role.parentRoleName).to.eq('translator')

                const site = grantOf(role, 'currentSite-access')
                expect(site.isInheritedOnly, 'translator-en declares no external target of its own').to.be.true
                expect(site.directPermissions, 'so it names nothing there').to.deep.eq([])
                expect(site.path, 'the ancestor target decides where the permissions apply').to.eq('currentSite')

                // translator/currentSite-access names jContentAccess, so translator-en grants it too.
                const jContentAccess = effectiveOf(site, 'jContentAccess')
                expect(jContentAccess.isDirect).to.be.false
                expect(jContentAccess.lockKind).to.eq('INHERITED_FROM_ROLE')
                expect(jContentAccess.lockedBy).to.eq('translator')
            })
        })
    })

    describe('privileged access is read on the whole role chain', () => {
        // No seeded sub-role separates its own j:privilegedAccess from its parent's, so the case is
        // created here. The parent, editor, sets the property and this child does not.
        const fixture = 'rpPrivFixture' + Date.now().toString(36)
        const fixturePath = `/roles/editor/${fixture}`
        const unknownPermission = 'rpNoSuchPermission' + Date.now().toString(36)

        before(() => {
            cy.login()
            cy.apolloClient().apollo({
                mutation: ADD_ROLE,
                variables: { parentPath: '/roles/editor', name: fixture, permissions: [unknownPermission] },
            })
        })

        after(() => {
            cy.login()
            cy.apolloClient().apollo({ mutation: DELETE_ROLE, variables: { path: fixturePath } })
        })

        it('makes a sub-role of a privileged role privileged, whatever its own property says', () => {
            readRole(fixture).then((role) => {
                expect(role.parentRoleName).to.eq('editor')
                expect(role.hasPrivilegedAccess, 'the fixture sets no property of its own').to.be.false
                expect(
                    role.hasEffectivePrivilegedAccess,
                    'editor sets it, and AclListener reads the whole chain',
                ).to.be.true
            })
        })

        it('keeps a granted permission no module declares, and marks it unknown', () => {
            readRole(fixture).then((role) => {
                const node = grantOf(role, '')
                expect(node.directPermissions).to.include(unknownPermission)

                const unknown = effectiveOf(node, unknownPermission)
                expect(unknown.isDirect).to.be.true
                expect(unknown.isKnown, 'no installed module declares this name').to.be.false
                expect(unknown.lockKind, 'nothing holds it, so an administrator can remove it').to.be.null
            })
        })
    })

    describe('the reverse index', () => {
        it('names the role that grants adminRoles, and the aggregate that carries it', () => {
            cy.apolloClient()
                .apollo({ query: GRANTED_BY })
                .then((result) => {
                    const entries = result.data.admin.rolesAndPermissions.permissionCatalog.entries
                    const adminRoles = entries.find((entry) => entry.name === 'adminRoles')
                    expect(adminRoles, 'adminRoles is declared by the rolesmanager module').to.not.be.undefined

                    // server-administrator names `admin` on the granted node and never names adminRoles.
                    const byServerAdmin = adminRoles.grantedBy.filter(
                        (usage) => usage.roleName === 'server-administrator' && usage.grantId === '',
                    )
                    expect(byServerAdmin, 'server-administrator must grant adminRoles').to.have.length(1)
                    expect(byServerAdmin[0].targetKind).to.eq('CURRENT_NODE')
                    expect(byServerAdmin[0].effective.isDirect).to.be.false
                    expect(byServerAdmin[0].effective.lockKind).to.eq('IMPLIED_BY_PERMISSION')
                    expect(
                        byServerAdmin[0].effective.lockedBy,
                        'the admin permission aggregates adminRoles',
                    ).to.eq('admin')
                })
        })
    })
})
