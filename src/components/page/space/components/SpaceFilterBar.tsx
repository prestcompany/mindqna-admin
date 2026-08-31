import type { SpaceOrderBy } from '@/client/space';
import { SpaceType } from '@/client/types';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
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
    <FilterBar>
      <Button onClick={onOpenSearch} disabled={loading} className={cn(FILTER_CONTROL_CLASS, '[&_svg]:size-3.5')}>
        <Search className='h-3.5 w-3.5' />
        검색하기
      </Button>

      <Select
        value={(filter.locale ?? [])?.[0] || '__all__'}
        onValueChange={(value) => onFilterChange('locale', value === '__all__' ? undefined : [value])}
      >
        <SelectTrigger className={cn('w-[120px]', FILTER_CONTROL_CLASS)}>
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
        <SelectTrigger className={cn('w-[120px]', FILTER_CONTROL_CLASS)}>
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

      <Select
        value={filter.orderBy || '__all__'}
        onValueChange={(value) => onFilterChange('orderBy', value === '__all__' ? undefined : (value as SpaceOrderBy))}
      >
        <SelectTrigger className={cn('w-[130px]', FILTER_CONTROL_CLASS)}>
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

      <Button onClick={onOpenBulkCoin} variant='outline' disabled={loading} className={FILTER_CONTROL_CLASS}>
        단체 지급
      </Button>
    </FilterBar>
  );
}

export default SpaceFilterBar;
