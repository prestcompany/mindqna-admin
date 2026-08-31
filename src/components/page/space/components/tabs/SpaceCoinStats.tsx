import { getSpaceCoinStats } from '@/client/space';
import type { CoinStatWindow } from '@/client/types';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ArrowDownRight, ArrowUpRight, Loader2, Minus } from 'lucide-react';

function ChangeRate({ rate }: { rate: number | null }) {
  if (rate === null) {
    return (
      <span className='inline-flex items-center gap-0.5 text-xs text-muted-foreground'>
        <Minus className='h-3 w-3' />
        직전 0
      </span>
    );
  }
  const up = rate >= 0;
  return (
    <span
      className={cn('inline-flex items-center gap-0.5 text-xs font-medium', up ? 'text-success' : 'text-destructive')}
    >
      {up ? <ArrowUpRight className='h-3 w-3' /> : <ArrowDownRight className='h-3 w-3' />}
      {up ? '+' : ''}
      {Math.round(rate * 100)}%
    </span>
  );
}

function StatCard({ label, window }: { label: string; window: CoinStatWindow }) {
  const netUp = window.current.net >= 0;
  return (
    <div className='rounded-lg border border-border bg-white p-4'>
      <div className='flex items-center justify-between'>
        <span className='text-xs font-medium text-muted-foreground'>{label}</span>
        <ChangeRate rate={window.changeRate} />
      </div>
      <div className={cn('mt-1 text-2xl font-semibold tabular-nums', netUp ? 'text-foreground' : 'text-destructive')}>
        {netUp ? '+' : ''}
        {window.current.net.toLocaleString()}
      </div>
      <div className='mt-1 flex items-center gap-2 text-xs tabular-nums text-muted-foreground'>
        <span className='text-success'>지급 {window.current.given.toLocaleString()}</span>
        <span className='text-faint'>·</span>
        <span className='text-destructive'>사용 {window.current.used.toLocaleString()}</span>
      </div>
    </div>
  );
}

function SpaceCoinStats({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-coin-stats', spaceId],
    queryFn: () => getSpaceCoinStats(spaceId),
    enabled: active && !!spaceId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[96px] items-center justify-center rounded-lg border border-border bg-white'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
      <StatCard label='최근 7일 순증 (직전 7일 대비)' window={data.week} />
      <StatCard label='최근 30일 순증 (직전 30일 대비)' window={data.month} />
    </div>
  );
}

export default SpaceCoinStats;
