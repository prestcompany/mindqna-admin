import { updateUser } from '@/client/user';
import { DatePicker } from '@/components/shared/ui/date-picker';
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
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Input } from '@/components/ui/input';
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

interface UserEditPanelProps {
  user: UserDetail;
  /** Returns to the overview tab without saving. */
  onCancel: () => void;
  /** Returns to the overview tab after a successful save. */
  onSaved: () => void;
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

function UserEditPanel({ user, onCancel, onSaved }: UserEditPanelProps) {
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
      onSaved();
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
    <div className='flex h-full flex-col'>
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <DefinitionRow label='언어'>
          <Select value={form.locale} onValueChange={(v) => set('locale', v as Locale)}>
            <SelectTrigger>
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
        </DefinitionRow>
        <DefinitionRow label='최대 공간 수'>
          <Input
            type='text'
            inputMode='numeric'
            value={form.spaceMaxCount}
            onChange={(e) => set('spaceMaxCount', e.target.value.replace(/[^\d]/g, ''))}
          />
        </DefinitionRow>
        <DefinitionRow label='탈퇴 예약일' hint='날짜를 비우거나 "예약 취소"를 누르면 탈퇴 예약이 해제됩니다.'>
          <div className='flex items-center gap-2'>
            <DatePicker
              min={TODAY}
              value={form.reserveUnregisterAt}
              onChange={(v) => set('reserveUnregisterAt', v)}
              placeholder='탈퇴 예약일 선택'
              className='flex-1'
            />
            {form.reserveUnregisterAt ? (
              <Button type='button' variant='outline' size='sm' onClick={() => set('reserveUnregisterAt', '')}>
                예약 취소
              </Button>
            ) : null}
          </div>
        </DefinitionRow>
      </div>

      <div className='flex shrink-0 items-center justify-end gap-2 border-t bg-card px-4 py-3'>
        <Button type='button' variant='outline' onClick={onCancel}>
          취소
        </Button>
        <Button type='button' onClick={save} disabled={mutation.isPending}>
          {mutation.isPending ? <Loader2 className='mr-1 h-4 w-4 animate-spin' /> : null}
          저장
        </Button>
      </div>

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
              className='bg-destructive text-white hover:bg-destructive'
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
    </div>
  );
}

export default UserEditPanel;
