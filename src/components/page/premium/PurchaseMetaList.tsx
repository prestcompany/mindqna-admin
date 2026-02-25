import { PurchaseMeta } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import DataTable from '@/components/shared/ui/data-table';
import usePurchases from '@/hooks/usePurchase';
import { zodResolver } from '@hookform/resolvers/zod';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { Copy, Eye } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const searchSchema = z.object({
  username: z.string().optional(),
});

type SearchFormValues = z.infer<typeof searchSchema>;

function PurchaseMetaList() {
  const form = useForm<SearchFormValues>({
    resolver: zodResolver(searchSchema),
    defaultValues: { username: '' },
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState<{
    username?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  const [startedAt, setStartedAt] = useState<dayjs.Dayjs | null>(null);
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs | null>(null);

  const [detailDialog, setDetailDialog] = useState<{ title: string; content: string } | null>(null);

  const { items, isLoading, refetch, totalPage } = usePurchases({
    page: currentPage,
    ...searchFilters,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} 복사됨`);
  };

  const showDetail = (content: string, title: string) => {
    setDetailDialog({ title, content });
  };

  const columns: ColumnDef<PurchaseMeta>[] = [
    {
      accessorKey: 'id',
      header: '번호',
      size: 80,
      cell: ({ row }) => <span className='text-sm font-medium text-gray-600'>{row.original.id}</span>,
    },
    {
      accessorKey: 'platform',
      header: '플랫폼',
      size: 90,
      cell: ({ row }) => {
        const value = row.original.platform;
        const platformConfig = {
          EVENT: { variant: 'destructive' as const, text: 'EVENT' },
          IOS: { variant: 'info' as const, text: 'iOS' },
          AOS: { variant: 'success' as const, text: 'Android' },
        };
        const config = platformConfig[value as keyof typeof platformConfig];
        return config ? <Badge variant={config.variant}>{config.text}</Badge> : <Badge variant='secondary'>{value}</Badge>;
      },
    },
    {
      accessorKey: 'userId',
      header: '유저 ID',
      size: 150,
      cell: ({ row }) => {
        const value = row.original.userId;
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='truncate text-sm font-mono max-w-[100px]'>{value}</span>
                </TooltipTrigger>
                <TooltipContent>{value}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => copyToClipboard(value, '유저 ID')}
              className='opacity-80 hover:opacity-100'
            >
              <Copy className='w-4 h-4' />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'username',
      header: '유저 이름',
      size: 100,
      cell: ({ row }) => <span className='text-sm font-medium text-gray-600'>{row.original.username}</span>,
    },
    {
      accessorKey: 'productId',
      header: '상품 ID',
      size: 150,
      cell: ({ row }) => {
        const value = row.original.productId;
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='truncate text-sm font-mono max-w-[100px]'>{value}</span>
                </TooltipTrigger>
                <TooltipContent>{value}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant='ghost'
              size='sm'
              onClick={() => copyToClipboard(value, '상품 ID')}
              className='opacity-80 hover:opacity-100'
            >
              <Copy className='w-4 h-4' />
            </Button>
          </div>
        );
      },
    },
    {
      accessorKey: 'transactionId',
      header: '결제 ID',
      size: 180,
      cell: ({ row }) => {
        const value = row.original.transactionId;
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className='truncate text-sm font-mono max-w-[120px]'>{value}</span>
                </TooltipTrigger>
                <TooltipContent>{value}</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <div className='flex gap-1'>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => copyToClipboard(value, '결제 ID')}
                className='opacity-80 hover:opacity-100'
              >
                <Copy className='w-4 h-4' />
              </Button>
              <Button
                variant='ghost'
                size='sm'
                onClick={() => showDetail(value, '결제 ID 상세')}
                className='opacity-80 hover:opacity-100'
              >
                <Eye className='w-4 h-4' />
              </Button>
            </div>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: '상태',
      size: 100,
      cell: ({ row }) => {
        const ticket = row.original;
        const isExpired = ticket.isExpired;
        const isPurchase = !isExpired && (ticket.isSuccess || dayjs(ticket.createdAt).isBefore('2024-06-01'));

        if (!isExpired && !isPurchase) {
          return (
            <Badge variant='destructive' className='font-medium'>
              실패
            </Badge>
          );
        }
        if (isPurchase) {
          return (
            <Badge variant='success' className='font-medium'>
              구매
            </Badge>
          );
        }
        if (isExpired) {
          return (
            <Badge variant='muted' className='font-medium'>
              만료
            </Badge>
          );
        }
      },
    },
    {
      accessorKey: 'isProduction',
      header: '환경',
      size: 100,
      cell: ({ row }) => (
        <Badge variant={row.original.isProduction ? 'default' : 'warning'} className='font-medium'>
          {row.original.isProduction ? 'PROD' : 'TEST'}
        </Badge>
      ),
    },
    {
      accessorKey: 'createdAt',
      header: '구매 시간',
      size: 150,
      cell: ({ row }) => {
        const value = row.original.createdAt;
        const record = row.original;
        const day = dayjs(value);
        const diffFromNow = dayjs().diff(day, 'day');
        const isRecent = diffFromNow <= 7;
        const isExpired = record.isExpired || !record.isSuccess;

        return (
          <div className='space-y-1'>
            <div className={`text-sm font-medium ${isRecent ? 'text-blue-600' : 'text-gray-700'}`}>
              {day.format('YYYY.MM.DD')}
            </div>
            <div className='text-xs text-gray-500'>
              {day.format('HH:mm')} ({diffFromNow}일 전)
            </div>
            {!isExpired && <div className='text-xs text-green-600'>활성</div>}
          </div>
        );
      },
    },
    {
      id: 'expiredAt',
      header: '만료 시간',
      size: 150,
      cell: ({ row }) => {
        const record = row.original;
        const isExpired = record.isExpired;

        if (!isExpired) {
          return <span className='text-xs text-gray-400'>진행중</span>;
        }

        const createdDay = dayjs(record.createdAt);
        const estimatedExpiry = createdDay.add(30, 'day');
        const diffFromNow = dayjs().diff(estimatedExpiry, 'day');

        return (
          <div className='space-y-1'>
            <div className='text-sm font-medium text-red-600'>{estimatedExpiry.format('YYYY.MM.DD')}</div>
            <div className='text-xs text-gray-500'>
              {estimatedExpiry.format('HH:mm')} ({Math.abs(diffFromNow)}일 전 만료)
            </div>
            <div className='text-xs text-red-600'>만료됨</div>
          </div>
        );
      },
    },
    {
      accessorKey: 'log',
      header: '로그',
      size: 100,
      cell: ({ row }) => {
        const value = row.original.log;
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant='ghost'
                    size='sm'
                    onClick={() => showDetail(value, '로그 상세')}
                    className='opacity-80 hover:opacity-100'
                  >
                    <Eye className='w-4 h-4' />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>로그 보기</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        );
      },
    },
  ];

  const handleSearch = () => {
    const values = form.getValues();

    if (values.username && values.username.trim()) {
      setSearchFilters({
        username: values.username.trim(),
        startDate: undefined,
        endDate: undefined,
      });
    } else if (startedAt && endedAt) {
      setSearchFilters({
        username: undefined,
        startDate: startedAt.format('YYYY-MM-DD'),
        endDate: endedAt.format('YYYY-MM-DD'),
      });
    } else {
      setSearchFilters({
        username: undefined,
        startDate: undefined,
        endDate: undefined,
      });
    }
    setCurrentPage(1);
  };

  const handleReset = () => {
    form.reset();
    setSearchFilters({});
    setStartedAt(null);
    setEndedAt(null);
    setCurrentPage(1);
  };

  return (
    <>
      <div className='flex gap-2 items-center py-4'>
        <span className='text-lg font-bold'>필터</span>
        {Object.keys(searchFilters).length > 0 && (
          <span className='px-2 py-1 text-sm text-blue-600 bg-blue-50 rounded'>필터 적용됨</span>
        )}
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSearch)} className='flex items-end gap-4 p-4 mb-4 bg-gray-50 rounded'>
          <FormField
            control={form.control}
            name='username'
            render={({ field }) => (
              <FormItem>
                <FormLabel>유저 ID</FormLabel>
                <FormControl>
                  <Input placeholder='유저 ID 입력' className='w-[200px]' {...field} />
                </FormControl>
              </FormItem>
            )}
          />

          <div className='space-y-2'>
            <FormLabel>날짜 범위</FormLabel>
            <DatePickerWithRange
              startedAt={startedAt}
              endedAt={endedAt}
              setStartedAt={setStartedAt}
              setEndedAt={setEndedAt}
            />
          </div>

          <Button type='submit'>
            검색
          </Button>

          <Button variant='outline' type='button' onClick={handleReset}>초기화</Button>
        </form>
      </Form>

      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          onChange: (page) => setCurrentPage(page),
        }}
      />

      <Dialog open={!!detailDialog} onOpenChange={(open) => !open && setDetailDialog(null)}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>{detailDialog?.title}</DialogTitle>
          </DialogHeader>
          <div className='overflow-auto max-h-96'>
            <pre className='p-3 text-xs whitespace-pre-wrap bg-gray-50 rounded'>{detailDialog?.content}</pre>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default PurchaseMetaList;
