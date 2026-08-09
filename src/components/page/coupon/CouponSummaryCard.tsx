import type { CouponIssueMode } from '@/client/coupon';
import dayjs from 'dayjs';

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

function CouponSummaryCard({ values }: { values: CouponSummaryValues }) {
  const identity =
    values.issueMode === 'SHARED'
      ? values.code?.trim().toUpperCase() || '자동 생성 코드'
      : `코드 ${values.count}개 자동 생성`;

  const capacity =
    values.issueMode === 'SHARED'
      ? values.isUnlimited
        ? '인원 무제한'
        : `최대 ${values.maxUseCount}명`
      : `1인 1코드 · 최대 ${values.count}명`;

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
  const period =
    start.isValid() && due.isValid()
      ? `${start.format('YYYY.MM.DD')} 00:00 부터 ${due.format('YYYY.MM.DD')} 23:59 까지`
      : '사용 기간을 입력해주세요.';

  return (
    <div className='rounded-lg border border-border bg-card p-4'>
      <div className='mb-2 font-mono text-xs font-medium uppercase tracking-wide text-slate-600'>
        이렇게 발급됩니다
      </div>
      <div className='space-y-1 text-sm text-slate-700'>
        <div className='font-medium text-slate-900'>
          {values.name.trim() || '(이름 없음)'} · {identity}
        </div>
        <div>{capacity}</div>
        <div>{rewards.length > 0 ? rewards.join(' + ') : '보상을 설정해주세요.'}</div>
        <div className='text-slate-600'>{period}</div>
      </div>
    </div>
  );
}

export default CouponSummaryCard;
