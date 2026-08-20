import type { AdminPushItem } from '@/client/push';
import dayjs from 'dayjs';
import { estimateDurationMs, estimateRemainingMs } from './services/push-progress';

type ComposeProps = {
  mode: 'compose';
  target: 'ALL' | 'USER';
  locale: string;
  recipientCount: number;
  when: string;
};

type ResultProps = { mode: 'result'; row: AdminPushItem };

function minutes(ms: number) {
  return Math.max(1, Math.round(ms / 60_000));
}

function PushSummaryRail(props: ComposeProps | ResultProps) {
  if (props.mode === 'result') {
    const { row } = props;
    // Only meaningful mid-send: before anything is processed the function returns null,
    // and after the row leaves SENDING the remaining count no longer means anything.
    const remainingMs =
      row.status === 'SENDING'
        ? estimateRemainingMs({
            processed: row.sentCount + row.failedCount,
            targetCount: row.targetCount,
            startedAt: row.startedAt,
            now: new Date(),
          })
        : null;

    return (
      <dl className='space-y-3 text-sm'>
        <Row label='대상' value={row.target === 'ALL' ? `전체 · ${row.locale ?? '—'}` : `개인 ${(row.userNames ?? []).length}명`} />
        <Row label='도달' value={row.sentCount.toLocaleString()} />
        <Row label='실패' value={row.failedCount.toLocaleString()} />
        {remainingMs !== null && <Row label='예상 잔여' value={`${minutes(remainingMs)}분 남음`} />}
        <Row label='시작' value={row.startedAt ? dayjs(row.startedAt).format('MM.DD HH:mm') : '—'} />
        <Row label='종료' value={row.finishedAt ? dayjs(row.finishedAt).format('MM.DD HH:mm') : '—'} />
        {row.lastError && (
          <div className='rounded-md border border-border p-2 text-xs text-slate-600'>{row.lastError}</div>
        )}
      </dl>
    );
  }

  const { target, locale, recipientCount, when } = props;
  const estimate = estimateDurationMs(recipientCount);
  const who = target === 'ALL' ? `${locale} 사용자` : `지정한 ${recipientCount}명`;

  return (
    <div className='space-y-3 text-sm'>
      <p className='text-slate-900'>
        {who}에게 {when}에 발송합니다.
      </p>
      {/* Tens of minutes is the fact an operator most needs before pressing save. */}
      <p className='text-xs text-slate-600'>
        예상 소요 {minutes(estimate.minMs)}~{minutes(estimate.maxMs)}분
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-baseline justify-between gap-2'>
      <dt className='text-slate-600'>{label}</dt>
      <dd className='tabular-nums text-slate-900'>{value}</dd>
    </div>
  );
}

export default PushSummaryRail;
