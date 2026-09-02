// The permission gate of the roles and permissions GraphQL namespace.
//
// The namespace hangs off the admin query root, and TWO gates therefore stand between a caller and the
// data. The `admin` root itself requires `jcr:read` on `/jcr:system`, and the `rolesAndPermissions` field
// under it requires `adminRoles`. A refusal that only proves the outer gate proves nothing about this
// module, so every negative assertion below reads the ERROR PATH and not just the message: a refusal owed
// to this module's gate carries the path `admin.rolesAndPermissions`, while the outer gate carries `admin`
// alone. That distinction is what makes these tests about the field this module adds.
//
// Non-vacuity: each refusal is paired with a POSITIVE CONTROL that goes through the same client and the
// same document and reads the data. Without it, a namespace that never resolved at all would produce a
// green suite for the boring reason that nothing was reachable.
//
// The `adminRoles` grant is deliberately NEVER named directly. The positive control grants
// `server-administrator`, whose `j:permissionNames` names `admin` and never `adminRoles`, and the caller
// is admitted because `adminRoles` is a child of the `admin` permission node and is therefore one of its
// aggregate privileges. So this spec also holds the runtime rule the whole UI is designed around: a
// granted parent permission grants its children. If Jahia ever stopped aggregating, this test would fail
// here rather than somewhere in the interface.
import { createUser, deleteUser, grantRoles } from '@jahia/cypress'
import gql from 'graphql-tag'

const ROLE_GROUPS = gql`
    query GetRoleGroups {
        admin {
            rolesAndPermissions {
                roleGroups
            }
        }
    }
`

/** What one call to the namespace came back with. */
interface Outcome {
    roleGroups?: string[]
    /** The GraphQL error path, dot-joined, or undefined when the call succeeded. */
    errorPath?: string
}

describe('Roles and permissions - the GraphQL permission gate', () => {
    const uniq = Date.now().toString(36)
    const PASSWORD = 'password'

    // Reads the namespace, is refused by its gate. `system-administrator` is granted at the repository
    // root so the caller clears the `admin` root's own `jcr:read` requirement, which is what isolates the
    // refusal to this module's gate. That role's permissions are `systemToolsAccess` and
    // `repository-permissions`, and neither is `admin` or below it.
    const outsider = 'rpOutsider' + uniq

    // Administers the server. Holds `admin`, and therefore `adminRoles` by aggregation.
    const serverAdmin = 'rpServerAdmin' + uniq

    /** Call the namespace as the given caller, and report what came back. */
    const callAs = (user: string, password: string): Cypress.Chainable<Outcome> =>
        cy
            .apolloClient({ username: user, password })
            .apollo({ query: ROLE_GROUPS, errorPolicy: 'all' })
            .then((result) => {
                // errorPolicy 'all' puts GraphQL errors in the result rather than rejecting, so both the
                // data and the refusal are readable from one shape.
                const errors = (result as { errors?: Array<{ path?: ReadonlyArray<string | number> }> }).errors
                const first = errors?.[0]
                return {
                    roleGroups: (result.data as { admin?: { rolesAndPermissions?: { roleGroups?: string[] } } })
                        ?.admin?.rolesAndPermissions?.roleGroups,
                    errorPath: first?.path?.join('.'),
                }
            })

    before(() => {
        cy.login()
        createUser(outsider, PASSWORD)
        createUser(serverAdmin, PASSWORD)
        grantRoles('/', ['system-administrator'], outsider, 'USER')
        grantRoles('/', ['server-administrator'], serverAdmin, 'USER')
    })

    after(() => {
        cy.login()
        deleteUser(outsider)
        deleteUser(serverAdmin)
    })

    it('answers a server administrator (positive control)', () => {
        callAs(serverAdmin, PASSWORD).then(({ roleGroups, errorPath }) => {
            expect(errorPath, 'a server administrator must not be refused').to.be.undefined
            // Every Jahia instance seeds these two role groups in root-roles.xml, so the assertion names
            // values rather than only a count. A count alone would pass on an unrelated list.
            expect(roleGroups, 'the seeded role groups must be listed').to.include.members([
                'edit-role',
                'server-role',
            ])
        })
    })

    it('answers root (positive control)', () => {
        callAs('root', Cypress.env('SUPER_USER_PASSWORD')).then(({ roleGroups, errorPath }) => {
            expect(errorPath, 'root must not be refused').to.be.undefined
            expect(roleGroups, 'the seeded role groups must be listed').to.include.members(['edit-role'])
        })
    })

    it('refuses a caller that clears the admin root but does not administer roles', () => {
        callAs(outsider, PASSWORD).then(({ roleGroups, errorPath }) => {
            // The path is the assertion. `admin.rolesAndPermissions` says this module's gate turned the
            // caller away; a bare `admin` would say the outer root did, and would tell us nothing here.
            expect(errorPath, "the refusal must come from this module's own gate").to.eq(
                'admin.rolesAndPermissions',
            )
            expect(roleGroups, 'no role group may be served to a caller that does not administer roles').to.be
                .undefined
        })
    })
})
