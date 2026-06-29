import { getUserEntitlements, getUserSubscriptionStatus } from '@/client/user';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import type { LiveSubscriptionRow, LiveSubscriptionStatus, UserEntitlementTicket } from '@/client/types';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2, RefreshCw } from 'lucide-react';
import type { ReactNode } from 'react';

const LIVE_STATUS_META: Record<
  LiveSubscriptionStatus,
  { label: string; variant: 'softSuccess' | 'softWarning' | 'softNeutral' | 'softDanger' }
> = {
  active: { label: '활성', variant: 'softSuccess' },
  grace: { label: '결제유예', variant: 'softWarning' },
  billingRetry: { label: '결제재시도', variant: 'softWarning' },
  expired: { label: '만료', variant: 'softNeutral' },
  canceled: { label: '자동갱신 해지', variant: 'softNeutral' },
  revoked: { label: '환불/취소', variant: 'softDanger' },
  error: { label: '조회 실패', variant: 'softDanger' },
};

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

function LiveStatusBlock({ username }: { username: string }) {
  const live = useQuery({
    queryKey: ['user-subscription-status', username],
    queryFn: () => getUserSubscriptionStatus(username),
    enabled: false,
  });

  return (
    <div className='space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3'>
      <div className='space-y-2'>
        <div className='text-xs text-slate-500'>
          평상시 값은 5분 주기 동기화입니다. 현재 스토어 상태를 확인하려면 아래 버튼을 누르세요.
        </div>
        <Button
          type='button'
          variant='outline'
          size='default'
          className='w-full sm:w-auto'
          onClick={() => live.refetch()}
          disabled={live.isFetching}
        >
          {live.isFetching ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5' />}
          스토어 실시간 확인
        </Button>
      </div>

      {live.isError ? (
        <div className='text-xs text-rose-600'>실시간 조회에 실패했습니다. 잠시 후 다시 시도하세요.</div>
      ) : live.data ? (
        live.data.length === 0 ? (
          <div className='text-xs text-slate-500'>구독 레코드가 없습니다.</div>
        ) : (
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-semibold text-slate-500'>스토어 실시간</h4>
              {live.dataUpdatedAt > 0 ? (
                <span className='text-[11px] tabular-nums text-slate-500'>
                  {dayjs(live.dataUpdatedAt).format('HH:mm:ss')} 기준
                </span>
              ) : null}
            </div>
            {live.data.map((row: LiveSubscriptionRow) => {
              const meta = LIVE_STATUS_META[row.status];
              return (
                <div
                  key={`${row.platform}-${row.id}`}
                  className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-sm'
                >
                  <Badge variant='softNeutral' className='w-12 shrink-0 justify-center uppercase'>
                    {row.platform}
                  </Badge>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-medium text-slate-900'>{row.productId}</div>
                    <div className='truncate text-[11px] text-slate-500'>
                      {row.expiresAt ? `만료 ${dayjs(row.expiresAt).format('YYYY.MM.DD')}` : '만료 정보 없음'}
                      {row.autoRenew === null ? '' : row.autoRenew ? ' · 자동갱신 ON' : ' · 자동갱신 OFF'}
                    </div>
                  </div>
                  <Badge variant={meta.variant} className='shrink-0'>
                    {meta.label}
                  </Badge>
                </div>
              );
            })}
          </div>
        )
      ) : null}
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
