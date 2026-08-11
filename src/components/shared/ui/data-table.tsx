import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  ColumnDef,
  Cell,
  flexRender,
  getCoreRowModel,
  useReactTable,
  ExpandedState,
  getExpandedRowModel,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, Loader2 } from 'lucide-react';
import numeral from 'numeral';
import React, { useState } from 'react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
    /** Let the whole row toggle the panel, not just the 32px chevron. */
    expandOnRowClick?: boolean;
  };
  onRow?: (record: TData) => {
    onClick?: () => void;
    className?: string;
  };
  /**
   * Shown instead of the default text when there are no rows. "데이터가 없습니다" reads the
   * same whether a filter excluded everything or nothing was ever created, and those two
   * situations call for opposite next actions.
   */
  emptyState?: React.ReactNode;
}

type DataTableColumnMeta = {
  useTruncateTooltip?: boolean;
  truncateMaxWidth?: number | string;
  sticky?: 'left' | 'right';
};

const getColumnId = <TData, TValue>(column: ColumnDef<TData, TValue>) => {
  if (column.id) {
    return column.id;
  }

  const accessorKey = (column as { accessorKey?: unknown }).accessorKey;
  return typeof accessorKey === 'string' ? accessorKey : undefined;
};

function DataTable<TData, TValue>({
  columns,
  data,
  countLabel,
  loading,
  pagination,
  rowKey = 'id',
  expandable,
  onRow,
  emptyState,
}: DataTableProps<TData, TValue>) {
  const [expanded, setExpanded] = useState<ExpandedState>({});
  const hasSizedColumn = columns.some((column) => typeof column.size === 'number');
  const customCellColumnIds = React.useMemo(() => {
    const ids = new Set<string>();
    columns.forEach((column) => {
      const columnId = getColumnId(column);
      if (!columnId) return;
      if (typeof column.cell === 'function') {
        ids.add(columnId);
      }
    });
    return ids;
  }, [columns]);
  const pageSize = pagination?.pageSize ?? 20;
  const pageCount = pagination ? Math.ceil(pagination.total / pageSize) : 1;

  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    ...(expandable && {
      getRowCanExpand: () => true,
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
  const getStickyColumnPosition = (columnDef: ColumnDef<TData, TValue>) => {
    const meta = columnDef.meta as DataTableColumnMeta | undefined;
    const columnId = getColumnId(columnDef);

    if (meta?.sticky) {
      return meta.sticky;
    }

    if (columnId === 'actions') {
      return 'right';
    }

    return undefined;
  };

  const getStickyColumnClassName = (columnDef: ColumnDef<TData, TValue>, variant: 'head' | 'cell') => {
    const stickyPosition = getStickyColumnPosition(columnDef);

    // 스크롤 오버플로를 알리는 엣지 그림자는 §4.3의 깊이 규칙과 별개인 기능적 어포던스입니다.
    // 색은 중립(rgba(0,0,0,...))으로 유지합니다.
    if (stickyPosition === 'right') {
      return cn(
        'sticky right-0 border-l border-border bg-card',
        variant === 'head'
          ? 'z-30 shadow-[-10px_0_18px_-18px_rgba(0,0,0,0.35)]'
          : 'z-20 group-hover:bg-slate-50 group-data-[state=selected]:bg-muted shadow-[-10px_0_18px_-18px_rgba(0,0,0,0.18)]',
      );
    }

    if (stickyPosition === 'left') {
      return cn(
        'sticky left-0 border-r border-border bg-card',
        variant === 'head'
          ? 'z-30 shadow-[10px_0_18px_-18px_rgba(0,0,0,0.35)]'
          : 'z-20 group-hover:bg-slate-50 group-data-[state=selected]:bg-muted shadow-[10px_0_18px_-18px_rgba(0,0,0,0.18)]',
      );
    }

    return undefined;
  };

  const getColumnStyle = (size: unknown): React.CSSProperties | undefined => {
    if (typeof size !== 'number') {
      return undefined;
    }

    return {
      width: `${size}px`,
      minWidth: `${size}px`,
      maxWidth: `${size}px`,
    };
  };

  const renderCellContent = (cell: Cell<TData, TValue>) => {
    const rendered = flexRender(cell.column.columnDef.cell, cell.getContext());
    const meta = cell.column.columnDef.meta as DataTableColumnMeta | undefined;
    const useTruncateTooltip = meta?.useTruncateTooltip ?? true;
    const hasCustomCell = customCellColumnIds.has(cell.column.id);

    if (!useTruncateTooltip) {
      return rendered;
    }

    const getTextStyle = () => {
      const style: React.CSSProperties = { minWidth: 0 };
      if (typeof meta?.truncateMaxWidth === 'number') {
        style.maxWidth = `${meta.truncateMaxWidth}px`;
      } else if (typeof meta?.truncateMaxWidth === 'string') {
        style.maxWidth = meta.truncateMaxWidth;
      } else {
        style.maxWidth = '100%';
      }
      return style;
    };

    const renderTruncatedText = (text: string) => (
      <Tooltip>
        <TooltipTrigger asChild>
          <span className='block w-full truncate' style={getTextStyle()}>
            {text}
          </span>
        </TooltipTrigger>
        <TooltipContent side='top'>{text}</TooltipContent>
      </Tooltip>
    );

    if (typeof rendered === 'string' || typeof rendered === 'number') {
      return renderTruncatedText(String(rendered));
    }

    if (!hasCustomCell) {
      const rawValue = cell.getValue();
      if (typeof rawValue === 'string' || typeof rawValue === 'number') {
        return renderTruncatedText(String(rawValue));
      }
    }

    return rendered;
  };

  return (
    <div className='space-y-4'>
      {countLabel !== undefined && (
        <div className='text-sm font-medium text-slate-600'>{numeral(countLabel).format('0,0')}건</div>
      )}
      <TooltipProvider delayDuration={150}>
        {/* Geist: 흰 카드 + 헤어라인. 캔버스(#fafafa)와의 명도 차가 분리를 만들므로 그림자 없음 */}
        <div className='overflow-hidden rounded-lg border border-border bg-card'>
          <Table className={hasSizedColumn ? 'table-fixed' : undefined}>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      className={cn(
                        'h-9 overflow-hidden whitespace-nowrap text-ellipsis text-xs font-medium text-slate-600',
                        getStickyColumnClassName(header.column.columnDef, 'head'),
                      )}
                      style={getColumnStyle(header.column.columnDef.size)}
                    >
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
                  // An explicit onRow handler wins; expandOnRowClick only fills the gap
                  // for tables whose row has no other purpose than opening its panel.
                  const toggleExpanded =
                    expandable?.expandOnRowClick && !rowProps?.onClick ? () => row.toggleExpanded() : undefined;
                  const handleRowClick = rowProps?.onClick ?? toggleExpanded;
                  return (
                    <React.Fragment key={row.id}>
                      <TableRow
                        data-state={row.getIsSelected() && 'selected'}
                        aria-expanded={toggleExpanded ? row.getIsExpanded() : undefined}
                        onClick={
                          handleRowClick
                            ? (event) => {
                                // Buttons, links and menu items inside the row own their
                                // click — the chevron, the row-action menu, anything a cell
                                // renders. Dragging out a selection is not a click either.
                                if ((event.target as HTMLElement).closest('button, a, [role="menuitem"]')) return;
                                if (window.getSelection()?.toString()) return;
                                handleRowClick();
                              }
                            : undefined
                        }
                        tabIndex={handleRowClick ? 0 : undefined}
                        onKeyDown={
                          handleRowClick
                            ? (event) => {
                                if (event.target !== event.currentTarget) return;
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  handleRowClick();
                                }
                              }
                            : undefined
                        }
                        className={cn(
                          'group transition-colors duration-fast',
                          handleRowClick &&
                            'cursor-pointer hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
                          row.getIsExpanded() && 'bg-slate-50',
                          rowProps?.className,
                        )}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <TableCell
                            key={cell.id}
                            className={cn(
                              'max-w-0 overflow-hidden py-2 text-sm tabular-nums text-slate-700',
                              getStickyColumnClassName(cell.column.columnDef, 'cell'),
                            )}
                            style={getColumnStyle(cell.column.columnDef.size)}
                          >
                            {renderCellContent(cell)}
                          </TableCell>
                        ))}
                      </TableRow>
                      {expandable && row.getIsExpanded() && (
                        <TableRow className='hover:bg-transparent'>
                          {/* Same tint as the expanded parent row so the pair reads as one
                              unit, and the bottom hairline stays so the panel closes inside
                              the table instead of bleeding into the page. */}
                          <TableCell colSpan={row.getVisibleCells().length} className='bg-slate-50 p-3'>
                            {expandable.expandedRowRender(row.original)}
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={columns.length} className='h-24 text-center text-sm text-slate-500'>
                    {emptyState ?? '데이터가 없습니다'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </TooltipProvider>
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
              className='h-8 w-8 p-0'
              onClick={() => pagination.onChange(1, pageSize)}
              disabled={currentPage <= 1}
            >
              <ChevronsLeft className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 w-8 p-0'
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
              className='h-8 w-8 p-0'
              onClick={() => pagination.onChange(currentPage + 1, pageSize)}
              disabled={currentPage >= pageCount}
            >
              <ChevronRight className='h-4 w-4' />
            </Button>
            <Button
              variant='outline'
              size='sm'
              className='h-8 w-8 p-0'
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
export type { DataTableProps, DataTableColumnMeta };
