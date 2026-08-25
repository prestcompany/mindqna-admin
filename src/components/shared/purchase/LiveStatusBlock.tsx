import { getUserSubscriptionStatus } from '@/client/user';
import type { LiveSubscriptionRow, LiveSubscriptionStatus } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2, RefreshCw } from 'lucide-react';

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

function LiveStatusBlock({ username }: { username: string }) {
  const live = useQuery({
    queryKey: ['user-subscription-status', username],
    queryFn: () => getUserSubscriptionStatus(username),
    enabled: false,
  });

  return (
    <div className='space-y-3 rounded-lg border border-border bg-canvas p-3'>
      <div className='space-y-2'>
        <div className='text-xs text-muted-foreground'>
          평상시 값은 5분 주기 동기화입니다. 현재 스토어 상태를 확인하려면 아래 버튼을 누르세요.
        </div>
        <Button
          type='button'
          variant='outline'
          size='sm'
          className='h-8 w-full sm:w-auto'
          onClick={() => live.refetch()}
          disabled={live.isFetching}
        >
          {live.isFetching ? <Loader2 className='h-3.5 w-3.5 animate-spin' /> : <RefreshCw className='h-3.5 w-3.5' />}
          스토어 실시간 확인
        </Button>
      </div>

      {live.isError ? (
        <div className='text-xs text-destructive'>실시간 조회에 실패했습니다. 잠시 후 다시 시도하세요.</div>
      ) : live.data ? (
        live.data.length === 0 ? (
          <div className='text-xs text-muted-foreground'>구독 레코드가 없습니다.</div>
        ) : (
          <div className='space-y-2'>
            <div className='flex items-center justify-between'>
              <h4 className='text-xs font-semibold text-muted-foreground'>스토어 실시간</h4>
              {live.dataUpdatedAt > 0 ? (
                <span className='text-xs tabular-nums text-muted-foreground'>
                  {dayjs(live.dataUpdatedAt).format('HH:mm:ss')} 기준
                </span>
              ) : null}
            </div>
            {live.data.map((row: LiveSubscriptionRow) => {
              const meta = LIVE_STATUS_META[row.status];
              return (
                <div
                  key={`${row.platform}-${row.id}`}
                  className='flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5'
                >
                  <Badge variant='softNeutral' className='w-12 shrink-0 justify-center uppercase'>
                    {row.platform}
                  </Badge>
                  <div className='min-w-0 flex-1'>
                    <div className='truncate text-sm font-medium text-foreground'>{row.productId}</div>
                    <div className='truncate text-xs text-muted-foreground'>
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

export default LiveStatusBlock;
