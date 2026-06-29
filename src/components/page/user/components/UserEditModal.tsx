import { updateUser } from '@/client/user';
import type { Locale, UpdateUserParams, UserDetail } from '@/client/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ko', label: 'KO' },
  { value: 'en', label: 'EN' },
  { value: 'zh', label: 'ZH' },
  { value: 'zhTw', label: 'ZH-TW' },
  { value: 'ja', label: 'JA' },
  { value: 'es', label: 'ES' },
  { value: 'id', label: 'ID' },
];

interface UserEditModalProps {
  open: boolean;
  user: UserDetail;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  locale: Locale;
  spaceMaxCount: string; // input 문자열, 저장 시 Number 변환
  reserveUnregisterAt: string; // 'YYYY-MM-DD' 또는 ''
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('sv-SE');
}

function buildInitialForm(user: UserDetail): FormState {
  return {
    locale: (user.locale as Locale) ?? 'ko',
    spaceMaxCount: String(user.spaceMaxCount ?? 0),
    reserveUnregisterAt: toDateInput(user.reserveUnregisterAt),
  };
}

const TODAY = new Date().toLocaleDateString('sv-SE');

function UserEditModal({ open, user, onOpenChange }: UserEditModalProps) {
  const queryClient = useQueryClient();
  const initial = buildInitialForm(user);
  const [form, setForm] = useState<FormState>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<UpdateUserParams | null>(null);

  useEffect(() => {
    setForm(buildInitialForm(user));
  }, [user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: (body: UpdateUserParams) => updateUser(user.username, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-detail', user.username] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['user-search'] }),
      ]);
      toast.success('사용자 정보를 수정했습니다.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(`${err}`),
  });

  const diff = (): UpdateUserParams => {
    const body: UpdateUserParams = {};
    if (form.locale !== initial.locale) body.locale = form.locale;
    if (form.spaceMaxCount.trim() !== initial.spaceMaxCount) body.spaceMaxCount = Number(form.spaceMaxCount);
    if (form.reserveUnregisterAt !== initial.reserveUnregisterAt) {
      body.reserveUnregisterAt = form.reserveUnregisterAt ? new Date(form.reserveUnregisterAt).toISOString() : null;
    }
    return body;
  };

  // 탈퇴예약을 새로 설정/변경하는 경우만 위험(취소=null은 안전).
  const isDangerous = (body: UpdateUserParams) =>
    body.reserveUnregisterAt !== undefined && body.reserveUnregisterAt !== null && body.reserveUnregisterAt !== '';

  const save = () => {
    const body = diff();
    if (Object.keys(body).length === 0) {
      toast.info('변경된 내용이 없습니다.');
      return;
    }
    if (body.spaceMaxCount !== undefined && (!Number.isInteger(body.spaceMaxCount) || body.spaceMaxCount < 0)) {
      toast.warning('최대 공간 수는 0 이상의 정수여야 합니다.');
      return;
    }
    if (isDangerous(body)) {
      setPendingBody(body);
      setConfirmOpen(true);
      return;
    }
    mutation.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] w-full max-w-[480px] flex-col'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>사용자 정보 수정</DialogTitle>
        </DialogHeader>

        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto py-1 pr-1'>
          <div className='space-y-1.5'>
            <Label htmlFor='user-locale' className='text-xs text-slate-600'>
              언어
            </Label>
            <Select value={form.locale} onValueChange={(v) => set('locale', v as Locale)}>
              <SelectTrigger id='user-locale'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section className='space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3'>
            <div className='flex items-center gap-1.5'>
              <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500' aria-hidden />
              <span className='text-xs font-semibold text-slate-700'>운영 — 계정에 영향</span>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='user-space-max' className='text-xs text-slate-600'>
                최대 공간 수
              </Label>
              <Input
                id='user-space-max'
                type='text'
                inputMode='numeric'
                value={form.spaceMaxCount}
                onChange={(e) => set('spaceMaxCount', e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='user-reserve' className='text-xs text-slate-600'>
                탈퇴 예약일
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  id='user-reserve'
                  type='date'
                  min={TODAY}
                  value={form.reserveUnregisterAt}
                  onChange={(e) => set('reserveUnregisterAt', e.target.value)}
                  className='flex-1'
                />
                {form.reserveUnregisterAt ? (
                  <Button type='button' variant='outline' size='sm' onClick={() => set('reserveUnregisterAt', '')}>
                    예약 취소
                  </Button>
                ) : null}
              </div>
              <p className='text-xs text-slate-500'>날짜를 비우거나 &quot;예약 취소&quot;를 누르면 탈퇴 예약이 해제됩니다.</p>
            </div>
          </section>
        </div>

        <div className='flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-4'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type='button' onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className='mr-1 h-4 w-4 animate-spin' /> : null}
            저장
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>탈퇴 예약 확인</AlertDialogTitle>
            <AlertDialogDescription>
              설정한 날짜에 이 사용자 계정이 삭제됩니다. 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBody(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 text-white hover:bg-rose-700'
              onClick={() => {
                if (pendingBody) mutation.mutate(pendingBody);
                setConfirmOpen(false);
                setPendingBody(null);
              }}
            >
              확인하고 저장
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export default UserEditModal;
