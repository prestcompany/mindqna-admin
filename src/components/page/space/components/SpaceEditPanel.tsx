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
import { DefinitionRow, PanelBand } from '@/components/shared/ui/definition-row';
import { Input } from '@/components/ui/input';
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

interface SpaceEditPanelProps {
  detail: SpaceDetail;
  /** Returns to the overview tab without saving. */
  onCancel: () => void;
  /** Returns to the overview tab after a successful save. */
  onSaved: () => void;
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

function SpaceEditPanel({ detail, onCancel, onSaved }: SpaceEditPanelProps) {
  const queryClient = useQueryClient();
  const initial = buildInitialForm(detail);
  const [form, setForm] = useState<FormState>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<UpdateSpaceParams | null>(null);

  // This panel stays mounted for the life of edit mode, and `detail` can still change under
  // it — a background refetch on the same query key — so the form has to resync rather than
  // only seeding once on mount.
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
      onSaved();
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
    <div className='flex h-full flex-col'>
      <div className='min-h-0 flex-1 overflow-y-auto'>
        <PanelBand title='표시 정보' />

        <DefinitionRow label='공간 이름'>
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </DefinitionRow>
        <DefinitionRow label='펫 이름'>
          <Input value={form.petName} onChange={(e) => set('petName', e.target.value)} />
        </DefinitionRow>
        <DefinitionRow label='타입'>
          <Select value={form.type} onValueChange={(v) => set('type', v as SpaceType)}>
            <SelectTrigger>
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
        </DefinitionRow>
        <DefinitionRow label='시작일'>
          <Input value={form.startedAt} placeholder='예: 2024-01-01' onChange={(e) => set('startedAt', e.target.value)} />
        </DefinitionRow>

        <PanelBand title='동작 설정' />

        <DefinitionRow label='로케일'>
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
        <DefinitionRow label='알림 시각'>
          <Input value={form.noticeTime} placeholder='예: 21:00' onChange={(e) => set('noticeTime', e.target.value)} />
        </DefinitionRow>

        <PanelBand title='운영' />

        <DefinitionRow
          label='활성 상태'
          hint={initial.isActive && !form.isActive ? '비활성화하면 카드 생성이 중단됩니다.' : undefined}
        >
          <Switch checked={form.isActive} onCheckedChange={(v) => set('isActive', v)} />
        </DefinitionRow>
        <DefinitionRow
          label='삭제 예약일'
          hint='날짜를 비우거나 "예약 취소"를 누르면 삭제 예약이 해제됩니다.'
        >
          <div className='flex items-center gap-2'>
            <Input
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
    </div>
  );
}

export default SpaceEditPanel;
