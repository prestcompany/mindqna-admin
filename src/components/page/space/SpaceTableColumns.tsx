import { Space } from '@/client/types';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';

export interface SpaceTableActionsProps {
  onViewProfiles: (space: Space) => void;
  onOpenCoin: (space: Space) => void;
  onRemove: (space: Space) => void;
  copyId: (id: string) => void;
}

export const createSpaceTableColumns = (actions: SpaceTableActionsProps): ColumnDef<Space>[] => [
  {
    accessorKey: 'id',
    header: '공간 ID',
    size: 180,
    cell: ({ row }) => (
      <Button
        size='sm'
        variant='outline'
        onClick={() => actions.copyId(row.original.id)}
        className='flex max-w-[168px] justify-start gap-1 overflow-hidden'
      >
        <span className='truncate'>{row.original.id}</span>
        <Copy className='w-4 h-4' />
      </Button>
    ),
  },
  {
    accessorFn: (row) => row.spaceInfo?.name,
    id: 'name',
    header: '공간 이름',
    size: 220,
    cell: ({ row }) => <span className='block truncate font-medium'>{row.original.spaceInfo?.name ?? '-'}</span>,
  },
  {
    accessorFn: (row) => row.spaceInfo?.type,
    id: 'type',
    header: '타입',
    size: 96,
    cell: ({ row }) => {
      const type = row.original.spaceInfo?.type;
      const typeMap = {
        alone: { text: '혼자', variant: 'info' as const },
        couple: { text: '커플', variant: 'destructive' as const },
        family: { text: '가족', variant: 'success' as const },
        friends: { text: '친구', variant: 'warning' as const },
      };
      const config = typeMap[type as keyof typeof typeMap] || { text: type, variant: 'muted' as const };
      return <Badge variant={config.variant}>{config.text}</Badge>;
    },
  },
  {
    accessorFn: (row) => row.spaceInfo?.locale,
    id: 'locale',
    header: '언어',
    size: 72,
    cell: ({ row }) => <Badge variant='secondary'>{row.original.spaceInfo?.locale?.toUpperCase()}</Badge>,
  },
  {
    accessorFn: (row) => row.spaceInfo?.members,
    id: 'members',
    header: '멤버',
    size: 88,
    cell: ({ row }) => <Badge variant='info'>{row.original.spaceInfo?.members || 0}</Badge>,
  },
  {
    accessorKey: 'cardOrder',
    header: '카드',
    size: 80,
    cell: ({ row }) => <Badge variant='default'>{row.original.cardOrder || 0}</Badge>,
  },
  {
    accessorFn: (row) => row.spaceInfo?.replies,
    id: 'replies',
    header: '답변',
    size: 80,
    cell: ({ row }) => <Badge variant='info'>{row.original.spaceInfo?.replies || 0}</Badge>,
  },
  {
    id: 'coins',
    header: '하트/스타',
    size: 146,
    cell: ({ row }) => (
      <div className='flex gap-1 whitespace-nowrap'>
        <Badge variant='destructive'>하트 {row.original.coin}</Badge>
        <Badge variant='warning'>스타 {row.original.coinPaid}</Badge>
      </div>
    ),
  },
  {
    accessorFn: (row) => row.pet?.level,
    id: 'level',
    header: '펫 LV',
    size: 130,
    cell: ({ row }) => (
      <div className='flex gap-1 whitespace-nowrap'>
        <Badge variant='info'>Lv.{row.original.pet.level}</Badge>
        <Badge variant='info'>{row.original.pet.exp.toFixed(1)}</Badge>
      </div>
    ),
  },
  {
    id: 'items',
    header: '방/인테리어',
    size: 140,
    cell: ({ row }) => (
      <div className='flex gap-1 whitespace-nowrap'>
        <Badge variant='default'>방 {row.original.rooms?.length || 0}</Badge>
        <Badge variant='warning'>인테리어 {row.original.InteriorItem?.length || 0}</Badge>
      </div>
    ),
  },
  {
    accessorFn: (row) => row.spaceInfo?.createdAt,
    id: 'createdAt',
    header: '가입일',
    size: 182,
    cell: ({ row }) => {
      const day = dayjs(row.original.spaceInfo?.createdAt);
      const diffFromNow = dayjs().diff(day, 'day');
      return (
        <div className='flex flex-row gap-1 items-center whitespace-nowrap'>
          <Badge variant={diffFromNow < 7 ? 'success' : diffFromNow < 30 ? 'warning' : 'muted'}>D+{diffFromNow}</Badge>
          <div className='text-sm text-muted-foreground'>{day.format('YY.MM.DD HH:mm:ss')}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'dueRemovedAt',
    header: '삭제예정일',
    size: 190,
    cell: ({ row }) => {
      const value = row.original.dueRemovedAt;
      if (!value) return null;

      const isPremium = row.original.profiles?.[0]?.isPremium;
      const day = dayjs(value);
      let diff = day.add(isPremium ? -60 : -30, 'day').diff(row.original.spaceInfo.createdAt, 'minute');

      if (diff < 0) {
        diff = day.subtract(2, 'day').diff(row.original.spaceInfo.createdAt, 'minute');
      }

      const gap = diff > 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}m`;
      const isUrgent = diff < 60;

      return (
        <div className='whitespace-nowrap'>
          <Badge variant={isUrgent ? 'destructive' : 'warning'}>{gap}만에 삭제</Badge>
          <div className='text-xs text-muted-foreground'>{day.format('YY.MM.DD HH:mm:ss')}</div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: '관리',
    size: 92,
    cell: ({ row }) => {
      const space = row.original;
      return (
        <TableRowActions
          items={[
            {
              label: '멤버 목록',
              onClick: () => actions.onViewProfiles(space),
            },
            {
              label: '코인 관리',
              onClick: () => actions.onOpenCoin(space),
            },
            {
              label: '삭제',
              onClick: () => actions.onRemove(space),
              destructive: true,
            },
          ]}
        />
      );
    },
  },
];

export interface ColumnConfig {
  key: string;
  visible: boolean;
  width?: number;
}

export const defaultColumnConfig: ColumnConfig[] = [
  { key: 'id', visible: true, width: 180 },
  { key: 'name', visible: true, width: 220 },
  { key: 'type', visible: true, width: 96 },
  { key: 'locale', visible: true, width: 72 },
  { key: 'members', visible: true, width: 88 },
  { key: 'cardOrder', visible: true, width: 80 },
  { key: 'replies', visible: true, width: 80 },
  { key: 'coins', visible: true, width: 146 },
  { key: 'level', visible: true, width: 130 },
  { key: 'items', visible: false, width: 140 },
  { key: 'createdAt', visible: true, width: 182 },
  { key: 'dueRemovedAt', visible: false, width: 190 },
  { key: 'actions', visible: true, width: 92 },
];

export const filterColumns = (
  columns: ColumnDef<Space>[],
  config: ColumnConfig[],
): ColumnDef<Space>[] => {
  const visibleKeys = new Set(config.filter((c) => c.visible).map((c) => c.key));
  return columns.filter((col) => {
    const key = col.id || ('accessorKey' in col ? (col.accessorKey as string) : undefined);
    return key && visibleKeys.has(key);
  });
};
