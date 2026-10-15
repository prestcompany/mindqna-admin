import type { PdfExportRecord } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import PdfExportStatusBadge from './PdfExportStatusBadge';
import { PDF_EXPORT_CURRENCY_LABEL } from './services/pdf-export-policy-form';

export interface PdfExportHistoryActionsProps {
  onDownload: (record: PdfExportRecord) => void;
  onAdjust: (record: PdfExportRecord) => void;
  onDelete: (record: PdfExportRecord) => void;
}

export const createPdfExportHistoryColumns = (actions: PdfExportHistoryActionsProps): ColumnDef<PdfExportRecord>[] => [
  {
    id: 'space',
    header: '공간',
    size: 200,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate font-medium text-foreground'>{row.original.spaceName || '(이름 없음)'}</div>
        <div className='truncate font-mono text-xs text-muted-foreground'>{row.original.spaceId}</div>
      </div>
    ),
  },
  {
    id: 'user',
    header: '발급 유저',
    size: 190,
    cell: ({ row }) => (
      <div className='min-w-0'>
        <div className='truncate text-foreground'>{row.original.nickname}</div>
        <div className='truncate font-mono text-xs text-muted-foreground'>{row.original.username}</div>
      </div>
    ),
  },
  {
    id: 'range',
    header: '카드 범위',
    size: 108,
    cell: ({ row }) => (
      <span className='tabular-nums text-foreground'>
        {row.original.startOrder}–{row.original.endOrder}
      </span>
    ),
  },
  {
    accessorKey: 'count',
    header: '포함 카드',
    size: 92,
    cell: ({ row }) => <span className='font-medium tabular-nums text-foreground'>{row.original.count}</span>,
  },
  {
    accessorKey: 'cost',
    header: '차감',
    size: 112,
    cell: ({ row }) => (
      <span className='flex items-center gap-1.5'>
        <Badge variant={row.original.currency === 'HEART' ? 'softDanger' : 'softWarning'}>
          {PDF_EXPORT_CURRENCY_LABEL[row.original.currency]}
        </Badge>
        <span className='tabular-nums text-foreground'>{row.original.cost}</span>
      </span>
    ),
  },
  {
    id: 'download',
    header: '다운로드',
    size: 104,
    cell: ({ row }) => (
      <span className='tabular-nums text-foreground'>
        {row.original.downloadCount} / {row.original.maxDownloadCount}
      </span>
    ),
  },
  {
    id: 'status',
    header: '상태',
    size: 132,
    cell: ({ row }) => <PdfExportStatusBadge status={row.original.status} />,
  },
  {
    accessorKey: 'createdAt',
    header: '발급일',
    size: 150,
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>{dayjs(row.original.createdAt).format('YY.MM.DD HH:mm')}</span>
    ),
  },
  {
    accessorKey: 'expiresAt',
    header: '만료일',
    size: 132,
    cell: ({ row }) => (
      <span className='text-sm text-muted-foreground'>{dayjs(row.original.expiresAt).format('YY.MM.DD')}</span>
    ),
  },
  {
    accessorKey: 'fileName',
    header: '파일명',
    size: 200,
    cell: ({ row }) => row.original.fileName,
  },
  {
    id: 'actions',
    header: '관리',
    size: 80,
    cell: ({ row }) => {
      const record = row.original;
      return (
        <TableRowActions
          items={[
            { label: 'PDF 보기', onClick: () => actions.onDownload(record) },
            { label: '다운로드·만료 조정', onClick: () => actions.onAdjust(record) },
            { label: '강제 삭제', onClick: () => actions.onDelete(record), destructive: true },
          ]}
        />
      );
    },
  },
];
