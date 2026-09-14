// Everything the role IS, on the page that is about it.
//
// These facts were readable only by opening the dialog that edits them, so reading what a role
// applies on meant entering an editing form and leaving it again. The list carried some of them as
// chips, which cost a column on every row for a value that is the same on most of them.
//
// The band states them read-only instead. Each test below reads a fact whose value is NOT the common
// one, because a band that renders the majority case correctly and the exception wrongly would look
// right on a screenshot of a stock instance.
import gql from 'graphql-tag'
import { RoleDetailPage } from '../page-object/RoleDetailPage'

const ADD_ROLE = gql`
    mutation AddRole($parentPath: String!, $name: String!) {
        jcr(workspace: EDIT) {
            addNode(parentPathOrId: $parentPath, name: $name, primaryNodeType: "jnt:role") {
                uuid
            }
        }
    }
`

// A role's scope is its own j:roleGroup and is not inherited from the role it sits inside, so a
// fixture added straight to the JCR has to declare one.
const SET_SCOPE_AND_NODE_TYPES = gql`
    mutation SetScopeAndNodeTypes($path: String!, $scope: String!, $values: [String!]!) {
        jcr(workspace: EDIT) {
            mutateNode(pathOrId: $path) {
                scope: mutateProperty(name: "j:roleGroup") {
                    setValue(value: $scope, type: STRING)
                }
                nodeTypes: mutateProperty(name: "j:nodeTypes") {
                    setValues(values: $values, type: STRING)
                }
            }
        }
    }
`

const DELETE_NODE = gql`
    mutation DeleteNode($path: String!) {
        jcr(workspace: EDIT) {
            deleteNode(pathOrId: $path)
        }
    }
`

const fact = (name: string) => cy.get(`[data-testid="role-facts-${name}"]`)

describe('Roles and permissions - the facts of a role, on its own page', () => {
    const uniq = Date.now().toString(36)
    const nested = `rpFacts${uniq}`
    const nestedPath = `/roles/editor/${nested}`

    before(() => {
        cy.login()
        // Nested inside editor and setting no j:privilegedAccess of its own, which is the case the
        // list used to state with a chip.
        cy.apolloClient().apollo({ mutation: ADD_ROLE, variables: { parentPath: '/roles/editor', name: nested } })
        // edit-role is where a node type restriction applies, and the stock instance carries the
        // restriction only on server roles, so the non-empty case needs a fixture of its own.
        cy.apolloClient().apollo({
            mutation: SET_SCOPE_AND_NODE_TYPES,
            variables: { path: nestedPath, scope: 'edit-role', values: ['jnt:page', 'jnt:virtualsite'] },
        })
    })

    after(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: DELETE_NODE, variables: { path: nestedPath } })
    })

    beforeEach(() => {
        cy.login()
    })

    it('states the facts above the permissions, without opening the edit form', () => {
        RoleDetailPage.visit('editor')

        cy.get('[data-testid="role-facts"]').should('be.visible')
        // The edit dialog must not be open. The whole point is reading these without entering a form.
        cy.get('[data-testid="role-edit-dialog"]').should('not.exist')

        fact('description').should('contain', 'Can edit content using jContent')
        fact('scope').should('contain', 'edit-role')
        fact('subroles').should('contain', 'editor-in-chief')
    })

    it('states that no node type means any node type', () => {
        RoleDetailPage.visit('editor')

        // An empty j:nodeTypes means the role can be granted on anything, so the empty case is a
        // fact and not a blank. This was readable only from the edit form.
        fact('nodetypes').should('contain', 'Any node type')
    })

    it('names the node types a role is restricted to', () => {
        RoleDetailPage.visit(nested)

        fact('nodetypes').should('contain', 'jnt:page')
        fact('nodetypes').should('contain', 'jnt:virtualsite')
        fact('nodetypes').should('not.contain', 'Any node type')
    })

    // A server role is granted on the server, never on a piece of content, so a node type restriction
    // has nothing to act on. Stating "Any node type" there would name a freedom the role never had.
    it('states no node type fact on a scope the restriction cannot act on', () => {
        RoleDetailPage.visit('server-administrator')

        cy.get('[data-testid="role-facts"]').should('be.visible')
        cy.get('[data-testid="role-facts-nodetypes"]').should('not.exist')
    })

    it('names the parent when a role is privileged only through it', () => {
        RoleDetailPage.visit(nested)

        // AclListener reads j:privilegedAccess on the whole chain, so granting this role makes the
        // principal privileged although the role sets nothing. Stating "Yes" alone would hide that
        // nothing on this role can change the answer.
        fact('privileged').should('contain', 'editor')
        fact('privileged').should('contain', 'Yes')
    })

    it('states that a role is not privileged when nothing in its chain sets it', () => {
        RoleDetailPage.visit('reader')

        fact('privileged').should('have.text', 'Privileged accessNo')
    })

    it('states that a role is hidden from the picker', () => {
        RoleDetailPage.visit('translator')

        // j:hidden keeps the role out of the access control picker. The list used to carry a chip
        // for it, and the fact belongs with the rest of what the role is.
        fact('visibility').should('contain', 'Hidden from the picker')
    })

    it('shows no description row when the role carries none in the interface language', () => {
        RoleDetailPage.visit('reader')

        // The text is declared per language and the core seed declares English only, so the row is
        // absent rather than empty or filled with another language.
        cy.get('[data-testid="role-facts"]').should('be.visible')
        cy.get('[data-testid="role-facts-description"]').should('not.exist')
    })
})
