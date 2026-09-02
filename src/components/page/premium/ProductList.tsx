import { IAPProduct } from '@/client/premium';
import { FilterBar, FILTER_CONTROL_CLASS } from '@/components/shared/ui/filter-bar';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/shared/ui/data-table';
import { cn } from '@/lib/utils';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import useProducts from '@/hooks/useProducts';
import type { PurchaseDetailContext } from './PurchaseDetailSheet';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useResetOnChange } from '@/hooks/useResetOnChange';

type ActiveValue = 'all' | 'active' | 'expired';
type KindValue = 'all' | 'sub' | 'consumable';
type PlatformValue = 'all' | 'IOS' | 'AOS' | 'EVENT';
type EnvValue = 'all' | 'prod' | 'test';

const PLATFORM_META: Record<string, { variant: 'softNeutral' | 'softInfo' | 'softWarning'; text: string }> = {
  IOS: { variant: 'softInfo', text: 'iOS' },
  AOS: { variant: 'softNeutral', text: 'Android' },
  EVENT: { variant: 'softWarning', text: 'EVENT' },
};

function ProductList({ onOpenDetail }: { onOpenDetail: (ctx: PurchaseDetailContext) => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [activeFilter, setActiveFilter] = useState<ActiveValue>('all');
  const [kindFilter, setKindFilter] = useState<KindValue>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformValue>('all');
  const [envFilter, setEnvFilter] = useState<EnvValue>('all');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;

  const { items, isLoading, totalPage } = useProducts({
    page: currentPage,
    search: effectiveSearch,
    isActive: activeFilter === 'all' ? undefined : activeFilter === 'active',
    isSubscribe: kindFilter === 'all' ? undefined : kindFilter === 'sub',
    platform: platformFilter === 'all' ? undefined : platformFilter,
    isProduction: envFilter === 'all' ? undefined : envFilter === 'prod',
  });

  useResetOnChange([effectiveSearch, activeFilter, kindFilter, platformFilter, envFilter], () => setCurrentPage(1));

  const columns: ColumnDef<IAPProduct>[] = [
    { accessorKey: 'id', header: '번호', size: 72 },
    {
      id: 'username',
      accessorFn: (row) => row.owner?.username ?? '-',
      header: '유저',
      size: 170,
      meta: { truncateMaxWidth: 150 },
    },
    {
      accessorKey: 'platform',
      header: '플랫폼',
      size: 92,
      cell: ({ row }) => {
        const meta = PLATFORM_META[row.original.platform];
        return meta ? <Badge variant={meta.variant}>{meta.text}</Badge> : <Badge variant='softNeutral'>{row.original.platform}</Badge>;
      },
    },
    {
      id: 'subscription',
      header: '구독/소모품',
      size: 110,
      cell: ({ row }) => {
        const value = row.original.dueAt;
        return <Badge variant={value ? 'softInfo' : 'softNeutral'}>{value ? '구독' : '소모품'}</Badge>;
      },
    },
    { id: 'productId', accessorFn: (row) => row.productId ?? '-', header: '상품 ID', size: 210, meta: { truncateMaxWidth: 190 } },
    { id: 'transactionId', accessorFn: (row) => row.transactionId ?? '-', header: '결제 ID', size: 220, meta: { truncateMaxWidth: 200 } },
    {
      accessorKey: 'dueAt',
      header: '만료일',
      size: 130,
      cell: ({ row }) => {
        const value = row.original.dueAt;
        return <div>{value ? dayjs(value).format('YY.MM.DD HH:mm') : ''}</div>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '활성화',
      size: 92,
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'dotSuccess' : 'dotNeutral'}>{value ? '활성화' : '만료'}</Badge>;
      },
    },
    {
      accessorKey: 'isProduction',
      header: '환경',
      size: 104,
      cell: ({ row }) => {
        const value = row.original.isProduction;
        return <Badge variant={value ? 'softNeutral' : 'softWarning'}>{value ? 'PROD' : 'TEST'}</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '생성 시간',
      size: 140,
      cell: ({ row }) => <div>{dayjs(row.original.createdAt).format('YY.MM.DD HH:mm')}</div>,
    },
  ];

  return (
    <>
      <FilterBar>
        <div className='relative min-w-[280px]'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='유저 / 상품 ID / 결제 ID (2자 이상)'
            className={cn('pl-9', FILTER_CONTROL_CLASS)}
          />
        </div>
        <Select value={activeFilter} onValueChange={(v) => setActiveFilter(v as ActiveValue)}>
          <SelectTrigger className={cn('w-[110px]', FILTER_CONTROL_CLASS)}>
            <SelectValue placeholder='활성 상태' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>전체</SelectItem>
            <SelectItem value='active'>활성</SelectItem>
            <SelectItem value='expired'>만료</SelectItem>
          </SelectContent>
        </Select>
        <Select value={kindFilter} onValueChange={(v) => setKindFilter(v as KindValue)}>
          <SelectTrigger className={cn('w-[120px]', FILTER_CONTROL_CLASS)}>
            <SelectValue placeholder='유형' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>전체</SelectItem>
            <SelectItem value='sub'>구독</SelectItem>
            <SelectItem value='consumable'>소모품</SelectItem>
          </SelectContent>
        </Select>
        <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformValue)}>
          <SelectTrigger className={cn('w-[110px]', FILTER_CONTROL_CLASS)}>
            <SelectValue placeholder='플랫폼' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>전체</SelectItem>
            <SelectItem value='IOS'>iOS</SelectItem>
            <SelectItem value='AOS'>Android</SelectItem>
            <SelectItem value='EVENT'>EVENT</SelectItem>
          </SelectContent>
        </Select>
        <Select value={envFilter} onValueChange={(v) => setEnvFilter(v as EnvValue)}>
          <SelectTrigger className={cn('w-[100px]', FILTER_CONTROL_CLASS)}>
            <SelectValue placeholder='환경' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='all'>전체</SelectItem>
            <SelectItem value='prod'>PROD</SelectItem>
            <SelectItem value='test'>TEST</SelectItem>
          </SelectContent>
        </Select>
      </FilterBar>
      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        onRow={(record) => ({ onClick: () => onOpenDetail({ type: 'ticket', ticket: record }) })}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />
    </>
  );
}

export default ProductList;
