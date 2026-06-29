import { PurchaseMeta } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import DataTable from '@/components/shared/ui/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import usePurchases from '@/hooks/usePurchase';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Copy, Eye } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

// 이 이전 결제건은 isSuccess 미기록 → 성공으로 간주(레거시 데이터 보정)
const LEGACY_SUCCESS_BEFORE = '2024-06-01';

type StatusValue = 'all' | 'success' | 'failed' | 'expired';
type PlatformValue = 'all' | 'IOS' | 'AOS' | 'EVENT';
type EnvValue = 'all' | 'prod' | 'test';

const PLATFORM_META: Record<string, { variant: 'softNeutral' | 'softInfo' | 'softWarning'; text: string }> = {
  IOS: { variant: 'softInfo', text: 'iOS' }, // sky — Apple
  AOS: { variant: 'softNeutral', text: 'Android' }, // slate — 표준 스토어
  EVENT: { variant: 'softWarning', text: 'EVENT' }, // amber — 실결제 아닌 시스템 지급, 구분
};

function resolveStatus(record: PurchaseMeta): { label: string; variant: 'softSuccess' | 'softDanger' | 'softNeutral' } {
  if (record.isExpired) return { label: '만료', variant: 'softNeutral' };
  const isSuccess = record.isSuccess || dayjs(record.createdAt).isBefore(LEGACY_SUCCESS_BEFORE);
  return isSuccess ? { label: '성공', variant: 'softSuccess' } : { label: '실패', variant: 'softDanger' };
}

function PurchaseMetaList() {
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
  const [detailDialog, setDetailDialog] = useState<{ title: string; content: string } | null>(null);

  const { items, isLoading, totalPage } = usePurchases({ page: currentPage, ...searchFilters });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 복사됨`);
  };
  const showDetail = (content: string, title: string) => setDetailDialog({ title, content });

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

  const hasActiveFilters = Object.values(searchFilters).some((v) => v !== undefined);

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
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => copyToClipboard(userId, '유저 ID')}>
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
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => copyToClipboard(value, '상품 ID')}>
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
            <Button variant='ghost' size='sm' className='h-8 w-8 p-0' onClick={() => copyToClipboard(value, '결제 ID')}>
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
        return <Badge variant={s.variant}>{s.label}</Badge>;
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
    {
      id: 'detail',
      header: '상세',
      size: 90,
      cell: ({ row }) => {
        const { log, receipt } = row.original;
        return (
          <div className='flex items-center gap-1'>
            {log ? (
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-2 text-xs text-slate-600'
                onClick={() => showDetail(log, '로그 상세')}
              >
                <Eye className='mr-1 h-3.5 w-3.5' />
                로그
              </Button>
            ) : null}
            {receipt ? (
              <Button
                variant='ghost'
                size='sm'
                className='h-8 px-2 text-xs text-slate-600'
                onClick={() => showDetail(receipt, '영수증 원문')}
              >
                <Eye className='mr-1 h-3.5 w-3.5' />
                영수증
              </Button>
            ) : null}
            {!log && !receipt ? <span className='text-xs text-slate-500'>없음</span> : null}
          </div>
        );
      },
    },
  ];

  return (
    <TooltipProvider>
      <DefaultTableBtn className='justify-between'>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className='flex flex-1 flex-wrap items-end gap-3'
        >
          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>유저 ID</Label>
            <Input
              value={usernameKeyword}
              onChange={(e) => setUsernameKeyword(e.target.value)}
              placeholder='유저 ID 입력'
              className='w-[200px]'
            />
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>상태</Label>
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusValue)}>
              <SelectTrigger className='w-[110px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='success'>성공</SelectItem>
                <SelectItem value='failed'>실패</SelectItem>
                <SelectItem value='expired'>만료</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>플랫폼</Label>
            <Select value={platformFilter} onValueChange={(v) => setPlatformFilter(v as PlatformValue)}>
              <SelectTrigger className='w-[110px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='IOS'>iOS</SelectItem>
                <SelectItem value='AOS'>Android</SelectItem>
                <SelectItem value='EVENT'>EVENT</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>환경</Label>
            <Select value={envFilter} onValueChange={(v) => setEnvFilter(v as EnvValue)}>
              <SelectTrigger className='w-[100px]'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>전체</SelectItem>
                <SelectItem value='prod'>PROD</SelectItem>
                <SelectItem value='test'>TEST</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className='space-y-2'>
            <Label className='text-xs text-slate-600'>날짜 범위</Label>
            <DatePickerWithRange
              startedAt={startedAt}
              endedAt={endedAt}
              setStartedAt={setStartedAt}
              setEndedAt={setEndedAt}
            />
          </div>

          <Button type='submit'>검색</Button>
          <Button type='button' variant='outline' onClick={showFailedOnly}>
            실패만 보기
          </Button>
          <Button type='button' variant='outline' onClick={handleReset}>
            초기화
          </Button>
          {hasActiveFilters ? <Badge variant='softNeutral'>필터 적용됨</Badge> : null}
        </form>
      </DefaultTableBtn>

      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        pagination={{
          total: totalPage * 20,
          page: currentPage,
          pageSize: 20,
          onChange: (page) => setCurrentPage(page),
        }}
      />

      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{detailDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className='max-h-96 overflow-auto'>
            <pre className='whitespace-pre-wrap rounded bg-slate-50 p-3 text-xs text-slate-700'>{detailDialog?.content}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </TooltipProvider>
  );
}

export default PurchaseMetaList;
