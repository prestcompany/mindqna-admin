import { updateSpace } from '@/client/space';
import type { Locale, SpaceDetail, SpaceType, UpdateSpaceParams } from '@/client/types';
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
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const SPACE_TYPES: { value: SpaceType; label: string }[] = [
  { value: 'couple', label: '커플' },
  { value: 'family', label: '가족' },
  { value: 'friends', label: '친구' },
  { value: 'alone', label: '혼자' },
];

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ko', label: 'KO' },
  { value: 'en', label: 'EN' },
  { value: 'zh', label: 'ZH' },
  { value: 'zhTw', label: 'ZH-TW' },
  { value: 'ja', label: 'JA' },
  { value: 'es', label: 'ES' },
  { value: 'id', label: 'ID' },
];

interface SpaceEditModalProps {
  open: boolean;
  detail: SpaceDetail;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  name: string;
  petName: string;
  type: SpaceType;
  startedAt: string;
  locale: Locale;
  noticeTime: string;
  isActive: boolean;
  dueRemovedAt: string; // 'YYYY-MM-DD' 또는 ''(예약 없음)
};

// 서버 ISO 값을 로컬 타임존 기준 YYYY-MM-DD로 표시(UTC slice의 하루 밀림 방지).
function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('sv-SE');
}

function buildInitialForm(detail: SpaceDetail): FormState {
  const info = detail.spaceInfo;
  return {
    name: (info?.name ?? '').trim(),
    petName: (info?.petName ?? '').trim(),
    type: (info?.type as SpaceType) ?? 'couple',
    startedAt: (info?.startedAt ?? '').trim(),
    locale: (info?.locale as Locale) ?? 'ko',
    noticeTime: (info?.noticeTime ?? '').trim(),
    isActive: detail.isActive,
    dueRemovedAt: toDateInput(detail.dueRemovedAt),
  };
}

const TODAY = new Date().toLocaleDateString('sv-SE');

