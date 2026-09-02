// The permission catalog, and the one invariant the whole interface rests on.
//
// Jahia registers a Jackrabbit privilege PER NAME, so a permission declared by core under /permissions and
// declared again by a module under /modules/<module>/<version>/permissions is ONE privilege at runtime. The
// catalog therefore merges those declarations into one entry per logical path. That merge is only sound
// while every name resolves to exactly one logical path, and `ambiguousNames` is the catalog's own report
// of where it does not.
//
// So the assertion on `ambiguousNames` being empty is not a tidiness check. It is the licence for the
// merge, and for the whole "one row per permission" design. If a module ever declares a name at a second
// logical path, this test fails here and names it, instead of the interface silently showing one of the
// two parents and hiding the other. That is the failure the current `rolesmanager` mapping layer hides.
//
// The other assertions hold the facets the interface filters on. Each one names a permission core seeds in
// war/src/main/webapp/WEB-INF/etc/repository/root-permissions.xml, so it is present on every instance and
// the expected value is readable from that file rather than guessed from this one.
import gql from 'graphql-tag'

const CATALOG = gql`
    query GetPermissionCatalog($language: String!) {
        admin {
            rolesAndPermissions {
                permissionCatalog {
                    totalCount
                    areas
                    ambiguousNames
                    entries {
                        name
                        logicalPath
                        parentName
                        childNames
                        area
                        depth
                        workspace
                        providedByModules
                        isAbstract
                        label(language: $language)
                    }
                }
            }
        }
    }
`

interface Entry {
    name: string
    logicalPath: string
    parentName: string | null
    childNames: string[]
    area: string
    depth: number
    workspace: 'EDIT' | 'LIVE' | 'NONE'
    providedByModules: string[]
    isAbstract: boolean
    label: string
}

interface Catalog {
    totalCount: number
    areas: string[]
    ambiguousNames: string[]
    entries: Entry[]
}

describe('Roles and permissions - the permission catalog', () => {
    let catalog: Catalog
    let byName: Map<string, Entry>

    before(() => {
        cy.apolloClient()
            .apollo({ query: CATALOG, variables: { language: 'en' } })
            .then((result) => {
                catalog = result.data.admin.rolesAndPermissions.permissionCatalog
                byName = new Map(catalog.entries.map((entry) => [entry.name, entry]))
            })
    })

    it('reports no ambiguous name, which is what licenses the merge by logical path', () => {
        // The message names the offenders, so a failure here is actionable without re-running the query.
        expect(
            catalog.ambiguousNames,
            `these permission names resolve to more than one logical path: ${catalog.ambiguousNames.join(', ')}`,
        ).to.deep.eq([])
    })

    it('holds every permission of the instance', () => {
        // A full instance seeds 144 permissions in core alone, so a catalog under that is a truncated read
        // rather than a small instance. The bound is deliberately loose: the point is that the query has no
        // page limit, not that the number is exact.
        expect(catalog.totalCount, 'the catalog must not be truncated').to.be.greaterThan(140)
        expect(catalog.entries.length, 'totalCount must count the entries it returns').to.eq(catalog.totalCount)
    })

    it('lists the areas core seeds, in the order core declares them', () => {
        // root-permissions.xml declares repository-permissions first, then admin and site-admin.
        expect(catalog.areas).to.include.members(['repository-permissions', 'admin', 'jContent', 'managers'])
        expect(
            catalog.areas.indexOf('repository-permissions'),
            'repository-permissions is the first child of /permissions',
        ).to.eq(0)
    })

    it('keeps the logical parent of a permission, and never re-parents one', () => {
        // jContent aggregates jContentActions, which aggregates editAction. Core declares the first two and
        // the jcontent module declares editAction under the same logical path.
        const jContent = byName.get('jContent')
        expect(jContent, 'jContent must be in the catalog').to.not.be.undefined
        expect(jContent.parentName, 'jContent is an area root').to.be.null
        expect(jContent.area).to.eq('jContent')
        expect(jContent.depth).to.eq(1)
        expect(jContent.childNames).to.include('jContentActions')

        const actions = byName.get('jContentActions')
        expect(actions.parentName).to.eq('jContent')
        expect(actions.logicalPath).to.eq('/permissions/jContent/jContentActions')
        expect(actions.childNames, 'the actions of jContent aggregate under it').to.include('editAction')

        const editAction = byName.get('editAction')
        expect(editAction.parentName).to.eq('jContentActions')
        expect(editAction.logicalPath).to.eq('/permissions/jContent/jContentActions/editAction')
    })

    it('reads the workspace facet from the name suffix', () => {
        expect(byName.get('jcr:read_live').workspace).to.eq('LIVE')
        expect(byName.get('jcr:read_default').workspace).to.eq('EDIT')
        // `admin` carries no suffix, so it belongs to neither workspace.
        expect(byName.get('admin').workspace).to.eq('NONE')
    })

    it('records the module that declares a permission, and records none for a core-only one', () => {
        // adminRoles is declared by the rolesmanager module and by nothing in core.
        expect(byName.get('adminRoles').providedByModules).to.include('rolesmanager')
        // jcr:read_default is seeded by core, so no module declares it.
        expect(byName.get('jcr:read_default').providedByModules).to.deep.eq([])
    })

    it('gives every permission a readable label', () => {
        const unlabelled = catalog.entries.filter((entry) => !entry.label || entry.label.trim() === '')
        expect(unlabelled.map((entry) => entry.name), 'no permission may be shown without a label').to.deep.eq([])

        // The fallback humanises the name rather than showing the bundle key, so a permission with no bundle
        // entry still reads as words. Whichever path answered, the label must not be the key itself.
        catalog.entries.forEach((entry) => {
            expect(entry.label, `${entry.name} must not be labelled with its bundle key`).to.not.contain(
                'label.permission.',
            )
        })
    })
})
