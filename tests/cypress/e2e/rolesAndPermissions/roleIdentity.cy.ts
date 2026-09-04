// The identity tab, and the one write on it that the generic JCR mutation cannot carry.
//
// `jcr:title` and `jcr:description` are i18n on `jnt:role`, so their values live on a
// `jnt:translation` child and not on the role node. The generic mutation of `graphql-dxm-provider`
// takes no language: a write through it answers success and leaves nothing a per-language read finds.
// So the title goes through a mutation that opens a session in the language, and the assertion below
// reads it back per language rather than trusting the write.
//
// The node types and the two switches are plain properties, and the generic mutation carries those.
import gql from 'graphql-tag'
import { RoleDetailPage } from '../page-object/RoleDetailPage'

const CREATE = gql`
    mutation Create($name: String!) {
        admin {
            rolesAndPermissions {
                createRole(name: $name, roleGroup: "edit-role")
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

const READ = gql`
    query Read($role: String!) {
        admin {
            rolesAndPermissions {
                role(name: $role) {
                    nodeTypes
                    isHidden
                    hasPrivilegedAccess
                    translatedLanguages
                    en: title(language: "en")
                    fr: title(language: "fr")
                }
            }
        }
    }
`

describe('Roles and permissions - the identity tab', () => {
    const uniq = Date.now().toString(36)
    const role = `rpIdentity${uniq}`

    const read = () =>
        cy
            .apolloClient()
            .apollo({ query: READ, variables: { role } })
            .then((result) => result.data.admin.rolesAndPermissions.role)

    before(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: CREATE, variables: { name: role } })
    })

    after(() => {
        cy.login()
        cy.apolloClient().apollo({ mutation: DELETE, variables: { role } })
    })

    beforeEach(() => {
        cy.login()
    })

    it('writes the title in the interface language, where a per-language read finds it', () => {
        const page = RoleDetailPage.visit(role).openIdentityTab()

        page.getTitleInput().clear()
        page.getTitleInput().type('Content reviewer')
        page.saveIdentity()

        // The read asks for the title per language. A write that landed on the role node rather than
        // on the translation child would answer null here, which is the defect this test exists for.
        read().then((saved) => {
            expect(saved.en, 'the English title must be readable').to.eq('Content reviewer')
            expect(saved.translatedLanguages, 'and the language must be listed').to.include('en')
            expect(saved.fr, 'another language keeps its own value, which is none here').to.be.null
        })
    })

    // The field was a comma-separated text box, so a typo was a node type and the administrator had to
    // know the names by heart. It is a multi-select over what the instance actually declares.
    it('writes the node types picked from the list', () => {
        const page = RoleDetailPage.visit(role).openIdentityTab()

        page.searchNodeTypes('jnt:virtualsite')
        page.toggleNodeType('jnt:virtualsite')
        page.closeNodeTypes()
        page.saveIdentity()

        read().then((saved) => {
            expect(saved.nodeTypes, 'the picked type is stored').to.deep.eq(['jnt:virtualsite'])
        })
    })

    // Core matches j:nodeTypes with isNodeType, which answers true for a mixin and for an abstract
    // supertype as well as for a primary type. A list of concrete types only would hide valid choices.
    it('offers mixins and abstract types, not primary types only', () => {
        const page = RoleDetailPage.visit(role).openIdentityTab()

        page.searchNodeTypes('jmix:editorialContent')
        cy.get('[data-testid="role-nodetype-option-jmix:editorialContent"]').should('be.visible')
    })

    it('writes the visibility, and leaves the privileged access as it found it', () => {
        const page = RoleDetailPage.visit(role).openIdentityTab()

        cy.get('[data-testid="role-hidden-switch"]').click()
        page.saveIdentity()

        read().then((saved) => {
            expect(saved.isHidden, 'the role is hidden from the access control picker').to.be.true
            // The privileged access is stated on the facts band and is not on this form. The write
            // replaces every property it names, so a save has to carry the value back unchanged.
            expect(saved.hasPrivilegedAccess, 'and the property the form no longer offers is intact').to
                .be.false
        })
    })

    // Scope, privileged access and the targets are facts of the role, not settings. Each was editable
    // here and each was a way to break a role from a form that looked like a preferences panel.
    it('offers only what a role may safely change', () => {
        RoleDetailPage.visit(role).openIdentityTab()

        cy.get('[data-testid="role-title-field"]').should('be.visible')
        cy.get('[data-testid="role-description-field"]').should('be.visible')
        cy.get('[data-testid="role-hidden-field"]').should('be.visible')

        cy.get('[data-testid="role-scope-field"]').should('not.exist')
        cy.get('[data-testid="role-privileged-field"]').should('not.exist')
        cy.get('[data-testid="role-targets-field"]').should('not.exist')
    })

    // j:nodeTypes narrows the content a role can be granted on. A server role is granted on the server
    // and never on a piece of content, so the restriction has nothing to act on.
    it('offers the node types on an edit role and not on a server role', () => {
        RoleDetailPage.visit(role).openIdentityTab()
        cy.get('[data-testid="role-nodetypes-field"]').should('be.visible')

        RoleDetailPage.visit('server-administrator').openIdentityTab()
        cy.get('[data-testid="role-nodetypes-field"]').should('not.exist')
    })

    it('goes back to the list, and the list is the one the route rendered before', () => {
        // The role's settings are a dialog over the page, so the way out of them is to close them.
        // Reaching the page's own back button through the overlay is not something a person can do
        // either, and a test that did it would be testing a path the interface does not offer.
        const page = RoleDetailPage.visit(role).openIdentityTab()
        page.closeEdit()

        page.back()
        cy.get(`[data-testid="role-name-${role}"]`).should('be.visible')
    })
})
