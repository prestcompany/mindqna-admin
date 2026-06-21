import { getSpaceCardEligibility } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Check, Loader2, X } from 'lucide-react';

function SpaceCardEligibilityPanel({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-card-eligibility', spaceId],
    queryFn: () => getSpaceCardEligibility(spaceId),
    enabled: active && !!spaceId,
  });

  if (isFetching && !data) {
    return (
      <div className='flex min-h-[96px] items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;

  const blockedReasons = data.checks.filter((c) => !c.passed);

  return (
    <section className='space-y-2'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <h3 className='text-base font-semibold text-slate-900'>카드 발급 상태</h3>
        <Badge variant={data.canIssue ? 'softSuccess' : 'softWarning'}>
          {data.canIssue ? '발급 가능' : '발급 차단됨'}
        </Badge>
        <span className='text-xs text-slate-500'>
          현재 #{data.cardOrder} · 활성 멤버 {data.activeMembers}명
          {data.nextGenAt ? ` · 다음 예정 ${dayjs(data.nextGenAt).format('YY.MM.DD')}` : ''}
        </span>
      </div>

      {/* 차단 사유를 맨 위에서 한눈에 */}
      {blockedReasons.length ? (
        <div className='rounded-xl border border-amber-200 bg-amber-50 px-4 py-3'>
          <div className='text-xs font-medium text-amber-700'>차단 사유</div>
          <ul className='mt-1 space-y-0.5'>
            {blockedReasons.map((c) => (
              <li key={c.key} className='text-sm font-medium text-amber-800'>
                {c.detail ?? c.label}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* 전체 게이트 체크리스트 */}
      <div className='divide-y divide-slate-100 rounded-xl border border-slate-200/80 bg-white px-4 shadow-sm'>
        {data.checks.map((check) => (
          <div key={check.key} className='flex items-start gap-3 py-3'>
            <span
              className={
                check.passed
                  ? 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'
                  : 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600'
              }
            >
              {check.passed ? <Check className='h-3 w-3' /> : <X className='h-3 w-3' />}
            </span>
            <div className='min-w-0'>
              <div className='text-sm font-medium text-slate-900'>{check.label}</div>
              {!check.passed && check.detail ? <div className='text-xs text-slate-500'>{check.detail}</div> : null}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

export default SpaceCardEligibilityPanel;
