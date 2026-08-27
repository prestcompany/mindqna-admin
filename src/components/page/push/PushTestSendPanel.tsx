import { resolveTestEmails, type ResolveTestEmailsResult } from '@/client/push';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { INTERNAL_TEST_EMAILS_TEXT } from './services/internal-test-emails';
import { toast } from 'sonner';

/** Comma, semicolon, whitespace: however the operator pasted the list out of Slack. */
export function parseEmails(raw: string): string[] {
  // Array.from, not spread: tsconfig targets es5, where spreading a Set fails to compile.
  return Array.from(new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)));
}

/** People who will actually get it. An account with no registered device will not. */
export function reachableCount(result: ResolveTestEmailsResult): number {
  return result.resolved.reduce((n, r) => n + r.recipients.filter((p) => p.hasToken).length, 0);
}

/** Accounts that are targeted but have nowhere to arrive. */
export function deviceLessCount(result: ResolveTestEmailsResult): number {
  return result.userNames.length - reachableCount(result);
}

const PROVIDER_LABEL: Record<string, string> = {
  GOOGLE: '구글',
  KAKAO: '카카오',
  APPLE: '애플',
  LINE: '라인',
  HUAWEI: '화웨이',
  NAVER: '네이버',
  FACEBOOK: '페이스북',
};

const providerText = (p: { provider: string; hasToken: boolean }) =>
  `${PROVIDER_LABEL[p.provider] ?? p.provider}${p.hasToken ? '' : ' (기기 미등록)'}`;

/** One summary figure. Numbers sit on the right so the rows read as a column, not a sentence. */
function SummaryLine({ label, value, danger }: { label: string; value: string; danger?: boolean }) {
  return (
    <div className='flex items-baseline justify-between gap-3'>
      <span className='text-muted-foreground'>{label}</span>
      <span className={`shrink-0 tabular-nums ${danger ? 'text-destructive' : 'text-foreground'}`}>{value}</span>
    </div>
  );
}

/**
 * Sends the message being composed to a few teammates before it goes to anyone else.
 *
 * The resolution is shown rather than assumed. An email is not a person: it fronts a social
 * account, and one address routinely carries several. A teammate signed in with Google on one
 * phone and Kakao on another is two accounts with two devices. Five real addresses resolved to
 * ten accounts in dev and six in production, and one of them had no production account at all.
 * Picking one account per address would test the wrong device, and skipping an unmatched
 * address quietly would look exactly like a test that worked.
 */
export default function PushTestSendPanel({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  /** Sends the composed message to these usernames, immediately. */
  onSend: (userNames: string[], resolved: ResolveTestEmailsResult) => Promise<void> | void;
}) {
  // Prefilled with the team list, so the usual path is open, confirm, send. Still editable,
  // and the reset puts it back when a one-off check leaves the field trimmed down.
  const [raw, setRaw] = useState(INTERNAL_TEST_EMAILS_TEXT);
  const [result, setResult] = useState<ResolveTestEmailsResult | null>(null);
  const [checking, setChecking] = useState(false);

  const edited = raw.trim() !== INTERNAL_TEST_EMAILS_TEXT;

  const check = async () => {
    const emails = parseEmails(raw);
    if (emails.length === 0) {
      toast.error('이메일을 한 개 이상 입력해주세요');
      return;
    }
    setChecking(true);
    try {
      setResult(await resolveTestEmails(emails));
    } catch {
      toast.error('대상을 확인하지 못했습니다');
    } finally {
      setChecking(false);
    }
  };

  return (
    <div>
      <DefinitionRow label='이메일' hint='팀 기본 목록이 채워져 있습니다. 쉼표나 줄바꿈으로 구분합니다'>
        <div className='space-y-2'>
          <Textarea
            rows={5}
            className='font-mono text-sm leading-relaxed'
            placeholder={'name@example.com\nother@example.com'}
            value={raw}
            disabled={disabled}
            onChange={(e) => {
              setRaw(e.target.value);
              // The old resolution describes the old list. Leaving it on screen would let the
              // operator send against numbers that no longer match what they typed.
              setResult(null);
            }}
          />
          {edited && (
            <Button
              type='button'
              variant='ghost'
              size='sm'
              className='h-8 px-2'
              disabled={disabled}
              onClick={() => {
                setRaw(INTERNAL_TEST_EMAILS_TEXT);
                setResult(null);
              }}
            >
              기본 목록으로 되돌리기
            </Button>
          )}
        </div>
      </DefinitionRow>

      <DefinitionRow label='받는 사람' hint={result ? undefined : '보내기 전에 누가 받는지 확인합니다'}>
        <div className='space-y-3'>
          <Button type='button' variant='outline' size='sm' disabled={disabled || checking} onClick={check}>
            {checking ? '확인 중' : '대상 확인'}
          </Button>

          {result && (
            <div className='overflow-hidden rounded-lg border border-border'>
              <ul className='divide-y divide-hairline-soft'>
                {result.resolved.map((r) => {
                  const missing = r.recipients.length === 0;
                  const reachable = r.recipients.filter((p) => p.hasToken).length;
                  return (
                    <li key={r.email} className='space-y-1 px-3 py-2.5'>
                      <div className='flex items-baseline justify-between gap-3'>
                        <span className='truncate font-mono text-sm text-foreground'>{r.email}</span>
                        <span
                          className={`shrink-0 text-sm ${
                            missing ? 'text-destructive' : 'tabular-nums text-muted-foreground'
                          }`}
                        >
                          {missing ? '계정 없음' : `${reachable}명`}
                        </span>
                      </div>
                      {!missing && (
                        <p className='text-xs leading-relaxed text-muted-foreground'>
                          {r.recipients.map(providerText).join(', ')}
                        </p>
                      )}
                    </li>
                  );
                })}
              </ul>

              <div className='space-y-1 border-t border-hairline bg-muted/40 px-3 py-2.5 text-sm'>
                <SummaryLine label='받는 사람' value={`${reachableCount(result).toLocaleString()}명`} />
                {deviceLessCount(result) > 0 && (
                  <SummaryLine label='기기 미등록으로 제외' value={`${deviceLessCount(result)}명`} />
                )}
                {result.unmatched.length > 0 && (
                  <SummaryLine label='계정을 찾지 못함' value={`${result.unmatched.length}건`} danger />
                )}
              </div>
            </div>
          )}
        </div>
      </DefinitionRow>

      {result && result.userNames.length > 0 && (
        <DefinitionRow label='테스트 발송' hint='즉시 발송됩니다. 1분 안에 실제 기기로 도착합니다'>
          <Button type='button' size='sm' disabled={disabled} onClick={() => onSend(result.userNames, result)}>
            {reachableCount(result).toLocaleString()}명에게 테스트 발송
          </Button>
        </DefinitionRow>
      )}
    </div>
  );
}
