import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
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
            value={(filter.locale ?? [])?.[0] ?? '__all__'}
            onValueChange={(v: string) => onFilterChange('locale', v === '__all__' ? undefined : [v])}
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
              <SelectItem value='zhTw'>TW</SelectItem>
              <SelectItem value='es'>ES</SelectItem>
              <SelectItem value='id'>ID</SelectItem>
            </SelectContent>
          </Select>

          <div className='flex-1' />

          <Button variant='outline' onClick={onOpenMigration} disabled={loading}>
            <RefreshCw className='w-4 h-4' />
            로그인 교체
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default UserFilterBar;
