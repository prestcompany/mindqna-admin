import { PurchaseMeta } from '@/client/types';
import DataTable from '@/components/shared/ui/data-table';
import { FilterBar, FILTER_CONTROL_CLASS, type FilterChipItem } from '@/components/shared/ui/filter-bar';
import { resolveStatus } from '@/components/shared/purchase/purchase-status';
import type { PurchaseDetailContext } from '@/components/page/premium/PurchaseDetailSheet';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import usePurchases from '@/hooks/usePurchase';
import { cn } from '@/lib/utils';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

type StatusValue = 'all' | 'success' | 'failed' | 'expired';
type PlatformValue = 'all' | 'IOS' | 'AOS' | 'EVENT';
type EnvValue = 'all' | 'prod' | 'test';

const PLATFORM_META: Record<string, { variant: 'softNeutral' | 'softInfo' | 'softWarning'; text: string }> = {
  IOS: { variant: 'softInfo', text: 'iOS' }, // sky — Apple
  AOS: { variant: 'softNeutral', text: 'Android' }, // slate — 표준 스토어
  EVENT: { variant: 'softWarning', text: 'EVENT' }, // amber — 실결제 아닌 시스템 지급, 구분
};

const CHIP_VALUE_LABELS: Record<string, string> = {
  success: '성공',
  failed: '실패',
  expired: '만료',
  IOS: 'iOS',
  AOS: 'Android',
  EVENT: 'EVENT',
};

