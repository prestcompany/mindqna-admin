import { SpaceType } from '@/client/types';
import { Button, Card, Select } from 'antd';

interface SpaceFilterBarProps {
  filter: {
    type?: SpaceType[];
    locale?: string[];
    orderBy?: string;
  };
  onFilterChange: (key: string, value: any) => void;
  onOpenSearch: () => void;
  onOpenBulkCoin: () => void;
  loading?: boolean;
}

function SpaceFilterBar({ filter, onFilterChange, onOpenSearch, onOpenBulkCoin, loading }: SpaceFilterBarProps) {
  return (
    <Card size='small' className='mb-4'>
      <div className='flex flex-wrap gap-3 items-center'>
        <Button onClick={onOpenSearch} type='primary' loading={loading}>
          🔍 검색하기
        </Button>

        <div className='w-px h-6 bg-gray-300' />

        <span className='font-medium text-gray-700'>필터:</span>

        <Select
          placeholder='언어'
          style={{ width: 120 }}
          options={[
            { label: '🇰🇷 ko', value: 'ko' },
            { label: '🇺🇸 en', value: 'en' },
            { label: '🇯🇵 ja', value: 'ja' },
            { label: '🇨🇳 zh', value: 'zh' },
            { label: '🇹🇼 zhTw', value: 'zhTw' },
            { label: '🇪🇸 es', value: 'es' },
            { label: '🇮🇩 id', value: 'id' },
          ]}
          value={(filter.locale ?? [])?.[0]}
          onChange={(v: string) => onFilterChange('locale', v ? [v] : undefined)}
          allowClear
        />

        <Select
          placeholder='공간 타입'
          style={{ width: 120 }}
          options={[
            { label: '🙋 혼자', value: 'alone' },
            { label: '💑 커플', value: 'couple' },
            { label: '👨‍👩‍👧‍👦 가족', value: 'family' },
            { label: '👥 친구', value: 'friends' },
          ]}
          value={(filter.type ?? [])?.[0]}
          onChange={(v: SpaceType) => onFilterChange('type', v ? [v] : undefined)}
          allowClear
        />

        <span className='font-medium text-gray-700'>정렬:</span>

        <Select
          placeholder='정렬 기준'
          style={{ width: 130 }}
          options={[
            { label: '📝 카드 많은 순', value: 'card' },
            { label: '💬 답변 많은 순', value: 'replies' },
            { label: '⬆️ 레벨 높은 순', value: 'level' },
            { label: '👥 멤버 많은 순', value: 'members' },
          ]}
          value={filter.orderBy}
          onChange={(v: string) => onFilterChange('orderBy', v)}
          allowClear
        />

        <div className='flex-1' />

        <Button onClick={onOpenBulkCoin} type='default' disabled={loading}>
          💰 단체 지급
        </Button>
      </div>
    </Card>
  );
}

export default SpaceFilterBar;
