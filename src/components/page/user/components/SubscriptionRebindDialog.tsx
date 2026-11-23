import { getUserProfiles, rebindSubscription } from '@/client/user';
import type { RebindPlatform, SubscriptionRebindResult } from '@/client/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  type RebindDraft,
  rebindableSpaces,
  rebindErrorMessage,
  rebindOutcomeLabel,
  rebindProblems,
  toRebindBody,
} from '../services/subscription-rebind';

const PLATFORMS: { value: RebindPlatform; label: string; idHint: string }[] = [
  { value: 'IOS', label: 'iOS', idHint: 'originalTransactionId' },
  { value: 'AOS', label: 'Android', idHint: '구매 토큰(purchaseToken)' },
];

const EMPTY: RebindDraft = { platform: null, transactionId: '', spaceId: '' };

/** 탈퇴한 계정의 살아 있는 구독을, CS 가 확인한 실제 결제자(이 사용자)에게 옮긴다. */
function SubscriptionRebindDialog({
  username,
  open,
  onOpenChange,
}: {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const { data: profiles, isFetching } = useQuery({
    queryKey: ['user-profiles', username],
    queryFn: () => getUserProfiles(username),
    enabled: open && !!username,
  });
  const spaces = rebindableSpaces(profiles ?? []);
  const [draft, setDraft] = useState<RebindDraft>(EMPTY);
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<SubscriptionRebindResult | null>(null);

  const close = (next: boolean) => {
    if (!next) {
      setDraft(EMPTY);
      setResult(null);
    }
    onOpenChange(next);
  };

  const ask = () => {
    const problems = rebindProblems(draft);
    if (problems.length) {
      toast.warning(problems.join(' '));
      return;
    }
    setConfirming(true);
  };

  const run = async () => {
    setConfirming(false);
    setSaving(true);
    try {
      const res = await rebindSubscription(username, toRebindBody(draft));
      setResult(res);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-entitlements', username] }),
        queryClient.invalidateQueries({ queryKey: ['user-subscription-status', username] }),
      ]);
    } catch (err) {
      toast.error(rebindErrorMessage(err));
    }
    setSaving(false);
  };

  const platform = PLATFORMS.find((p) => p.value === draft.platform);
  const spaceLabel = spaces.find((s) => s.spaceId === draft.spaceId)?.label;
  const resultSpace = result?.spaceId
    ? (spaces.find((s) => s.spaceId === result.spaceId)?.label ?? result.spaceId)
    : '-';

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>구독 다시 묶기</DialogTitle>
            <DialogDescription>
              탈퇴한 계정에 남은 살아 있는 구독을, 본인 확인을 마친 실제 결제자인 이 계정({username})으로 옮깁니다. 원래
              계정이 살아 있으면 계정 이관을 쓰세요.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <div className='space-y-2 rounded-lg border border-border bg-canvas p-4 text-sm'>
              <p className='font-medium text-foreground'>{rebindOutcomeLabel(result.outcome)}</p>
              <dl className='grid grid-cols-[96px_1fr] gap-y-1 text-muted-foreground'>
                <dt>상품</dt>
                <dd className='text-foreground'>{result.productId}</dd>
                <dt>공간</dt>
                <dd className='text-foreground'>{resultSpace}</dd>
                <dt>만료</dt>
                <dd className='tabular-nums text-foreground'>{dayjs(result.expiresAt).format('YYYY-MM-DD HH:mm')}</dd>
              </dl>
            </div>
          ) : (
            <div className='space-y-4'>
              <div className='space-y-1.5'>
                <Label className='text-xs text-muted-foreground'>플랫폼</Label>
                <RadioGroup
                  value={draft.platform ?? ''}
                  onValueChange={(v) => setDraft((p) => ({ ...p, platform: v as RebindPlatform }))}
                  aria-label='플랫폼'
                  className='grid grid-cols-2 gap-2'
                >
                  {PLATFORMS.map((opt) => (
                    <div key={opt.value}>
                      <RadioGroupItem value={opt.value} id={`rebind-${opt.value}`} className='peer sr-only' />
                      <Label
                        htmlFor={`rebind-${opt.value}`}
                        className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
                      >
                        {opt.label}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='rebind-transaction' className='text-xs text-muted-foreground'>
                  거래 id{platform ? ` (${platform.idHint})` : ''}
                </Label>
                <Input
                  id='rebind-transaction'
                  value={draft.transactionId}
                  onChange={(e) => setDraft((p) => ({ ...p, transactionId: e.target.value }))}
                  className='font-mono'
                />
                <p className='text-xs text-muted-foreground'>
                  서버 로그 iap.claim_deleted_owner 줄이나 결제자의 스토어 영수증에서 찾습니다.
                </p>
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs text-muted-foreground'>지급할 공간</Label>
                <Select value={draft.spaceId} onValueChange={(v) => setDraft((p) => ({ ...p, spaceId: v }))}>
                  <SelectTrigger aria-label='지급할 공간'>
                    <SelectValue placeholder={isFetching ? '공간을 불러오는 중' : '공간 고르기'} />
                  </SelectTrigger>
                  <SelectContent>
                    {spaces.map((s) => (
                      <SelectItem key={s.spaceId} value={s.spaceId}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {!isFetching && profiles && spaces.length === 0 ? (
                  <p className='text-xs text-destructive'>이 사용자가 활동 중인 공간이 없어 지급할 수 없습니다.</p>
                ) : null}
              </div>
            </div>
          )}

          <DialogFooter>
            {result ? (
              <Button type='button' onClick={() => close(false)}>
                닫기
              </Button>
            ) : (
              <>
                <Button type='button' variant='outline' onClick={() => close(false)}>
                  취소
                </Button>
                <Button type='button' onClick={ask} disabled={saving}>
                  {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
                  다시 묶기
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>유료 구독을 이 계정으로 옮길까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {platform?.label} 거래를 {username} 의 {spaceLabel} 공간으로 옮깁니다. 결제자 본인 확인을 마친 경우에만
              진행하세요. 서버가 스토어에서 구독이 살아 있는지 다시 확인합니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={() => void run()}>옮기기</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SubscriptionRebindDialog;
