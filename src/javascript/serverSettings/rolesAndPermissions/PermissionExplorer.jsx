import React, {useMemo, useState} from 'react';
import {useQuery} from 'react-apollo';
import {useTranslation} from 'react-i18next';
import {Banner, EmptyData, Header, LayoutContent, Loader, Paper, Typography} from '@jahia/moonstone';
import {GET_PERMISSION_CATALOG} from './RolesAndPermissions.gql-queries';
import {applyFilters, emptyFilters, modulesOf} from './permissionFilters';
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
    const modules = useMemo(() => modulesOf(entries), [entries]);
    const matches = useMemo(() => applyFilters(entries, filters), [entries, filters]);

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

                            {matches.map(entry => (
                                <button
                                    key={entry.logicalPath}
                                    type="button"
                                    className={
                                        entry.name === selected ?
                                            `${classes.permissionRow} ${classes.permissionRowSelected}` :
                                            classes.permissionRow
                                    }
                                    style={{paddingLeft: `${8 + ((entry.depth - 1) * 16)}px`}}
                                    data-testid={`permission-row-${entry.name}`}
                                    onClick={() => setSelected(entry.name)}
                                >
                                    <span className={classes.permissionRowLabel}>
                                        <Typography variant="body">{entry.label}</Typography>
                                        <Typography variant="caption" className={classes.permissionRowName}>
                                            {entry.name}
                                        </Typography>
                                    </span>
                                    {entry.workspace === 'NONE' ?
                                        null :
                                        <span
                                            className={classes.workspaceTag}
                                            data-testid={`permission-workspace-${entry.name}`}
                                        >
                                            {t(`rolesAndPermissions.workspace.${entry.workspace}`)}
                                        </span>}
                                </button>
                            ))}
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
