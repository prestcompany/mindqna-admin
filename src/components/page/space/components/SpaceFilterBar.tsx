import type { SpaceOrderBy } from '@/client/space';
import { SpaceType } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SpaceFilterBarProps {
  filter: {
    type?: SpaceType[];
    locale?: string[];
    orderBy?: SpaceOrderBy;
  };
  onFilterChange: (
    key: 'type' | 'locale' | 'orderBy',
    value: SpaceType[] | string[] | SpaceOrderBy | undefined,
  ) => void;
  onOpenSearch: () => void;
  onOpenBulkCoin: () => void;
  loading?: boolean;
}

function SpaceFilterBar({ filter, onFilterChange, onOpenSearch, onOpenBulkCoin, loading }: SpaceFilterBarProps) {
  return (
    <Card className='mb-4'>
      <CardContent className='p-4'>
        <div className='flex flex-wrap gap-3 items-center'>
          <Button onClick={onOpenSearch} disabled={loading}>
            <Search className='w-4 h-4' />
            검색하기
          </Button>

          <div className='w-px h-6 bg-gray-300' />

          <span className='font-medium text-gray-700'>필터:</span>

          <Select
            value={(filter.locale ?? [])?.[0] || '__all__'}
            onValueChange={(value) => onFilterChange('locale', value === '__all__' ? undefined : [value])}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='언어' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              <SelectItem value='ko'>KO</SelectItem>
              <SelectItem value='en'>EN</SelectItem>
              <SelectItem value='ja'>JA</SelectItem>
              <SelectItem value='zh'>ZH</SelectItem>
              <SelectItem value='zhTw'>ZH-TW</SelectItem>
              <SelectItem value='es'>ES</SelectItem>
              <SelectItem value='id'>ID</SelectItem>
            </SelectContent>
          </Select>

          <Select
            value={(filter.type ?? [])?.[0] || '__all__'}
            onValueChange={(value) => onFilterChange('type', value === '__all__' ? undefined : [value as SpaceType])}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='공간 타입' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              <SelectItem value='alone'>혼자</SelectItem>
              <SelectItem value='couple'>커플</SelectItem>
              <SelectItem value='family'>가족</SelectItem>
              <SelectItem value='friends'>친구</SelectItem>
            </SelectContent>
          </Select>

          <span className='font-medium text-gray-700'>정렬:</span>

          <Select
            value={filter.orderBy || '__all__'}
            onValueChange={(value) =>
              onFilterChange('orderBy', value === '__all__' ? undefined : (value as SpaceOrderBy))
            }
          >
            <SelectTrigger className='w-[130px]'>
              <SelectValue placeholder='정렬 기준' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              <SelectItem value='heart'>하트 많은 순</SelectItem>
              <SelectItem value='star'>스타 많은 순</SelectItem>
              <SelectItem value='exp'>경험치 높은 순</SelectItem>
              <SelectItem value='roomCount'>방 많은 순</SelectItem>
              <SelectItem value='interiorCount'>인테리어 많은 순</SelectItem>
              <SelectItem value='card'>카드 많은 순</SelectItem>
              <SelectItem value='replies'>답변 많은 순</SelectItem>
              <SelectItem value='members'>멤버 많은 순</SelectItem>
            </SelectContent>
          </Select>

          <div className='flex-1' />

          <Button onClick={onOpenBulkCoin} variant='outline' disabled={loading}>
            단체 지급
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default SpaceFilterBar;
