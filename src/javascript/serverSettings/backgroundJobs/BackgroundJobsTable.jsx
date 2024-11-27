import React from 'react';
import {useTable, useSortBy} from 'react-table';
import {
    Loader,
    Table,
    TableBody,
    TableBodyCell,
    TableHead,
    TableHeadCell,
    TablePagination,
    TableRow, Typography
} from '@jahia/moonstone';
import {renderSortIndicator} from './utils';
import PropTypes from 'prop-types';
import {useTranslation} from 'react-i18next';

const NothingToDisplay = () => {
    const {t} = useTranslation('serverSettings');
    return (
        <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            height: 100
        }}
        >
            <Typography>{t('backgroundJobs.nothingToDisplay')}</Typography>
        </div>
    );
};

const BackgroundJobsTable = ({tableProps, paginationProps, loading, ...props}) => {
    const {
        limit,
        setLimit,
        totalCount,
        currentPage,
        setPage
    } = paginationProps;

    const {
        getTableProps,
        getTableBodyProps,
        headerGroups,
        rows,
        prepareRow
    } = useTable(tableProps, useSortBy);

    if (loading) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: 300
            }}
            >
                <Loader size="big"/>
            </div>
        );
    }

    const testId = props['data-testid'] ?? 'background-jobs-table';

    return (
        <>
            <Table {...getTableProps()} style={{marginTop: 32}} data-testid={testId}>
                <TableHead isSticky>
                    {headerGroups.map(headerGroup => (
                        /* eslint-disable-next-line react/jsx-key */
                        <TableRow {...headerGroup.getHeaderGroupProps()}>
                            {headerGroup.headers.map(column => (
                                /* eslint-disable-next-line react/jsx-key */
                                <TableHeadCell {...column.getHeaderProps(column.getSortByToggleProps())} iconEnd={column.canSort && renderSortIndicator(column.isSorted, column.isSortedDesc)} width={column.customWidth}>
                                    {column.render('Header')}
                                </TableHeadCell>
                            ))}
                        </TableRow>
                    ))}
                </TableHead>
                <TableBody {...getTableBodyProps()}>
                    {rows.length === 0 && (<NothingToDisplay/>)}
                    {rows.map(row => {
                        prepareRow(row);
                        return (
                            /* eslint-disable-next-line react/jsx-key */
                            <TableRow {...row.getRowProps()}>
                                {row.cells.map(cell => (
                                    /* eslint-disable-next-line react/jsx-key */
                                    <TableBodyCell {...cell.getCellProps()} iconStart={row.original[cell.column.id]?.icon} width={cell.column.customWidth}>
                                        {cell.render('Cell')}
                                    </TableBodyCell>
                                ))}
                            </TableRow>
                        );
                    })}
                </TableBody>
            </Table>
            <TablePagination rowsPerPageOptions={[5, 10, 20]} currentPage={currentPage} totalNumberOfRows={totalCount} rowsPerPage={limit} onRowsPerPageChange={setLimit} onPageChange={setPage}/>
        </>
    );
};

BackgroundJobsTable.propTypes = {
    tableProps: PropTypes.object.isRequired,
    paginationProps: PropTypes.object.isRequired,
    // eslint-disable-next-line react/boolean-prop-naming
    loading: PropTypes.bool,
    'data-testid': PropTypes.string
};

export default BackgroundJobsTable;
