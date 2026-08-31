import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RefreshCw, Search } from 'lucide-react';

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
    <FilterBar>
      <Button
        onClick={onOpenSearch}
        disabled={loading}
        className={`${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}
      >
        <Search className='h-3.5 w-3.5' />
        검색하기
      </Button>

      <Select
        value={(filter.locale ?? [])?.[0] ?? '__all__'}
        onValueChange={(v: string) => onFilterChange('locale', v === '__all__' ? undefined : [v])}
      >
        <SelectTrigger className={`w-[120px] ${FILTER_CONTROL_CLASS}`}>
          <SelectValue placeholder='언어' />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value='__all__'>전체</SelectItem>
          <SelectItem value='ko'>KO</SelectItem>
          <SelectItem value='en'>EN</SelectItem>
          <SelectItem value='ja'>JA</SelectItem>
          <SelectItem value='zh'>ZH</SelectItem>
          <SelectItem value='zhTw'>TW</SelectItem>
          <SelectItem value='es'>ES</SelectItem>
          <SelectItem value='id'>ID</SelectItem>
        </SelectContent>
      </Select>

      <div className='flex-1' />

      <Button
        variant='outline'
        onClick={onOpenMigration}
        disabled={loading}
        className={`${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}
      >
        <RefreshCw className='h-3.5 w-3.5' />
        로그인 교체
      </Button>
    </FilterBar>
  );
}

export default UserFilterBar;
