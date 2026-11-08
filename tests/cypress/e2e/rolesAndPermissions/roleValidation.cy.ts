// What the server refuses when a role is created.
//
// The check cannot live in the browser alone. Two administrators can pick one name at the same time,
// and the mutation is a public API that any client can call, so a value the browser would never send
// still has to be refused. Each case here goes through the API for that reason, and the last one goes
// through the screen to prove the refusal is shown rather than swallowed.
import gql from 'graphql-tag'
import { RoleListPage } from '../page-object/RoleListPage'

const CREATE = gql`
    mutation Create($name: String!, $roleGroup: String) {
        admin {
            rolesAndPermissions {
                createRole(name: $name, roleGroup: $roleGroup)
            }
        }
    }
`

const DELETE = gql`
    mutation Delete($role: String!) {
        admin {
            rolesAndPermissions {
                deleteRole(role: $role)
            }
        }
    }
`

// errorPolicy 'all' keeps the refusal instead of failing the command, which is what is under test.
const create = (name: string, roleGroup: string | null = 'edit-role') =>
    cy.apolloClient().apollo({
        mutation: CREATE,
        variables: { name, roleGroup },
        errorPolicy: 'all',
    })

describe('Roles and permissions - what the server refuses', () => {
    const uniq = Date.now().toString(36)
    const valid = `rpValid${uniq}`

    after(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: DELETE, variables: { role: valid } })
    })

    beforeEach(() => {
        cy.login()
    })

    it('refuses a name the repository could not carry as a node name', () => {
        // A role name reaches the repository as a node name. A colon opens a namespace prefix, a
        // slash separates path segments, and a star is query syntax, so none of them can become the
        // role the caller asked for.
        //
        // The comma is refused for a different reason, and it was refused by the message only: every
        // screen that lists role names joins them with a comma, so a name carrying one cannot be told
        // from two names. The repository accepted it and the role was created.
        const refused = ['a/b', 'foo:bar', 'has*star', 'index[1]', 'a|b', 'one,two']

        refused.forEach((name) => {
            create(name).then((result) => {
                expect(result.errors, `${name} is refused`).to.not.be.undefined
                expect(result.errors[0].message, `${name} is named in the refusal`).to.contain(name)
            })
        })
    })

    it('refuses a name that is only spaces, and one that opens or closes with a space', () => {
        create('   ').then((result) => {
            expect(result.errors[0].message).to.contain('required')
        })

        create(' spaced').then((result) => {
            expect(result.errors[0].message).to.contain('space')
        })
    })

    it('refuses a name the repository reserves', () => {
        ;['.', '..'].forEach((name) => {
            create(name).then((result) => {
                expect(result.errors, `${name} is refused`).to.not.be.undefined
            })
        })
    })

    it('refuses a scope no role carries, and says which scopes exist', () => {
        create(`rpScope${uniq}`, 'not-a-scope').then((result) => {
            const message = result.errors[0].message
            // A typo in a scope produces a scope that exists on one role and that no screen or seed
            // knows about, so the refusal names what this instance actually uses.
            expect(message).to.contain('not-a-scope')
            expect(message, 'the refusal lists the scopes that exist').to.contain('edit-role')
        })
    })

    it('accepts a name and a scope that are both usable', () => {
        create(valid).then((result) => {
            expect(result.errors, 'nothing is refused').to.be.undefined
            expect(result.data.admin.rolesAndPermissions.createRole).to.contain(valid)
        })
    })

    it('shows the refusal in the create dialog rather than swallowing it', () => {
        RoleListPage.visit()

        cy.get('[data-testid="role-create"]').click()
        cy.get('[data-testid="role-name-input"]').clear()
        cy.get('[data-testid="role-name-input"]').type('bad/name')
        cy.get('[data-testid="role-name-confirm"]').click()

        // A silent failure, or a generic internal error, would leave an administrator with no idea
        // what to change.
        cy.get('[data-testid="role-name-error"]').should('contain', 'bad/name')
        cy.get('[data-testid="role-name-cancel"]').click()
    })
})
