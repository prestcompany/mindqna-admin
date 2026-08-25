import { Badge } from '@/components/ui/badge';
import type { UserPurchaseRow } from '@/client/types';
import dayjs from 'dayjs';

function PurchaseHistoryRow({ row }: { row: UserPurchaseRow }) {
  return (
    <div className='flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5'>
      <Badge variant='softNeutral' className='w-16 shrink-0 justify-center uppercase'>
        {row.platform}
      </Badge>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium text-foreground'>{row.productId}</div>
        <div className='truncate text-xs text-muted-foreground'>
          {row.isSubscribe ? '구독' : '단건'} · {dayjs(row.createdAt).format('YYYY.MM.DD HH:mm')}
        </div>
      </div>
      <div className='shrink-0 text-sm font-semibold tabular-nums text-foreground'>{row.price}</div>
    </div>
  );
}

export default PurchaseHistoryRow;
