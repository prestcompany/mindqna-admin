import { getCouponBatchCodes, type CouponBatch } from '@/client/coupon';
import { Button } from '@/components/ui/button';
import useCouponBatchCodes from '@/hooks/useCouponBatchCodes';
import dayjs from 'dayjs';
import { Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { errorMessage } from './errorMessage';

function CouponCodeList({ batch }: { batch: CouponBatch }) {
  const [page, setPage] = useState(1);
  const [copying, setCopying] = useState(false);
  const { items, totalPage, isLoading, isError, refetch } = useCouponBatchCodes(batch.batchId, page, true);

  const copyAll = async () => {
    setCopying(true);
    try {
      const all = await getCouponBatchCodes(batch.batchId, 1, true);
      const text = Array.from(new Set(all.items.map((item) => item.code))).join('\n');
      await navigator.clipboard.writeText(text);
      toast.success('쿠폰 코드를 클립보드에 복사했습니다.');
    } catch (err) {
      toast.error(errorMessage(err));
    }
    setCopying(false);
  };

  if (isLoading) {
    return (
      <div className='flex h-16 items-center justify-center'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      </div>
    );
  }

  // Distinguish a failed fetch from a genuinely empty batch — retry: 0 means a 500 or
  // a dropped connection otherwise resolves to an empty list with no indication anything
  // went wrong.
  if (isError) {
    return (
      <div className='flex items-center justify-between gap-3 text-sm'>
        <span className='text-slate-500'>코드를 불러오지 못했습니다.</span>
        <Button variant='outline' size='sm' onClick={() => refetch()}>
          다시 시도
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <div className='space-y-1'>
        {items.length === 0 && <div className='text-sm text-slate-500'>표시할 코드가 없습니다.</div>}
        {items.map((item, index) => (
          <div key={`${item.codeId}-${index}`} className='flex items-center gap-3 text-sm'>
            <span className='w-36 truncate font-mono text-slate-900'>{item.code}</span>
            <span className={item.usedAt ? 'text-slate-700' : 'text-slate-500'}>
              {item.usedAt ? '사용' : '미사용'}
            </span>
            {item.username && <span className='text-slate-700'>{item.username}</span>}
            {item.usedAt && (
              <span className='text-slate-500'>{dayjs(item.usedAt).format('YY.MM.DD HH:mm')}</span>
            )}
          </div>
        ))}
      </div>

      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Button variant='outline' size='sm' onClick={() => setPage(page - 1)} disabled={page <= 1}>
            이전
          </Button>
          <span className='px-2 text-sm tabular-nums text-slate-600'>
            {page} / {totalPage}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage(page + 1)}
            disabled={page >= totalPage}
          >
            다음
          </Button>
        </div>

        {batch.issueMode === 'INDIVIDUAL' && (
          <Button variant='outline' size='sm' onClick={copyAll} disabled={copying}>
            {copying ? <Loader2 className='mr-2 h-3.5 w-3.5 animate-spin' /> : <Copy className='mr-2 h-3.5 w-3.5' />}
            코드 전체 복사
          </Button>
        )}
      </div>
    </div>
  );
}

export default CouponCodeList;
