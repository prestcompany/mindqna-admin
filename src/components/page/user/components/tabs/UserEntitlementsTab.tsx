import { getUserEntitlements } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import EntitlementRow from '@/components/shared/purchase/EntitlementRow';
import LiveStatusBlock from '@/components/shared/purchase/LiveStatusBlock';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import type { ReactNode } from 'react';

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className='space-y-2'>
      <h4 className='text-xs font-semibold text-slate-600'>
        {title} <span className='tabular-nums text-slate-500'>{count}</span>
      </h4>
      <div className='space-y-3'>{children}</div>
    </section>
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
      <div className='space-y-4'>
        <LiveStatusBlock username={username} />
        <Card className='bg-card'>
          <CardContent className='py-8 text-center text-sm text-muted-foreground'>
            DB에 저장된 구독/권한 내역이 없습니다.
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <LiveStatusBlock username={username} />

      <div className='border-t border-slate-100' />

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
            className='flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-4 py-3'
          >
            <Badge variant='softNeutral' className='w-16 shrink-0 justify-center'>
              구독
            </Badge>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium text-slate-900'>{s.productId}</div>
              <div className='truncate text-xs text-slate-600'>
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
