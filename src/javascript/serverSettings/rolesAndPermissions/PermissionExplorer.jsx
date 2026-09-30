import React, {useEffect, useMemo, useState} from 'react';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Banner, EmptyData, Header, LayoutContent, Loader, Paper, TreeView} from '@jahia/moonstone';
import {GET_PERMISSION_CATALOG} from './RolesAndPermissions.gql-queries';
import {areaLabels} from './permissionAreas';
import {applyFilters, asTreeData, emptyFilters, isUnfiltered, modulesOf} from './permissionFilters';
import PermissionFilterBar from './PermissionFilterBar';
import PermissionDetail from './PermissionDetail';
import classes from './styles.css';

// The screen reads the whole catalog once. The list is the repository tree, and the indentation is
// the permission depth, so the rows carry the parent relation that decides what a grant reaches.
export const PermissionExplorer = () => {
    const {t, i18n} = useTranslation('serverSettings');
    const language = i18n.language || 'en';

    const [filters, setFilters] = useState(emptyFilters);
    const [selected, setSelected] = useState(null);

    const {data, loading, error} = useQuery(GET_PERMISSION_CATALOG, {
        variables: {language},
        fetchPolicy: 'network-only'
    });

    const catalog = data?.admin?.rolesAndPermissions?.permissionCatalog;
    // A fresh empty array on every render would re-run both memos, so the fallback is memoised too.
    const entries = useMemo(() => catalog?.entries || [], [catalog]);
    const areaNames = useMemo(() => areaLabels(catalog), [catalog]);
    const modules = useMemo(() => modulesOf(entries), [entries]);
    const matches = useMemo(() => applyFilters(entries, filters), [entries, filters]);

    const treeData = useMemo(
        () => asTreeData(matches, !isUnfiltered(filters), entry => ({
            id: entry.name,
            label: entry.label || entry.name,
            treeItemProps: {'data-testid': `permission-row-${entry.name}`}
        })),
        [matches, filters]
    );

    const parentIds = useMemo(() => {
        const ids = new Set();
        const walk = nodes => nodes.forEach(node => {
            if (node.children) {
                ids.add(node.id);
                walk(node.children);
            }
        });
        walk(treeData);
        return ids;
    }, [treeData]);

    const [openedItems, setOpenedItems] = useState(parentIds);

    // Whatever the filters now keep is shown in full, and a node the reader closed by hand stays
    // closed only while the data behind it is the same data.
    useEffect(() => setOpenedItems(parentIds), [parentIds]);

    if (error) {
        return (
            <LayoutContent
                header={<Header title={t('rolesAndPermissions.explorer.title')}/>}
                content={
                    <Paper>
                        <div className={classes.detailEmpty} data-testid="permission-explorer-error">
                            <EmptyData message={t('rolesAndPermissions.loadError')}/>
                        </div>
                    </Paper>
                }/>
        );
    }

    return (
        <LayoutContent
            isLoading={loading}
            header={<Header title={t('rolesAndPermissions.explorer.title')} data-testid="permission-explorer-header"/>}
            content={
                <Paper className={classes.explorerPaper}>
                    {catalog?.ambiguousNames?.length > 0 ?
                        <Banner
                            variant="warning"
                            title={t('rolesAndPermissions.explorer.ambiguousTitle')}
                            data-testid="permission-ambiguous-banner"
                        >
                            {t('rolesAndPermissions.explorer.ambiguousNames', {
                                names: catalog.ambiguousNames.join(', ')
                            })}
                        </Banner> :
                        null}

                    <PermissionFilterBar
                        filters={filters}
                        setFilters={setFilters}
                        areas={catalog?.areas || []}
                        areaNames={areaNames}
                        modules={modules}
                        matchCount={matches.length}
                        totalCount={catalog?.totalCount || 0}/>

                    <div className={classes.explorerBody}>
                        <div className={classes.permissionList} data-testid="permission-list">
                            {loading ?
                                <div className={classes.detailEmpty}><Loader size="big"/></div> :
                                null}

                            {!loading && matches.length === 0 ?
                                <div className={classes.detailEmpty} data-testid="permission-list-empty">
                                    <EmptyData message={t('rolesAndPermissions.explorer.noMatch')}/>
                                </div> :
                                null}

                            {/*
                              * The catalog's own hierarchy, drawn by TreeView. It carries the depth,
                              * the expanding, the selected state and the keyboard navigation, all of
                              * which this screen used to draw with an inline padding and two classes.
                              *
                              * The technical name and the workspace are not on the row: TreeView takes
                              * a string label and an icon beside it, and neither is an icon. Both are
                              * in the detail pane, which is where a reader looks once a row is picked.
                              */}
                            <TreeView
                                size="small"
                                data={treeData}
                                openedItems={[...openedItems]}
                                selectedItems={[selected]}
                                onOpenItem={node => setOpenedItems(open => new Set(open).add(node.id))}
                                onCloseItem={node => setOpenedItems(open => {
                                    const next = new Set(open);
                                    next.delete(node.id);
                                    return next;
                                })}
                                onClickItem={node => setSelected(node.id)}/>
                        </div>

                        <div className={classes.permissionDetailPane}>
                            <PermissionDetail permissionName={selected} language={language}/>
                        </div>
                    </div>
                </Paper>
            }/>
    );
};

export default PermissionExplorer;
