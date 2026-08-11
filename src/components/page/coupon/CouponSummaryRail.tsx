import type { CouponIssueMode } from '@/client/coupon';
import dayjs from 'dayjs';
import type { ReactNode } from 'react';

export type CouponSummaryValues = {
  name: string;
  issueMode: CouponIssueMode;
  code?: string;
  count: number;
  maxUseCount: number;
  isUnlimited: boolean;
  startAt: string;
  dueAt: string;
  isPaid: boolean;
  reward: number;
  ticketCount: number;
  ticketDueDayNum: number;
};

type Props = {
  values: CouponSummaryValues;
  mode?: 'create' | 'edit';
  /** Constraints that apply to this specific coupon — locked rewards, an ended period. */
  notices?: ReactNode;
};

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-baseline justify-between gap-3 border-b border-border py-1.5 last:border-b-0'>
      <span className='shrink-0 text-xs text-slate-500'>{label}</span>
      <span className='truncate text-right text-xs font-medium text-slate-900'>{value}</span>
    </div>
  );
}

/**
 * The form's result, pinned beside the fields rather than summarised in a footer line.
 * Editing is a sequence of small decisions whose combined effect is easy to lose track
 * of; keeping the outcome in one fixed place means it never has to be reconstructed.
 */
function CouponSummaryRail({ values, mode = 'create', notices }: Props) {
  const isShared = values.issueMode === 'SHARED';

  const code = isShared
    ? values.code?.trim().toUpperCase() || '자동 생성'
    : `${values.count}장${mode === 'edit' ? '' : ' 자동'}`;

  const usage = isShared ? (values.isUnlimited ? '인원 무제한' : `최대 ${values.maxUseCount}명`) : '1인 1회';

  const rewards =
    [
      values.reward > 0 ? `${values.isPaid ? '스타' : '하트'} ${values.reward}` : null,
      values.ticketCount > 0
        ? `프리미엄 ${values.ticketDueDayNum > 0 ? `${values.ticketDueDayNum}일` : '평생'}${
            values.ticketCount > 1 ? ` ×${values.ticketCount}` : ''
          }`
        : null,
    ]
      .filter(Boolean)
      .join(' + ') || '미설정';

  const start = dayjs(values.startAt);
  const due = dayjs(values.dueAt);
  const period = start.isValid() && due.isValid() ? `${start.format('M.D')} – ${due.format('M.D')}` : '미설정';

  return (
    <aside className='flex min-h-0 flex-col gap-3 overflow-y-auto border-l border-border bg-muted/40 p-4'>
      <div>
        {/* 12px is DESIGN.md's floor for labels and captions; the mono eyebrow token is
            12px too, so this is the smallest type the system allows here. */}
        <div className='font-mono text-xs font-medium uppercase tracking-wider text-slate-600'>
          {mode === 'edit' ? '이렇게 저장됩니다' : '이렇게 발급됩니다'}
        </div>
        <div className='mt-1.5 break-words text-sm font-semibold tracking-heading text-slate-900'>
          {values.name.trim() || <span className='font-normal text-slate-400'>이름 없음</span>}
        </div>
      </div>

      <div>
        <Line label='코드' value={code} />
        <Line label='사용' value={usage} />
        <Line label='보상' value={rewards} />
        <Line label='기간' value={period} />
      </div>

      {notices}
    </aside>
  );
}

export default CouponSummaryRail;
