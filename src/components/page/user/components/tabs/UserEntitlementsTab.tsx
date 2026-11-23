import { getUserEntitlements } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import EntitlementRow from '@/components/shared/purchase/EntitlementRow';
import LiveStatusBlock from '@/components/shared/purchase/LiveStatusBlock';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useState, type ReactNode } from 'react';
import SubscriptionRebindDialog from '../SubscriptionRebindDialog';

function Section({ title, count, children }: { title: string; count: number; children: ReactNode }) {
  if (count === 0) return null;
  return (
    <section className='space-y-2'>
      <h4 className='text-xs font-semibold text-muted-foreground'>
        {title} <span className='tabular-nums text-muted-foreground'>{count}</span>
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
  const [rebindOpen, setRebindOpen] = useState(false);

  // 탈퇴 계정에 남은 구독을 이 계정으로 옮기는 CS 작업. 내역이 없어도(옮겨 받을 사람이라) 보여야 한다.
  const rebind = (
    <div className='flex items-center justify-between gap-3 rounded-lg border border-dashed border-border px-4 py-3'>
      <p className='text-xs text-muted-foreground'>
        탈퇴한 계정에 남은 구독의 실제 결제자가 이 계정이면, 확인 후 구독을 옮길 수 있습니다.
      </p>
      <Button type='button' variant='outline' size='sm' onClick={() => setRebindOpen(true)}>
        구독 다시 묶기
      </Button>
      <SubscriptionRebindDialog username={username} open={rebindOpen} onOpenChange={setRebindOpen} />
    </div>
  );

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
        {rebind}
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
      {rebind}

      <div className='border-t border-border' />

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
          <div key={`s-${s.id}`} className='flex items-center gap-3 rounded-lg border border-border bg-white px-4 py-3'>
            <Badge variant='softNeutral' className='w-16 shrink-0 justify-center'>
              구독
            </Badge>
            <div className='min-w-0 flex-1'>
              <div className='truncate text-sm font-medium text-foreground'>{s.productId}</div>
              <div className='truncate text-xs text-muted-foreground'>
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
