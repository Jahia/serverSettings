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

    it('writes the node types the role can be granted on', () => {
        const page = RoleDetailPage.visit(role).openIdentityTab()

        page.getNodeTypesInput().clear()
        page.getNodeTypesInput().type('rep:root, jnt:virtualsite')
        page.saveIdentity()

        read().then((saved) => {
            expect(saved.nodeTypes, 'both node types are stored, and the spaces are trimmed').to.deep.eq([
                'rep:root',
                'jnt:virtualsite',
            ])
        })
    })

    it('writes the visibility and the privileged access', () => {
        const page = RoleDetailPage.visit(role).openIdentityTab()

        cy.get('[data-testid="role-hidden-switch"]').click()
        cy.get('[data-testid="role-privileged-switch"]').click()
        page.saveIdentity()

        read().then((saved) => {
            expect(saved.isHidden, 'the role is hidden from the access control picker').to.be.true
            expect(saved.hasPrivilegedAccess, 'and granting it makes the principal privileged').to.be.true
        })
    })

    it('states that a role is privileged through its parent, whatever its own switch says', () => {
        const child = `rpIdentityChild${uniq}`
        cy.apolloClient().apollo({
            mutation: gql`
                mutation CreateChild($name: String!) {
                    admin {
                        rolesAndPermissions {
                            createRole(name: $name, parentRole: "editor", roleGroup: "edit-role")
                        }
                    }
                }
            `,
            variables: { name: child },
        })

        RoleDetailPage.visit(child).openIdentityTab()

        // editor sets j:privilegedAccess and this role does not. AclListener reads the whole chain, so
        // the switch being off would mislead an administrator on its own.
        cy.get('[data-testid="role-privileged-switch"]').should('not.be.checked')
        cy.get('[data-testid="role-privileged-field"]').should('contain', 'privileged through editor')

        cy.apolloClient().apollo({ mutation: DELETE, variables: { role: child } })
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
