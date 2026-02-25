import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  Row,
  ExpandedState,
  getExpandedRowModel,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import numeral from 'numeral';
import React, { useState } from 'react';

interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  countLabel?: number;
  loading?: boolean;
  pagination?: {
    total: number;
    page: number;
    pageSize?: number;
    onChange: (page: number, pageSize: number) => void;
  };
  rowKey?: string | ((record: TData) => string);
  expandable?: {
    expandedRowRender: (record: TData) => React.ReactNode;
  };
  onRow?: (record: TData) => {
    onClick?: () => void;
    className?: string;
  };
}

function DataTable<TData, TValue>({
  columns,
  data,
  countLabel,
  loading,
  pagination,
  rowKey = 'id',
  expandable,
  onRow,
}: DataTableProps<TData, TValue>) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const pageSize = pagination?.pageSize ?? 20;
  const pageCount = pagination ? Math.ceil(pagination.total / pageSize) : 1;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(expandable && {
      getExpandedRowModel: getExpandedRowModel(),
      onExpandedChange: setExpanded,
      state: { expanded },
    }),
    manualPagination: true,
    pageCount,
    getRowId: (row, index) => {
      if (typeof rowKey === 'function') return rowKey(row);
      return (row as Record<string, unknown>)[rowKey]?.toString() ?? index.toString();
    },
  });

  const currentPage = pagination?.page ?? 1;

  return (
    <div className='space-y-4'>
      {countLabel !== undefined && (
        <div className='text-sm text-muted-foreground'>{numeral(countLabel).format('0,0')}건</div>
      )}
      <div className='rounded-md border'>
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <TableHead key={header.id} style={{ width: header.getSize() !== 150 ? header.getSize() : undefined }}>
                    {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center'>
                  <Loader2 className='mx-auto h-6 w-6 animate-spin text-muted-foreground' />
                </TableCell>
              </TableRow>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const rowProps = onRow ? onRow(row.original) : undefined;
                return (
                  <React.Fragment key={row.id}>
                    <TableRow
                      data-state={row.getIsSelected() && 'selected'}
                      onClick={rowProps?.onClick}
                      className={rowProps?.className || (rowProps?.onClick ? 'cursor-pointer' : '')}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
                      ))}
                    </TableRow>
                    {expandable && row.getIsExpanded() && (
                      <TableRow>
                        <TableCell colSpan={columns.length} className='bg-muted/30 p-4'>
                          {expandable.expandedRowRender(row.original)}
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={columns.length} className='h-24 text-center text-muted-foreground'>
                  데이터가 없습니다
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && pagination.total > 0 && (
        <div className='flex items-center justify-between px-2'>
          <div className='text-sm text-muted-foreground'>
            총 {numeral(pagination.total).format('0,0')}건 중 {(currentPage - 1) * pageSize + 1}-
            {Math.min(currentPage * pageSize, pagination.total)}
          </div>
          <div className='flex items-center gap-1'>
            <Button
              variant='outline'
              size='sm'
              onClick={() => pagination.onChange(1, pageSize)}
              disabled={currentPage <= 1}
            >
              <ChevronsLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => pagination.onChange(currentPage - 1, pageSize)}
              disabled={currentPage <= 1}
            >
              <ChevronLeft className='h-4 w-4' />
            </Button>
            <span className='px-3 text-sm'>
              {currentPage} / {pageCount}
            </span>
            <Button
              variant='outline'
              size='sm'
              onClick={() => pagination.onChange(currentPage + 1, pageSize)}
              disabled={currentPage >= pageCount}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              onClick={() => pagination.onChange(pageCount, pageSize)}
              disabled={currentPage >= pageCount}
            >
              <ChevronsRight className='h-4 w-4' />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;
export type { DataTableProps };
