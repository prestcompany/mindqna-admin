import { resolveTestEmails, type ResolveTestEmailsResult } from '@/client/push';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { INTERNAL_TEST_EMAILS_TEXT } from './services/internal-test-emails';
import { toast } from 'sonner';

/** Comma, semicolon, whitespace — however the operator pasted the list out of Slack. */
export function parseEmails(raw: string): string[] {
  // Array.from, not spread: tsconfig targets es5, where spreading a Set fails to compile.
  return Array.from(new Set(raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean)));
}

/** People who will actually get it — an account with no registered device will not. */
export function reachableCount(result: ResolveTestEmailsResult): number {
  return result.resolved.reduce((n, r) => n + r.recipients.filter((p) => p.hasToken).length, 0);
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

/**
 * Sends the message being composed to a handful of staff before it goes to anyone else.
 *
 * The resolution is shown rather than assumed. An email is not a person: it fronts a social
 * account, and one address routinely carries several — a colleague signed in with Google on
 * one phone and Kakao on another is two accounts with two devices. Five real staff addresses
 * resolved to ten accounts in dev and six in production, and one of them had no account in
 * production at all. Picking one account per address would test the wrong device; skipping an
 * unmatched address quietly would look exactly like a test that worked.
 */
export default function PushTestSendPanel({
  disabled,
  onSend,
}: {
  disabled?: boolean;
  /** Sends the composed message to these usernames, immediately. */
  onSend: (userNames: string[], resolved: ResolveTestEmailsResult) => Promise<void> | void;
}) {
  // Prefilled with the team list: the common case is open, confirm, send. Still editable —
  // a one-off check on a single colleague should not mean deleting five lines is the only
  // way in, so 기본 목록 puts it back.
  const [raw, setRaw] = useState(INTERNAL_TEST_EMAILS_TEXT);
  const [result, setResult] = useState<ResolveTestEmailsResult | null>(null);
  const [checking, setChecking] = useState(false);

  const emails = parseEmails(raw);

  const check = async () => {
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
      <DefinitionRow
        label='이메일'
        hint='기본 팀 목록이 채워져 있습니다. 계정이 여러 개인 사람은 전부 받습니다'
      >
        <Textarea
          rows={5}
          placeholder={'name@example.com\nother@example.com'}
          value={raw}
          disabled={disabled}
          onChange={(e) => {
            setRaw(e.target.value);
            // The old resolution describes the old list; keeping it on screen would let the
            // operator send against numbers that no longer match what they typed.
            setResult(null);
          }}
        />
      </DefinitionRow>

      <DefinitionRow label='대상 확인' hint={result ? undefined : '보내기 전에 누구에게 가는지 먼저 확인합니다'}>
        <div className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            <Button type='button' variant='outline' size='sm' disabled={disabled || checking} onClick={check}>
              {checking ? '확인 중…' : '대상 확인'}
            </Button>
            {raw.trim() !== INTERNAL_TEST_EMAILS_TEXT && (
              <Button
                type='button'
                variant='ghost'
                size='sm'
                disabled={disabled}
                onClick={() => {
                  setRaw(INTERNAL_TEST_EMAILS_TEXT);
                  setResult(null);
                }}
              >
                기본 목록으로
              </Button>
            )}
          </div>

          {result && (
            <div className='space-y-2 rounded-lg border border-border p-3'>
              {result.resolved.map((r) => (
                <div key={r.email} className='flex flex-wrap items-baseline gap-x-2 gap-y-1 text-sm'>
                  <span className='font-medium text-foreground'>{r.email}</span>
                  {r.recipients.length === 0 ? (
                    <span className='text-destructive'>계정을 찾을 수 없습니다</span>
                  ) : (
                    <>
                      <span className='text-muted-foreground'>{r.recipients.length}명</span>
                      <span className='text-muted-foreground'>
                        {r.recipients
                          .map(
                            (p) =>
                              `${PROVIDER_LABEL[p.provider] ?? p.provider}${p.hasToken ? '' : ' (기기 없음)'}`,
                          )
                          .join(' · ')}
                      </span>
                    </>
                  )}
                </div>
              ))}

              <p className='border-t border-hairline pt-2 text-sm text-muted-foreground'>
                {reachableCount(result).toLocaleString()}명에게 도달합니다
                {result.userNames.length !== reachableCount(result) &&
                  ` · 기기 없는 계정 ${result.userNames.length - reachableCount(result)}개는 받지 못합니다`}
                {result.unmatched.length > 0 && ` · 찾지 못한 이메일 ${result.unmatched.length}개`}
              </p>
            </div>
          )}
        </div>
      </DefinitionRow>

      {result && result.userNames.length > 0 && (
        <DefinitionRow label='테스트 발송' hint='즉시 발송입니다. 1분 내에 실제 기기로 갑니다'>
          <Button type='button' size='sm' disabled={disabled} onClick={() => onSend(result.userNames, result)}>
            {reachableCount(result).toLocaleString()}명에게 테스트 발송
          </Button>
        </DefinitionRow>
      )}
    </div>
  );
}
