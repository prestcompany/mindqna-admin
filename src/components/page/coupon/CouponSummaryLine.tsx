import type { CouponIssueMode } from '@/client/coupon';
import dayjs from 'dayjs';

export type CouponSummaryValues = {
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

/**
 * One line, no box. It sits directly above the submit button and restates what pressing
 * it will do, so it has to be readable at a glance — a bordered card there is a second
 * container competing with the action bar it lives in.
 */
function CouponSummaryLine({ values, mode = 'create' }: { values: CouponSummaryValues; mode?: 'create' | 'edit' }) {
  const isShared = values.issueMode === 'SHARED';

  const identity = isShared
    ? values.code?.trim().toUpperCase() || '코드 자동 생성'
    : `코드 ${values.count}장${mode === 'edit' ? '' : ' 자동 생성'}`;

  const capacity = isShared ? (values.isUnlimited ? '인원 무제한' : `최대 ${values.maxUseCount}명`) : '1인 1회';

  const rewards = [
    values.reward > 0 ? `${values.isPaid ? '스타' : '하트'} ${values.reward}` : null,
    values.ticketCount > 0
      ? `프리미엄 ${values.ticketDueDayNum > 0 ? `${values.ticketDueDayNum}일` : '평생'}${
          values.ticketCount > 1 ? ` ×${values.ticketCount}` : ''
        }`
      : null,
  ].filter(Boolean);

  const start = dayjs(values.startAt);
  const due = dayjs(values.dueAt);
  const period = start.isValid() && due.isValid() ? `${start.format('M.D')} – ${due.format('M.D')}` : null;

  const parts = [identity, capacity, ...(rewards.length > 0 ? [rewards.join(' + ')] : ['보상 미설정']), period].filter(
    Boolean,
  );

  return (
    <p className='truncate text-xs text-slate-600'>
      {parts.map((part, index) => (
        <span key={index}>
          {index > 0 && <span className='mx-1.5 text-slate-300'>·</span>}
          <span className={index === 0 ? 'font-medium text-slate-900' : undefined}>{part}</span>
        </span>
      ))}
    </p>
  );
}

export default CouponSummaryLine;
