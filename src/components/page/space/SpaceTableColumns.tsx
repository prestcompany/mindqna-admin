import { Space } from '@/client/types';
import { Button, Tag } from 'antd';
import { TableProps } from 'antd/lib';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';

export interface SpaceTableActionsProps {
  onViewProfiles: (space: Space) => void;
  onOpenCoin: (space: Space) => void;
  onRemove: (space: Space) => void;
  copyId: (id: string) => void;
}

export const createSpaceTableColumns = (actions: SpaceTableActionsProps): TableProps<Space>['columns'] => [
  {
    title: '공간 ID',
    dataIndex: 'id',
    key: 'id',
    width: 120,
    render: (id) => (
      <Button size='small' type='default' onClick={() => actions.copyId(id)} className='flex gap-1'>
        {id}
        <Copy className='w-4 h-4' />
      </Button>
    ),
  },
  {
    title: '공간 이름',
    dataIndex: ['spaceInfo', 'name'],
    key: 'name',
    width: 150,
    ellipsis: true,
  },
  {
    title: '타입',
    dataIndex: ['spaceInfo', 'type'],
    key: 'type',
    width: 80,
    render: (type) => {
      const typeMap = {
        alone: { text: '혼자', color: 'blue' },
        couple: { text: '커플', color: 'red' },
        family: { text: '가족', color: 'green' },
        friends: { text: '친구', color: 'orange' },
      };
      const config = typeMap[type as keyof typeof typeMap] || { text: type, color: 'default' };
      return <Tag color={config.color}>{config.text}</Tag>;
    },
  },
  {
    title: '언어',
    dataIndex: ['spaceInfo', 'locale'],
    key: 'locale',
    width: 70,
    render: (locale) => <Tag>{locale?.toUpperCase()}</Tag>,
  },
  {
    title: '멤버',
    dataIndex: ['spaceInfo', 'members'],
    key: 'members',
    width: 70,
    render: (members) => <Tag color='cyan'>{members || 0}</Tag>,
  },
  {
    title: '카드',
    dataIndex: 'cardOrder',
    key: 'cardOrder',
    width: 70,
    render: (count) => <Tag color='purple'>{count || 0}</Tag>,
  },
  {
    title: '답변',
    dataIndex: ['spaceInfo', 'replies'],
    key: 'replies',
    width: 70,
    render: (replies) => <Tag color='geekblue'>{replies || 0}</Tag>,
  },
  {
    title: '하트/스타',
    key: 'coins',
    width: 120,
    render: (_, space) => (
      <div className='flex gap-1'>
        <Tag color='red'>❤️ {space.coin}</Tag>
        <Tag color='gold'>⭐ {space.coinPaid}</Tag>
      </div>
    ),
  },
  {
    title: '펫 LV',
    dataIndex: ['pet', 'level'],
    key: 'level',
    width: 100,
    render: (level, space) => (
      <div className='flex gap-1'>
        <Tag color='cyan'>Lv.{level}</Tag>
        <Tag color='blue'>{space.pet.exp.toFixed(1)}</Tag>
      </div>
    ),
  },
  {
    title: '방/인테리어',
    key: 'items',
    width: 100,
    render: (_, space) => (
      <div className='flex gap-1'>
        <Tag color='purple'>🏠 {space.rooms?.length || 0}</Tag>
        <Tag color='orange'>🪑 {space.InteriorItem?.length || 0}</Tag>
      </div>
    ),
  },
  {
    title: '가입일',
    dataIndex: ['spaceInfo', 'createdAt'],
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
    title: '삭제예정일',
    dataIndex: 'dueRemovedAt',
    key: 'dueRemovedAt',
    width: 120,
    render: (value: string, item: Space) => {
      if (!value) return null;

      const isPremium = item.profiles?.[0]?.isPremium;
      const day = dayjs(value);
      let diff = day.add(isPremium ? -60 : -30, 'day').diff(item.spaceInfo.createdAt, 'minute');

      if (diff < 0) {
        diff = day.subtract(2, 'day').diff(item.spaceInfo.createdAt, 'minute');
      }

      const gap = diff > 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}m`;
      const isUrgent = diff < 60; // 1시간 미만

      return (
        <div>
          <Tag color={isUrgent ? 'error' : 'warning'}>{gap}만에 삭제</Tag>
          <div className='text-xs text-gray-500'>{day.format('YY.MM.DD HH:mm:ss')}</div>
        </div>
      );
    },
  },
  {
    title: '작업',
    key: 'actions',
    width: 180,
    fixed: 'right',
    render: (_, space) => (
      <div className='flex gap-1'>
        <Button size='small' type='link' onClick={() => actions.onViewProfiles(space)}>
          멤버 목록
        </Button>
        <Button size='small' type='primary' onClick={() => actions.onOpenCoin(space)}>
          코인 괸리
        </Button>
        <Button size='small' danger onClick={() => actions.onRemove(space)}>
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
  { key: 'id', visible: true, width: 120 },
  { key: 'name', visible: true, width: 150 },
  { key: 'type', visible: true, width: 80 },
  { key: 'locale', visible: true, width: 70 },
  { key: 'members', visible: true, width: 70 },
  { key: 'cardOrder', visible: true, width: 70 },
  { key: 'replies', visible: true, width: 70 },
  { key: 'coins', visible: true, width: 120 },
  { key: 'level', visible: true, width: 100 },
  { key: 'items', visible: true, width: 100 },
  { key: 'createdAt', visible: true, width: 120 },
  { key: 'dueRemovedAt', visible: false, width: 120 }, // 기본적으로 숨김
  { key: 'actions', visible: true, width: 180 },
];

// 컬럼 필터링 유틸리티
export const filterColumns = (
  columns: TableProps<Space>['columns'],
  config: ColumnConfig[],
): TableProps<Space>['columns'] => {
  const visibleKeys = new Set(config.filter((c) => c.visible).map((c) => c.key));
  return columns?.filter((col) => col && 'key' in col && visibleKeys.has(col.key as string));
};
