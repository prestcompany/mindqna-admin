import { getSpaceCardEligibility } from '@/client/space';
import type { SpaceDetail } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Check, Loader2, X } from 'lucide-react';
import type { ReactNode } from 'react';

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='min-w-0'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='mt-0.5 truncate text-sm font-medium tabular-nums text-slate-900'>{value}</div>
    </div>
  );
}

function SpaceCardEligibilityPanel({
  spaceId,
  active,
  detail,
}: {
  spaceId: string;
  active: boolean;
  detail: SpaceDetail;
}) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-card-eligibility', spaceId],
    queryFn: () => getSpaceCardEligibility(spaceId),
    enabled: active && !!spaceId,
  });

  if (isFetching && !data) {
    return (
      <div className='flex min-h-[120px] items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;

  const blockedReasons = data.checks.filter((c) => !c.passed);
  const latestText = detail.latestCardIssuedAt
    ? dayjs(detail.latestCardIssuedAt).format('YY.MM.DD HH:mm')
    : '발급 없음';
  const participationText = data.lastCard ? `${data.lastCard.replyCount}/${data.activeMembers} 답변` : '첫 카드';

  return (
    <section className='space-y-3'>
      <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
        <h3 className='text-base font-semibold text-slate-900'>카드 발급 상태</h3>
        <Badge variant={data.canIssue ? 'softSuccess' : 'softWarning'}>
          {data.canIssue ? '발급 가능' : '발급 차단됨'}
        </Badge>
      </div>

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* 카드 현황 — 상세 정보에 흩어져 있던 카드 항목을 취합 */}
        <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
          <div className='mb-3 text-xs font-medium text-slate-500'>카드 현황</div>
          <div className='grid grid-cols-2 gap-x-4 gap-y-3'>
            <Metric label='현재 카드' value={`#${data.cardOrder}`} />
            <Metric label='활성 멤버' value={`${data.activeMembers}명`} />
            <Metric label='발급 시각' value={detail.spaceInfo?.noticeTime || '-'} />
            <Metric label='다음 생성 기준' value={data.nextGenAt ?? '-'} />
            <Metric label='최근 발급' value={latestText} />
            <Metric label='직전 카드 참여' value={participationText} />
          </div>
        </div>

        {/* 발급 조건 — 차단 사유 + 게이트 체크리스트 */}
        <div className='rounded-xl border border-slate-200/80 bg-white shadow-sm'>
          <div className='px-4 pt-3 text-xs font-medium text-slate-500'>발급 조건</div>
          {blockedReasons.length ? (
            <div className='mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2'>
              <ul className='space-y-0.5'>
                {blockedReasons.map((c) => (
                  <li key={c.key} className='text-sm font-medium text-amber-800'>
                    {c.detail ?? c.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className='mt-1 divide-y divide-slate-100 px-4'>
            {data.checks.map((check) => (
              <div key={check.key} className='flex items-start gap-3 py-2.5'>
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
        </div>
      </div>
    </section>
  );
}

export default SpaceCardEligibilityPanel;
