import { User } from '@/client/types';
import { Button, Tag } from 'antd';
import { TableProps } from 'antd/lib';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';

export interface UserTableActionsProps {
  onOpenTicket: (user: User) => void;
  onRemove: (user: User) => void;
  copyId: (id: string) => void;
}

export const createUserTableColumns = (actions: UserTableActionsProps): TableProps<User>['columns'] => [
  {
    title: '유저 ID',
    dataIndex: 'id',
    key: 'id',
    width: 100,
    render: (id) => (
      <Button size='small' type='default' onClick={() => actions.copyId(id)} className='flex gap-1'>
        {id.slice(0, 8)}...
        <Copy className='w-4 h-4' />
      </Button>
    ),
  },
  {
    title: '유저코드',
    dataIndex: 'username',
    key: 'username',
    width: 150,
    render: (username) => (
      <Button size='small' type='default' onClick={() => actions.copyId(username)} className='flex gap-1'>
        {username}
        <Copy className='w-4 h-4' />
      </Button>
    ),
  },
  {
    title: '가입상태',
    key: 'joinStatus',
    width: 100,
    render: (_, user) => {
      const isCompleted = user._count.profiles > 0;
      const statusMap = {
        completed: { text: '완료', color: 'green', icon: '✅' },
        pending: { text: '진행중', color: 'orange', icon: '⏳' },
      };
      const config = statusMap[isCompleted ? 'completed' : 'pending'];
      return (
        <Tag color={config.color}>
          {config.icon} {config.text}
        </Tag>
      );
    },
  },
  {
    title: '이메일',
    dataIndex: ['socialAccount', 'email'],
    key: 'email',
    width: 200,
    ellipsis: true,
  },
  {
    title: '로그인',
    dataIndex: ['socialAccount', 'provider'],
    key: 'provider',
    width: 100,
    render: (provider) => {
      const providerMap = {
        GOOGLE: { text: 'Google', color: 'red', icon: '🔍' },
        KAKAO: { text: 'Kakao', color: 'gold', icon: '💬' },
        APPLE: { text: 'Apple', color: 'default', icon: '🍎' },
        LINE: { text: 'Line', color: 'green', icon: '💚' },
      };
      const config = providerMap[provider as keyof typeof providerMap] || {
        text: provider,
        color: 'default',
        icon: '🔗',
      };
      return (
        <Tag color={config.color}>
          {config.icon} {config.text}
        </Tag>
      );
    },
  },
  {
    title: '언어',
    dataIndex: 'locale',
    key: 'locale',
    width: 80,
    render: (locale) => {
      const localeMap = {
        ko: { flag: '🇰🇷', code: 'KO' },
        en: { flag: '🇺🇸', code: 'EN' },
        ja: { flag: '🇯🇵', code: 'JA' },
        zh: { flag: '🇨🇳', code: 'ZH' },
        zhTw: { flag: '🇹🇼', code: 'TW' },
        es: { flag: '🇪🇸', code: 'ES' },
        id: { flag: '🇮🇩', code: 'ID' },
      };
      const config = localeMap[locale as keyof typeof localeMap] || { flag: '🌐', code: locale?.toUpperCase() };
      return (
        <Tag>
          {config.flag} {config.code}
        </Tag>
      );
    },
  },
  {
    title: '공간/최대',
    key: 'spaceInfo',
    width: 120,
    render: (_, user) => (
      <div className='flex gap-1'>
        <Tag color='blue'>🏠 {user._count.profiles || 0}</Tag>
        <Tag color={user.spaceMaxCount > 5 ? 'gold' : user.spaceMaxCount > 2 ? 'green' : 'default'}>
          🏆 {user.spaceMaxCount}
        </Tag>
      </div>
    ),
  },
  {
    title: '가입일',
    dataIndex: 'createdAt',
    key: 'createdAt',
    width: 120,
    render: (value) => {
      const day = dayjs(value);
      const diffFromNow = dayjs().diff(day, 'day');
      return (
        <div className='flex flex-row gap-1 items-center'>
          <Tag color={diffFromNow < 7 ? 'green' : diffFromNow < 30 ? 'orange' : 'default'}>D+{diffFromNow}</Tag>
          <div className='text-sm text-gray-500'>{day.format('YY.MM.DD HH:mm:ss')}</div>
        </div>
      );
    },
  },
  {
    title: '탈퇴예정일',
    dataIndex: 'reserveUnregisterAt',
    key: 'reserveUnregisterAt',
    width: 180,
    render: (value: string, item: User) => {
      if (!value) return null;

      const day = dayjs(value);
      const diff = day.add(-48, 'hour').diff(item.createdAt, 'minute');
      const gap = diff > 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;
      const isUrgent = diff < 60;

      return (
        <div className='flex flex-row gap-1 items-center'>
          <Tag color={isUrgent ? 'error' : 'warning'}>{gap}만에 삭제</Tag>
          <div className='text-sm text-gray-500'>{day.format('YY.MM.DD HH:mm:ss')}</div>
        </div>
      );
    },
  },
  {
    title: '작업',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (_, user) => (
      <div className='flex gap-1'>
        <Button size='small' type='primary' onClick={() => actions.onOpenTicket(user)}>
          티켓 관리
        </Button>
        <Button size='small' danger onClick={() => actions.onRemove(user)}>
          삭제
        </Button>
      </div>
    ),
  },
];

// 컬럼 설정 타입
export interface ColumnConfig {
  key: string;
  visible: boolean;
  width?: number;
}

// 기본 컬럼 설정
export const defaultColumnConfig: ColumnConfig[] = [
  { key: 'username', visible: true, width: 150 },
  { key: 'joinStatus', visible: true, width: 100 },
  { key: 'email', visible: true, width: 200 },
  { key: 'provider', visible: true, width: 100 },
  { key: 'locale', visible: true, width: 80 },
  { key: 'spaceInfo', visible: true, width: 120 },
  { key: 'createdAt', visible: true, width: 120 },
  { key: 'reserveUnregisterAt', visible: false, width: 120 }, // 기본적으로 숨김
  { key: 'actions', visible: true, width: 180 },
];

// 컬럼 필터링 유틸리티
export const filterColumns = (
  columns: TableProps<User>['columns'],
  config: ColumnConfig[],
): TableProps<User>['columns'] => {
  const visibleKeys = new Set(config.filter((c) => c.visible).map((c) => c.key));
  return columns?.filter((col) => col && 'key' in col && visibleKeys.has(col.key as string));
};
