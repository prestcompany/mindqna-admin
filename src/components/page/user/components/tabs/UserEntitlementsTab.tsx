import { getUserEntitlements } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import type { UserEntitlementTicket } from '@/client/types';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

function isLive(t: UserEntitlementTicket): boolean {
  if (!t.isActive) return false;
  if (!t.dueAt) return true;
  return new Date(t.dueAt).getTime() > Date.now();
}

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className='space-y-2'>
      <h4 className='text-xs font-semibold text-slate-500'>
        {title} <span className='tabular-nums text-slate-400'>{count}</span>
      </h4>
      <div className='space-y-3'>{children}</div>
    </section>
  );
}

function EntitlementRow({ label, t }: { label: string; t: UserEntitlementTicket }) {
  const live = isLive(t);
  return (
    <div className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'>
      <Badge variant={live ? 'softSuccess' : 'softNeutral'} className='w-16 shrink-0 justify-center'>
        {label}
      </Badge>
      <div className='min-w-0 flex-1'>
        <div className='truncate text-sm font-medium text-slate-900'>{t.productId}</div>
        <div className='truncate text-[11px] text-slate-500'>
          {t.platform.toUpperCase()} · {t.dueAt ? `만료 ${dayjs(t.dueAt).format('YYYY.MM.DD')}` : '만료 없음'}
        </div>
      </div>
      <span className={cn('shrink-0 text-xs font-medium', live ? 'text-emerald-600' : 'text-slate-500')}>
        {live ? '활성' : '비활성'}
      </span>
    </div>
  );
}

function UserEntitlementsTab({ username, active }: { username: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['user-entitlements', username],
    queryFn: () => getUserEntitlements(username),
    enabled: active && !!username,
  });

  if (isFetching && !data) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }

  const tickets = data?.premiumTickets ?? [];
  const golds = data?.goldClubs ?? [];
  const subs = data?.subscriptions ?? [];
  const isEmpty = tickets.length === 0 && golds.length === 0 && subs.length === 0;

  if (data && isEmpty) {
    return (
      <Card className='bg-card'>
        <CardContent className='py-8 text-center text-sm text-muted-foreground'>구독/권한 내역이 없습니다.</CardContent>
      </Card>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-500'>
        구독 레코드는 DB 보유 정보입니다. 스토어 실시간 갱신/취소 상태는 추후 연동 예정입니다.
      </div>

      <Section title='프리미엄' count={tickets.length}>
        {tickets.map((t) => (
          <EntitlementRow key={`p-${t.id}`} label='프리미엄' t={t} />
        ))}
      </Section>

      <Section title='골드클럽' count={golds.length}>
        {golds.map((t) => (
          <EntitlementRow key={`g-${t.id}`} label='골드클럽' t={t} />
        ))}
      </Section>

      <Section title='구독 이력' count={subs.length}>
        {subs.map((s) => (
          <div
            key={`s-${s.id}`}
            className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
          >
            <Badge variant='softNeutral' className='w-16 shrink-0 justify-center'>
              구독
            </Badge>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium text-slate-900'>{s.productId}</div>
              <div className='truncate text-[11px] text-slate-500'>
                {s.platform.toUpperCase()} · {dayjs(s.createdAt).format('YYYY.MM.DD')}
              </div>
            </div>
          </div>
        ))}
      </Section>
    </div>
  );
}

export default UserEntitlementsTab;
