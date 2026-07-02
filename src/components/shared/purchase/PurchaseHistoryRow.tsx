import { Badge } from '@/components/ui/badge';
import type { UserPurchaseRow } from '@/client/types';
import dayjs from 'dayjs';

function PurchaseHistoryRow({ row }: { row: UserPurchaseRow }) {
  return (
    <div className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
      <Badge variant='softNeutral' className='w-16 shrink-0 justify-center uppercase'>
        {row.platform}
      </Badge>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium text-slate-900'>{row.productId}</div>
        <div className='truncate text-[11px] text-slate-500'>
          {row.isSubscribe ? '구독' : '단건'} · {dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}
        </div>
      </div>
      <div className='shrink-0 text-sm font-semibold tabular-nums text-slate-900'>{row.price}</div>
    </div>
  );
}

export default PurchaseHistoryRow;
