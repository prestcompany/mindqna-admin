import type { AdminPushItem } from '@/client/push';
import { LOCALE_DISPLAY_NAME } from '@/components/shared/form/constants/locale-options';
import dayjs from 'dayjs';
import { useState } from 'react';
import {
  estimateCampaignDurationMs,
  estimateDurationMs,
  estimateRemainingMs,
  formatMinuteRange,
  minutes,
} from './services/push-progress';

type ComposeProps = {
  mode: 'compose';
  target: 'ALL' | 'USER';
  locale: string;
  /** null while a broadcast's server-side count is still in flight — never a placeholder 0. */
  recipientCount: number | null;
  /**
   * Set only for a filtered campaign, and then to the server's own chunk size. A campaign
   * is split across rows the sender claims one per minute, so its wait is the queue rather
   * than FCM — null means an ordinary send, which drains in one go.
   */
  campaignChunkSize?: number | null;
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
          value={
            row.target === 'ALL'
              ? `전체 · ${row.locale ? (LOCALE_DISPLAY_NAME[row.locale] ?? row.locale) : '—'}`
              : `개인 ${(row.userNames ?? []).length}명`
          }
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

  const { target, locale, recipientCount, campaignChunkSize, when, title, message, imgUrl } = props;
  // A flashed "1~1분" while the real count is still loading is worse than no number at
  // all — it teaches the operator that a forty-minute broadcast is a one-minute one.
  const estimate =
    recipientCount === null
      ? null
      : campaignChunkSize
        ? estimateCampaignDurationMs(recipientCount, campaignChunkSize)
        : estimateDurationMs(recipientCount);
  const campaignRows =
    campaignChunkSize && recipientCount !== null
      ? Math.max(1, Math.ceil(recipientCount / campaignChunkSize))
      : null;
  // The headcount is the number this rail exists to put in front of the operator: 약 for a
  // broadcast, whose count is a locale-wide estimate, and bare for a per-user send, whose
  // count is the list they just typed. While a broadcast's count is still in flight the
  // rail says who but not how many — same reason the duration line waits.
  // The select above says 한국어; a rail that says `ko` for the same field makes the
  // operator reconcile two names for one thing.
  const localeName = LOCALE_DISPLAY_NAME[locale] ?? locale;
  const who =
    target === 'ALL'
      ? recipientCount === null
        ? `${localeName} 사용자`
        : `${localeName} 사용자 약 ${recipientCount.toLocaleString()}명`
      : `지정한 ${(recipientCount ?? 0).toLocaleString()}명`;

  return (
    <div className='space-y-4'>
      <NotificationPreview title={title} message={message} imgUrl={imgUrl} />

      <dl className='space-y-3 text-sm'>
        <Row label='대상' value={who} />
        <Row label='발송' value={when} />
        {/* Tens of minutes is the fact an operator most needs before pressing save. */}
        {estimate && <Row label='예상 소요' value={formatMinuteRange(estimate.minMs, estimate.maxMs)} />}
        {/* The row count is why a campaign takes minutes rather than seconds; showing the
            wait without it invites "why is this so slow". */}
        {campaignRows !== null && campaignRows > 1 && <Row label='분할' value={`${campaignRows}개로 나뉘어 발송`} />}
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
 * What the operator is actually composing: not a form, a notification.
 *
 * Rendered the way it will arrive — a card resting on a device ground, app name and
 * delivery time above the copy, the image as the square thumbnail a notification actually
 * shows rather than a full-width banner. A plain bordered box says "field summary"; this
 * says "this is the thing your users will see", which is the difference between an
 * operator proof-reading it and skimming past it.
 */
function NotificationPreview({ title, message, imgUrl }: { title: string; message: string; imgUrl: string }) {
  // Tracks the URL that failed, not a plain boolean, so correcting the field to a new URL
  // gets a fresh attempt instead of staying stuck on the previous failure.
  const [failedUrl, setFailedUrl] = useState<string | null>(null);
  const trimmedImgUrl = imgUrl.trim();
  const imageBroken = trimmedImgUrl.length > 0 && failedUrl === trimmedImgUrl;
  const showImage = trimmedImgUrl.length > 0 && !imageBroken;

  return (
    <div className='rounded-xl bg-foreground/[0.06] p-2.5'>
      <div className='mb-2 text-center text-[11px] font-medium tabular-nums text-muted-foreground'>
        {/* dayjs has no locale registered project-wide, so `A` would render AM/PM. Building
            the meridiem here keeps the fix inside the preview rather than changing every
            date format in the admin. */}
        {`${dayjs().hour() < 12 ? '오전' : '오후'} ${dayjs().format('h:mm')}`}
      </div>

      <div className='rounded-lg bg-card p-2.5 shadow-whisper'>
        <div className='flex items-start gap-2'>
          <div className='min-w-0 flex-1'>
            <div className='text-[10px] font-semibold uppercase tracking-wide text-muted-foreground'>MINDBRIDGE</div>
            <div className='mt-0.5 truncate text-[13px] font-semibold text-foreground'>
              {title.trim() || <span className='font-normal text-faint'>제목 없음</span>}
            </div>
            <div className='mt-0.5 line-clamp-2 text-[12px] leading-snug text-muted-foreground'>
              {message.trim() || '내용 없음'}
            </div>
          </div>

          {/* A notification shows its image as a small square beside the copy, not as a
              banner beneath it — matching that is what makes a wrong crop visible here. */}
          {showImage && (
            <img
              src={trimmedImgUrl}
              alt=''
              className='h-11 w-11 shrink-0 rounded-md object-cover'
              onError={() => setFailedUrl(trimmedImgUrl)}
            />
          )}
          {(imageBroken || !showImage) && (
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-center text-[9px] leading-tight ${
                imageBroken
                  ? 'border border-dashed border-destructive/40 bg-destructive/10 text-destructive'
                  : 'bg-muted text-faint'
              }`}
            >
              {imageBroken ? '불러오기 실패' : '이미지 없음'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default PushSummaryRail;
