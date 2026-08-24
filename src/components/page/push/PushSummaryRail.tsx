import type { AdminPushItem } from '@/client/push';
import dayjs from 'dayjs';
import { useState } from 'react';
import { estimateDurationMs, estimateRemainingMs, minutes } from './services/push-progress';

type ComposeProps = {
  mode: 'compose';
  target: 'ALL' | 'USER';
  locale: string;
  /** null while a broadcast's server-side count is still in flight — never a placeholder 0. */
  recipientCount: number | null;
  when: string;
  title: string;
  message: string;
  imgUrl: string;
};

type ResultProps = { mode: 'result'; row: AdminPushItem };

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
        <Row
          label='대상'
          value={row.target === 'ALL' ? `전체 · ${row.locale ?? '—'}` : `개인 ${(row.userNames ?? []).length}명`}
        />
        <Row label='도달' value={row.sentCount.toLocaleString()} />
        <Row label='실패' value={row.failedCount.toLocaleString()} />
        {remainingMs !== null && <Row label='예상 잔여' value={`${minutes(remainingMs)}분 남음`} />}
        <Row label='시작' value={row.startedAt ? dayjs(row.startedAt).format('MM.DD HH:mm') : '—'} />
        <Row label='종료' value={row.finishedAt ? dayjs(row.finishedAt).format('MM.DD HH:mm') : '—'} />
        {row.lastError && (
          <div className='rounded-md border border-border p-2 text-xs text-muted-foreground'>{row.lastError}</div>
        )}
      </dl>
    );
  }

  const { target, locale, recipientCount, when, title, message, imgUrl } = props;
  // A flashed "1~1분" while the real count is still loading is worse than no number at
  // all — it teaches the operator that a forty-minute broadcast is a one-minute one.
  const estimate = recipientCount === null ? null : estimateDurationMs(recipientCount);
  // The headcount is the number this rail exists to put in front of the operator: 약 for a
  // broadcast, whose count is a locale-wide estimate, and bare for a per-user send, whose
  // count is the list they just typed. While a broadcast's count is still in flight the
  // rail says who but not how many — same reason the duration line waits.
  const who =
    target === 'ALL'
      ? recipientCount === null
        ? `${locale} 사용자`
        : `${locale} 사용자 약 ${recipientCount.toLocaleString()}명`
      : `지정한 ${(recipientCount ?? 0).toLocaleString()}명`;

  return (
    <div className='space-y-4'>
      <NotificationPreview title={title} message={message} imgUrl={imgUrl} />

      <dl className='space-y-3 text-sm'>
        <Row label='대상' value={who} />
        <Row label='발송' value={when} />
        {/* Tens of minutes is the fact an operator most needs before pressing save. */}
        {estimate && <Row label='예상 소요' value={`${minutes(estimate.minMs)}~${minutes(estimate.maxMs)}분`} />}
      </dl>

      {/* Resident for the whole compose session, not just a line in a confirm step the
          operator reaches after already deciding — a broadcast cannot be recalled once it
          starts sending, only stopped partway, and that has to be visible while they are
          still writing the message, not sprung on them at the last click. */}
      {target === 'ALL' && (
        <p className='rounded-md border border-warning/30 bg-warning/10 p-2 text-xs text-warning-foreground'>
          전체 발송은 시작되면 멈출 수만 있습니다. 이미 보낸 알림은 되돌릴 수 없습니다.
        </p>
      )}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className='flex items-baseline justify-between gap-2'>
      <dt className='text-muted-foreground'>{label}</dt>
      <dd className='tabular-nums text-foreground'>{value}</dd>
    </div>
  );
}

/**
 * What the operator is actually composing: not a form, a notification. Title/body/image as
 * they will reach a device, so a typo or a missing image shows up here before it ships
 * rather than after — the rail earns its 220px by being the one place that can show that.
 */
function NotificationPreview({ title, message, imgUrl }: { title: string; message: string; imgUrl: string }) {
  // Tracks the URL that failed, not a plain boolean, so correcting the field to a new URL
  // gets a fresh attempt instead of staying stuck on the previous failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const trimmedImgUrl = imgUrl.trim();
  const imageBroken = trimmedImgUrl.length > 0 && failedUrl === trimmedImgUrl;
  const showImage = trimmedImgUrl.length > 0 && !imageBroken;

  return (
    <div className='rounded-lg border border-border bg-card p-3'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-xs font-medium text-muted-foreground'>MindQnA</span>
        <span className='text-xs text-muted-foreground'>지금</span>
      </div>
      <div className='mt-1 truncate text-sm font-semibold text-foreground'>
        {title.trim() || <span className='font-normal text-muted-foreground'>제목 없음</span>}
      </div>
      <div className='mt-0.5 line-clamp-2 text-sm text-muted-foreground'>{message.trim() || '내용 없음'}</div>
      {/* An empty field renders nothing here at all — the same shape a real notification
          with no image takes — rather than an <img> with an empty src, which some browsers
          paint as a broken-image glyph. */}
      {showImage && (
        <img
          src={trimmedImgUrl}
          alt=''
          className='mt-2 h-28 w-full rounded-md object-cover'
          onError={() => setFailedUrl(trimmedImgUrl)}
        />
      )}
      {imageBroken && (
        <div className='mt-2 flex h-28 w-full items-center justify-center rounded-md border border-dashed border-border bg-muted text-xs text-muted-foreground'>
          이미지를 불러올 수 없습니다
        </div>
      )}
    </div>
  );
}

export default PushSummaryRail;