function PurchaseMetaList({ onOpenDetail }: { onOpenDetail: (ctx: PurchaseDetailContext) => void }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState<{
    username?: string;
    startDate?: string;
    endDate?: string;
    platform?: 'IOS' | 'AOS' | 'EVENT';
    status?: 'success' | 'failed' | 'expired';
    isProduction?: boolean;
  }>({});
  const [usernameKeyword, setUsernameKeyword] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusValue>('all');
  const [platformFilter, setPlatformFilter] = useState<PlatformValue>('all');
  const [envFilter, setEnvFilter] = useState<EnvValue>('all');
  const [startedAt, setStartedAt] = useState<dayjs.Dayjs | null>(null);
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs | null>(null);

  const { items, isLoading, totalPage } = usePurchases({ page: currentPage, ...searchFilters });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 복사됨`);
  };

  const buildFilters = (overrides?: { status?: StatusValue }) => {
    const status = overrides?.status ?? statusFilter;
    return {
      username: usernameKeyword.trim() || undefined,
      startDate: startedAt ? startedAt.format('YYYY-MM-DD') : undefined,
      endDate: endedAt ? endedAt.format('YYYY-MM-DD') : undefined,
      platform: platformFilter === 'all' ? undefined : platformFilter,
      status: status === 'all' ? undefined : status,
      isProduction: envFilter === 'all' ? undefined : envFilter === 'prod',
    };
  };

  const handleSearch = () => {
    setSearchFilters(buildFilters());
    setCurrentPage(1);
  };
  const handleReset = () => {
    setUsernameKeyword('');
    setStatusFilter('all');
    setPlatformFilter('all');
    setEnvFilter('all');
    setStartedAt(null);
    setEndedAt(null);
    setSearchFilters({});
    setCurrentPage(1);
  };
  const showFailedOnly = () => {
    setStatusFilter('failed');
    setSearchFilters(buildFilters({ status: 'failed' }));
    setCurrentPage(1);
  };

  const chips: FilterChipItem[] = [];
  if (searchFilters.username) chips.push({ key: 'username', label: `유저: ${searchFilters.username}` });
  if (searchFilters.status) chips.push({ key: 'status', label: `상태: ${CHIP_VALUE_LABELS[searchFilters.status]}` });
  if (searchFilters.platform) chips.push({ key: 'platform', label: `플랫폼: ${CHIP_VALUE_LABELS[searchFilters.platform]}` });
  if (searchFilters.isProduction !== undefined)
    chips.push({ key: 'env', label: `환경: ${searchFilters.isProduction ? 'PROD' : 'TEST'}` });
  if (searchFilters.startDate || searchFilters.endDate) {
    const dateLabel =
      searchFilters.startDate && searchFilters.endDate
        ? `${searchFilters.startDate} ~ ${searchFilters.endDate}`
        : searchFilters.startDate
          ? `${searchFilters.startDate} 이후`
          : `${searchFilters.endDate} 이전`;
    chips.push({ key: 'date', label: `기간: ${dateLabel}` });
  }

  const removeChip = (key: string) => {
    if (key === 'username') setUsernameKeyword('');
    if (key === 'status') setStatusFilter('all');
    if (key === 'platform') setPlatformFilter('all');
    if (key === 'env') setEnvFilter('all');
    if (key === 'date') {
      setStartedAt(null);
      setEndedAt(null);
    }
    setSearchFilters((prev) => ({
      ...prev,
      username: key === 'username' ? undefined : prev.username,
      status: key === 'status' ? undefined : prev.status,
      platform: key === 'platform' ? undefined : prev.platform,
      isProduction: key === 'env' ? undefined : prev.isProduction,
      startDate: key === 'date' ? undefined : prev.startDate,
      endDate: key === 'date' ? undefined : prev.endDate,
    }));
    setCurrentPage(1);
  };

  const columns: ColumnDef<PurchaseMeta>[] = [
    {
      accessorKey: 'platform',
      header: '플랫폼',
      size: 90,
      cell: ({ row }) => {
        const meta = PLATFORM_META[row.original.platform];
        return meta ? (
          <Badge variant={meta.variant}>{meta.text}</Badge>
        ) : (
          <Badge variant='softNeutral'>{row.original.platform}</Badge>
        );
      },
    },
    {
      accessorKey: 'username',
      header: '유저',
      size: 130,
      cell: ({ row }) => {
        const { username, userId } = row.original;
        return (
          <div className='flex items-center gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='max-w-[120px] truncate text-sm font-medium text-slate-900'>{username || userId}</span>
              </TooltipTrigger>
              <TooltipContent>{userId}</TooltipContent>
            </Tooltip>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(userId, '유저 ID');
              }}
            >
              <Copy className='h-3.5 w-3.5' />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'productId',
      header: '상품 ID',
      size: 150,
      cell: ({ row }) => {
        const value = row.original.productId;
        if (!value) return <span className='text-xs text-slate-500'>없음</span>;
        return (
          <div className='flex items-center gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='max-w-[120px] truncate font-mono text-sm text-slate-700'>{value}</span>
              </TooltipTrigger>
              <TooltipContent>{value}</TooltipContent>
            </Tooltip>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(value, '상품 ID');
              }}
            >
              <Copy className='h-3.5 w-3.5' />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'transactionId',
      header: '결제 ID',
      size: 160,
      cell: ({ row }) => {
        const value = row.original.transactionId;
        if (!value) return <span className='text-xs text-slate-500'>없음</span>;
        return (
          <div className='flex items-center gap-1'>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className='max-w-[120px] truncate font-mono text-sm text-slate-700'>{value}</span>
              </TooltipTrigger>
              <TooltipContent>{value}</TooltipContent>
            </Tooltip>
            <Button
              variant='ghost'
              size='sm'
              className='h-8 w-8 p-0'
              onClick={(e) => {
                e.stopPropagation();
                copyToClipboard(value, '결제 ID');
              }}
            >
              <Copy className='h-3.5 w-3.5' />
            </Button>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: '상태',
      size: 80,
      cell: ({ row }) => {
        const s = resolveStatus(row.original);
        return <Badge variant={s.dotVariant}>{s.label}</Badge>;
      },
    },
    {
      accessorKey: 'isProduction',
      header: '환경',
      size: 80,
      cell: ({ row }) => (
        <Badge variant={row.original.isProduction ? 'softNeutral' : 'softWarning'}>
          {row.original.isProduction ? 'PROD' : 'TEST'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '구매 시간',
      size: 150,
      cell: ({ row }) => {
        const day = dayjs(row.original.createdAt);
        const diff = dayjs().diff(day, 'day');
        return (
          <div className='space-y-0.5'>
            <div className='text-sm tabular-nums text-slate-900'>{day.format('YYYY.MM.DD')}</div>
            <div className='text-[11px] tabular-nums text-slate-500'>
              {day.format('HH:mm')} · {diff}일 전
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'completedAt',
      header: '완료 시간',
      size: 140,
      cell: ({ row }) => {
        const value = row.original.completedAt;
        if (!value) return <span className='text-xs text-slate-500'>—</span>;
        const day = dayjs(value);
        return (
          <div className='space-y-0.5'>
            <div className='text-sm tabular-nums text-slate-900'>{day.format('YYYY.MM.DD')}</div>
            <div className='text-[11px] tabular-nums text-slate-500'>{day.format('HH:mm')}</div>
          </div>
        );
      },
    },
  ];

  return (
    <TooltipProvider>
      <FilterBar chips={chips} onRemoveChip={removeChip}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className='flex flex-1 flex-wrap items-center gap-2'
        >
          <Input
            value={usernameKeyword}
            onChange={(e) => setUsernameKeyword(e.target.value)}
            placeholder='유저 ID 입력'
            className={cn('w-[200px]', FILTER_CONTROL_CLASS)}
          />

          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusValue)}>
            <SelectTrigger className={cn('w-[110px]', FILTER_CONTROL_CLASS)}>
              <SelectValue placeholder='상태' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='all'>전체</SelectItem>
              <SelectItem value='success'>성공</SelectItem>
              <SelectItem value='failed'>실패</SelectItem>
              <SelectItem value='expired'>만료</SelectItem>
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

          <DatePickerWithRange
            startedAt={startedAt}
            endedAt={endedAt}
            setStartedAt={setStartedAt}
            setEndedAt={setEndedAt}
            triggerClassName={FILTER_CONTROL_CLASS}
          />

          <Button type='submit' className='h-8'>
            검색
          </Button>
          <Button type='button' variant='outline' className='h-8' onClick={showFailedOnly}>
            실패만 보기
          </Button>
          <Button type='button' variant='outline' className='h-8' onClick={handleReset}>
            초기화
          </Button>
        </form>
      </FilterBar>

      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        onRow={(record) => ({
          onClick: () => onOpenDetail({ type: 'purchase', purchaseId: record.id }),
        })}
        pagination={{
          total: totalPage * 20,
          page: currentPage,
          pageSize: 20,
          onChange: (page) => setCurrentPage(page),
        }}
      />
    </TooltipProvider>
  );
}

export default PurchaseMetaList;
