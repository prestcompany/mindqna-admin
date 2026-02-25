import { User } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';

export interface UserTableActionsProps {
  onOpenTicket: (user: User) => void;
  onRemove: (user: User) => void;
  copyId: (id: string) => void;
}

export const createUserTableColumns = (actions: UserTableActionsProps): ColumnDef<User>[] => [
  {
    accessorKey: 'id',
    header: '유저 ID',
    size: 100,
    cell: ({ row }) => (
      <Button variant='outline' size='sm' onClick={() => actions.copyId(row.original.id)}>
        {row.original.id.slice(0, 8)}...
        <Copy className='w-4 h-4' />
      </Button>
    ),
  },
  {
    accessorKey: 'username',
    header: '유저코드',
    size: 150,
    cell: ({ row }) => (
      <Button variant='outline' size='sm' onClick={() => actions.copyId(row.original.username)}>
        {row.original.username}
        <Copy className='w-4 h-4' />
      </Button>
    ),
  },
  {
    id: 'joinStatus',
    header: '가입상태',
    size: 100,
    cell: ({ row }) => {
      const isCompleted = row.original._count.profiles > 0;
      return isCompleted ? <Badge variant='success'>완료</Badge> : <Badge variant='warning'>진행중</Badge>;
    },
  },
  {
    accessorFn: (row) => row.socialAccount?.email,
    id: 'email',
    header: '이메일',
    size: 200,
  },
  {
    accessorFn: (row) => row.socialAccount?.provider,
    id: 'provider',
    header: '로그인',
    size: 100,
    cell: ({ row }) => {
      const provider = row.original.socialAccount?.provider;
      const providerMap: Record<string, { text: string; variant: 'destructive' | 'warning' | 'muted' | 'success' }> = {
        GOOGLE: { text: 'Google', variant: 'destructive' },
        KAKAO: { text: 'Kakao', variant: 'warning' },
        APPLE: { text: 'Apple', variant: 'muted' },
        LINE: { text: 'Line', variant: 'success' },
      };
      const config = providerMap[provider as string] || { text: provider, variant: 'muted' as const };
      return <Badge variant={config.variant}>{config.text}</Badge>;
    },
  },
  {
    accessorKey: 'locale',
    header: '언어',
    size: 80,
    cell: ({ row }) => {
      const locale = row.original.locale;
      const localeMap: Record<string, string> = {
        ko: 'KO',
        en: 'EN',
        ja: 'JA',
        zh: 'ZH',
        zhTw: 'TW',
        es: 'ES',
        id: 'ID',
      };
      const code = localeMap[locale as string] || locale?.toUpperCase();
      return <Badge variant='secondary'>{code}</Badge>;
    },
  },
  {
    id: 'spaceInfo',
    header: '공간/최대',
    size: 120,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className='flex gap-1'>
          <Badge variant='info'>공간 {user._count.profiles || 0}</Badge>
          <Badge
            variant={user.spaceMaxCount > 5 ? 'warning' : user.spaceMaxCount > 2 ? 'success' : 'muted'}
          >
            최대 {user.spaceMaxCount}
          </Badge>
        </div>
      );
    },
  },
  {
    accessorKey: 'createdAt',
    header: '가입일',
    size: 120,
    cell: ({ row }) => {
      const day = dayjs(row.original.createdAt);
      const diffFromNow = dayjs().diff(day, 'day');
      return (
        <div className='flex flex-row gap-1 items-center'>
          <Badge variant={diffFromNow < 7 ? 'success' : diffFromNow < 30 ? 'warning' : 'muted'}>D+{diffFromNow}</Badge>
          <div className='text-sm text-gray-500'>{day.format('YY.MM.DD HH:mm:ss')}</div>
        </div>
      );
    },
  },
  {
    accessorKey: 'reserveUnregisterAt',
    header: '탈퇴예정일',
    size: 180,
    cell: ({ row }) => {
      const value = row.original.reserveUnregisterAt;
      if (!value) return null;

      const day = dayjs(value);
      const diff = day.add(-48, 'hour').diff(row.original.createdAt, 'minute');
      const gap = diff > 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;
      const isUrgent = diff < 60;

      return (
        <div className='flex flex-row gap-1 items-center'>
          <Badge variant={isUrgent ? 'destructive' : 'warning'}>{gap}만에 삭제</Badge>
          <div className='text-sm text-gray-500'>{day.format('YY.MM.DD HH:mm:ss')}</div>
        </div>
      );
    },
  },
  {
    id: 'actions',
    header: '작업',
    size: 180,
    cell: ({ row }) => {
      const user = row.original;
      return (
        <div className='flex gap-1'>
          <Button size='sm' onClick={() => actions.onOpenTicket(user)}>
            티켓 관리
          </Button>
          <Button size='sm' variant='destructive' onClick={() => actions.onRemove(user)}>
            삭제
          </Button>
        </div>
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
  { key: 'username', visible: true, width: 150 },
  { key: 'joinStatus', visible: true, width: 100 },
  { key: 'email', visible: true, width: 200 },
  { key: 'provider', visible: true, width: 100 },
  { key: 'locale', visible: true, width: 80 },
  { key: 'spaceInfo', visible: true, width: 120 },
  { key: 'createdAt', visible: true, width: 120 },
  { key: 'reserveUnregisterAt', visible: false, width: 120 },
  { key: 'actions', visible: true, width: 180 },
];

export const filterColumns = (
  columns: ColumnDef<User>[],
  config: ColumnConfig[],
): ColumnDef<User>[] => {
  const visibleKeys = new Set(config.filter((c) => c.visible).map((c) => c.key));
  return columns.filter((col) => {
    const key = col.id || ('accessorKey' in col ? (col.accessorKey as string) : undefined);
    return key && visibleKeys.has(key);
  });
};
