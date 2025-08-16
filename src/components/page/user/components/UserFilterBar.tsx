import { Button, Card, Select } from 'antd';

interface UserFilterBarProps {
  filter: {
    locale?: string[];
  };
  onFilterChange: (key: string, value: any) => void;
  onOpenSearch: () => void;
  onOpenMigration: () => void;
  loading?: boolean;
}

function UserFilterBar({ filter, onFilterChange, onOpenSearch, onOpenMigration, loading }: UserFilterBarProps) {
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

        <div className='flex-1' />

        <Button onClick={onOpenMigration} type='default' disabled={loading}>
          🔄 로그인 교체
        </Button>
      </div>
    </Card>
  );
}

export default UserFilterBar;