function SpaceEditModal({ open, detail, onOpenChange }: SpaceEditModalProps) {
  const queryClient = useQueryClient();
  const initial = buildInitialForm(detail);
  const [form, setForm] = useState<FormState>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<UpdateSpaceParams | null>(null);

  useEffect(() => {
    setForm(buildInitialForm(detail));
  }, [detail]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: (body: UpdateSpaceParams) => updateSpace(detail.id, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['space-detail', detail.id] }),
        queryClient.invalidateQueries({ queryKey: ['spaces'] }),
        queryClient.invalidateQueries({ queryKey: ['space-search'] }),
      ]);
      toast.success('공간 정보를 수정했습니다.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(`${err}`),
  });

  const diff = (): UpdateSpaceParams => {
    const body: UpdateSpaceParams = {};
    if (form.name.trim() !== initial.name) body.name = form.name.trim();
    if (form.petName.trim() !== initial.petName) body.petName = form.petName.trim();
    if (form.type !== initial.type) body.type = form.type;
    if (form.startedAt.trim() !== initial.startedAt) body.startedAt = form.startedAt.trim();
    if (form.locale !== initial.locale) body.locale = form.locale;
    if (form.noticeTime.trim() !== initial.noticeTime) body.noticeTime = form.noticeTime.trim();
    if (form.isActive !== initial.isActive) body.isActive = form.isActive;
    if (form.dueRemovedAt !== initial.dueRemovedAt) {
      body.dueRemovedAt = form.dueRemovedAt ? new Date(form.dueRemovedAt).toISOString() : null;
    }
    return body;
  };

  const isDangerous = (body: UpdateSpaceParams) =>
    body.isActive === false ||
    (body.dueRemovedAt !== undefined && body.dueRemovedAt !== null && body.dueRemovedAt !== '');

  const confirmMessage = () => {
    const lines: string[] = [];
    if (pendingBody?.isActive === false) lines.push('활성화를 끄면 이 공간의 카드 생성이 즉시 중단됩니다.');
    if (pendingBody?.dueRemovedAt) lines.push('삭제 예약을 설정하면 해당 날짜에 공간이 삭제됩니다.');
    return lines.join(' ');
  };

  const save = () => {
    const body = diff();
    if (Object.keys(body).length === 0) {
      toast.info('변경된 내용이 없습니다.');
      return;
    }
    if (
      form.name.trim() === '' ||
      form.petName.trim() === '' ||
      form.startedAt.trim() === '' ||
      form.noticeTime.trim() === ''
    ) {
      toast.warning('이름·펫 이름·시작일·알림 시각은 비울 수 없습니다.');
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
      <DialogContent className='flex max-h-[90vh] w-full max-w-[560px] flex-col'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>공간 정보 수정</DialogTitle>
        </DialogHeader>

        <div className='min-h-0 flex-1 space-y-6 overflow-y-auto py-1 pr-1'>
          <section className='space-y-3'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>표시 정보</div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='space-name' className='text-xs text-slate-600'>
                  공간 이름
                </Label>
                <Input id='space-name' value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='space-pet-name' className='text-xs text-slate-600'>
                  펫 이름
                </Label>
                <Input id='space-pet-name' value={form.petName} onChange={(e) => set('petName', e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='space-type' className='text-xs text-slate-600'>
                  타입
                </Label>
                <Select value={form.type} onValueChange={(v) => set('type', v as SpaceType)}>
                  <SelectTrigger id='space-type'>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPACE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label htmlFor='space-started-at' className='text-xs text-slate-600'>
                  시작일
                </Label>
                <Input
                  id='space-started-at'
                  value={form.startedAt}
                  placeholder='예: 2024-01-01'
                  onChange={(e) => set('startedAt', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className='space-y-3 border-t border-slate-100 pt-6'>
            <div className='text-xs font-semibold uppercase tracking-wide text-slate-500'>동작 설정</div>
            <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
              <div className='space-y-1.5'>
                <Label htmlFor='space-locale' className='text-xs text-slate-600'>
                  로케일
                </Label>
                <Select value={form.locale} onValueChange={(v) => set('locale', v as Locale)}>
                  <SelectTrigger id='space-locale'>
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
              <div className='space-y-1.5'>
                <Label htmlFor='space-notice-time' className='text-xs text-slate-600'>
                  알림 시각
                </Label>
                <Input
                  id='space-notice-time'
                  value={form.noticeTime}
                  placeholder='예: 21:00'
                  onChange={(e) => set('noticeTime', e.target.value)}
                />
              </div>
            </div>
          </section>

          <section className='space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3'>
            <div className='flex items-center gap-1.5'>
              <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500' aria-hidden />
              <span className='text-xs font-semibold text-slate-700'>운영 — 앱 동작에 영향</span>
            </div>
            <div className='flex items-center justify-between'>
              <div>
                <Label htmlFor='space-active' className='text-sm text-slate-700'>
                  활성 상태
                </Label>
                {initial.isActive && !form.isActive ? (
                  <p className='text-xs text-rose-600'>비활성화하면 카드 생성이 중단됩니다.</p>
                ) : null}
              </div>
              <Switch id='space-active' checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='space-due-removed' className='text-xs text-slate-600'>
                삭제 예약일
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  id='space-due-removed'
                  type='date'
                  min={TODAY}
                  value={form.dueRemovedAt}
                  onChange={(e) => set('dueRemovedAt', e.target.value)}
                  className='flex-1'
                />
                {form.dueRemovedAt ? (
                  <Button type='button' variant='outline' size='sm' onClick={() => set('dueRemovedAt', '')}>
                    예약 취소
                  </Button>
                ) : null}
              </div>
              <p className='text-xs text-slate-500'>날짜를 비우거나 &quot;예약 취소&quot;를 누르면 삭제 예약이 해제됩니다.</p>
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
            <AlertDialogTitle>운영 변경 확인</AlertDialogTitle>
            <AlertDialogDescription>{confirmMessage()}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBody(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 text-white hover:bg-rose-700'
              onClick={() => {
                if (pendingBody) mutation.mutate(pendingBody);
                setConfirmOpen(false);
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

export default SpaceEditModal;
