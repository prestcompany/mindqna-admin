import { Badge } from '@/components/ui/badge';
import type { UserEntitlementTicket } from '@/client/types';
import { cn } from '@/lib/utils';
import dayjs from 'dayjs';

function isLive(t: UserEntitlementTicket): boolean {
  if (!t.isActive) return false;
  if (!t.dueAt) return true;
  return new Date(t.dueAt).getTime() > Date.now();
}

function EntitlementRow({ label, t }: { label: string; t: UserEntitlementTicket }) {
  const live = isLive(t);
  return (
    <div className='flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5'>
      <Badge variant={live ? 'softSuccess' : 'softNeutral'} className='w-16 shrink-0 justify-center'>
        {label}
      </Badge>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium text-slate-900'>{t.productId}</div>
        <div className='truncate text-xs text-slate-600'>
          {t.platform.toUpperCase()} · {t.dueAt ? `만료 ${dayjs(t.dueAt).format('YYYY.MM.DD')}` : '만료 없음'}
        </div>
      </div>
      <span className={cn('shrink-0 text-xs font-medium', live ? 'text-emerald-600' : 'text-slate-500')}>
        {live ? '활성' : '비활성'}
      </span>
    </div>
  );
}

export default EntitlementRow;
