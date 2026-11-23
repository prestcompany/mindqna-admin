import { cleanupTransferLeftover } from '@/client/user';
import type { TransferLeftoverResult } from '@/client/types';
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
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { leftoverErrorMessage, leftoverProblems, leftoverSummary, toLeftoverBody } from '../services/transfer-leftover';

/** 예전 계정 이관이 남긴 temp_ 계정의 공간·구매·원장을 이 계정(username)으로 옮긴다. */
function TransferLeftoverDialog({
  username,
  open,
  onOpenChange,
}: {
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [from, setFrom] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<TransferLeftoverResult | null>(null);

  const draft = { fromUserName: from, toUserName: username };

  const close = (next: boolean) => {
    if (!next) {
      setFrom('');
      setResult(null);
    }
    onOpenChange(next);
  };

  const ask = () => {
    const problems = leftoverProblems(draft);
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
      setResult(await cleanupTransferLeftover(toLeftoverBody(draft)));
      await queryClient.invalidateQueries({
        predicate: (q) =>
          typeof q.queryKey[0] === 'string' && q.queryKey[0].startsWith('user') && q.queryKey.includes(username),
      });
    } catch (err) {
      toast.error(leftoverErrorMessage(err));
    }
    setSaving(false);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>이관 잔여 정리</DialogTitle>
            <DialogDescription>
              예전 계정 이관이 남긴 temp_ 계정의 공간, 구매, 슬롯, 쿠폰, 이벤트와 결제 원장을 이 계정({username})으로
              옮깁니다. 구독 다시 묶기가 &quot;다른 계정(이관 전 잔여 데이터)&quot; 로 거절될 때 먼저 씁니다.
            </DialogDescription>
          </DialogHeader>

          {result ? (
            <ul className='space-y-1.5 rounded-lg border border-border bg-canvas p-4 text-sm text-foreground'>
              {leftoverSummary(result).map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <div className='space-y-1.5'>
              <Label htmlFor='leftover-from' className='text-xs text-muted-foreground'>
                정리할 temp_ 계정(username)
              </Label>
              <Input
                id='leftover-from'
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                placeholder='temp_...'
                className='font-mono'
              />
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
                  정리하기
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{from.trim()} 의 데이터를 이 계정으로 옮길까요?</AlertDialogTitle>
            <AlertDialogDescription>
              {username} 으로 공간과 구매 기록을 옮기고, 한 구독에 골드클럽이 둘 이상 남으면 가장 최근 것만 남기고
              나머지는 비활성으로 돌립니다. 되돌릴 수 없습니다.
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

export default TransferLeftoverDialog;
