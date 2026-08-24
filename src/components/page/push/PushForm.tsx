import {
  createPush,
  getPushTargetCount,
  PushUnknownUserNamesError,
  updatePush,
  type AdminPushItem,
} from '@/client/push';
import type { Locale } from '@/client/types';
import { DatePicker } from '@/components/shared/ui/date-picker';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { DefinitionRow, PanelBand } from '@/components/shared/ui/definition-row';
import { LOCALE_DISPLAY_NAME, LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import { Segmented } from '@/components/shared/ui/segmented';
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
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import { Textarea } from '@/components/ui/textarea';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import PushSummaryRail from './PushSummaryRail';
import {
  parseUserNamesInput,
  pushUrlError,
  toCreatePushParams,
  type PushFormValues,
} from './services/push-form-payload';
import { estimateDurationMs, minutes } from './services/push-progress';

type Props = {
  mode: 'create' | 'edit' | 'view';
  /** Present for edit, view, and duplicate-as-new. */
  initial?: AdminPushItem;
  onClose: () => void;
  onSaved: () => void | Promise<void>;
};

function toValues(mode: Props['mode'], initial?: AdminPushItem): PushFormValues {
  // Editing only ever reaches a SCHEDULED row (see allowedActions), so its send time is
  // real and worth showing back. A duplicate starts fresh instead: the row it copies is
  // FAILED or CANCELED, so its old pushAt has already passed and reusing it would be a lie.
  const isEditingSchedule = mode === 'edit' && !!initial;
  return {
    sendMode: isEditingSchedule ? 'schedule' : 'now',
    pushAt: isEditingSchedule ? dayjs(initial!.pushAt).format('YYYY-MM-DDTHH:mm') : '',
    target: initial?.target ?? 'ALL',
    locale: initial?.locale ?? 'ko',
    userNames: (initial?.userNames ?? []).join(','),
    title: initial?.title ?? '',
    message: initial?.message ?? '',
    link: initial?.link ?? '',
    imgUrl: initial?.imgUrl ?? '',
  };
}

function PushForm({ mode, initial, onClose, onSaved }: Props) {
  const [values, setValues] = useState<PushFormValues>(() => toValues(mode, initial));
  const [unknown, setUnknown] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  // A broadcast has no recovery path once it starts sending, so it gets one more step than
  // every other send here — the confirm stops the click, the rail notice only informs it.
  const [confirmingBroadcast, setConfirmingBroadcast] = useState(false);

  const set = <K extends keyof PushFormValues>(key: K, value: PushFormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const recipients = useMemo(() => parseUserNamesInput(values.userNames), [values.userNames]);
  const isReadOnly = mode === 'view';

  // A corrected recipient list makes a stale "not found" list misleading, so any edit
  // clears it rather than leaving the previous submit's error stuck on screen.
  useEffect(() => {
    setUnknown([]);
  }, [values.userNames]);

  // Hardcoding a broadcast size guarantees it drifts; ask the server, which counts the
  // same way the sender does. Only meaningful for ALL, so it is disabled otherwise.
  const { data: targetCount } = useQuery({
    queryKey: ['push-target-count', values.locale],
    queryFn: () => getPushTargetCount(values.locale as Locale),
    enabled: !isReadOnly && values.target === 'ALL' && !!values.locale,
    staleTime: 5 * 60_000,
  });

  /** Null when the form is ready to send; otherwise the toast to show instead. */
  const validate = (): string | null => {
    if (!values.title.trim() || !values.message.trim()) return '제목과 내용을 입력해주세요';
    if (values.target === 'USER' && recipients.length === 0) return '사용자를 1명 이상 입력해주세요';
    // Mirrors the server's 400. A bad imgUrl is the expensive one: it reaches FCM as
    // notification.imageUrl and fails the whole batch, so the operator hears it here.
    const urlError = pushUrlError(values);
    if (urlError) return urlError;
    if (values.sendMode === 'schedule') {
      const pushAtMs = values.pushAt ? new Date(values.pushAt).getTime() : NaN;
      if (Number.isNaN(pushAtMs) || pushAtMs <= Date.now()) return '발송 시각은 현재보다 미래여야 합니다';
    }
    return null;
  };

  const doSubmit = async () => {
    const title = values.title.trim();
    const message = values.message.trim();
    setSaving(true);
    setUnknown([]);
    try {
      const payload = toCreatePushParams({ ...values, title, message });
      if (mode === 'edit' && initial) await updatePush({ id: initial.id, ...payload });
      else await createPush(payload);
      toast.success(mode === 'edit' ? '수정되었습니다' : '등록되었습니다');
      await onSaved();
    } catch (error) {
      if (error instanceof PushUnknownUserNamesError) {
        setUnknown(error.unknownUserNames);
        toast.error('존재하지 않는 사용자가 있습니다');
      } else {
        toast.error('저장하지 못했습니다');
      }
    } finally {
      setSaving(false);
    }
  };

  // 전체 발송 stops here for a second look — naming three usernames is not the same act as
  // reaching every user in a locale, and confirming every small send trains operators to
  // dismiss the dialog without reading it, which is how the broadcast one stops working too.
  const handleSaveClick = () => {
    const error = validate();
    if (error) {
      toast.error(error);
      return;
    }
    if (values.target === 'ALL') {
      setConfirmingBroadcast(true);
      return;
    }
    doSubmit();
  };

  const confirmBroadcast = () => {
    setConfirmingBroadcast(false);
    doSubmit();
  };

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  // Shared with the rail below — the confirm dialog restates the same facts at the moment
  // of commitment, so it has to be the same numbers, not a second computation of them.
  const when =
    values.sendMode === 'now'
      ? '지금'
      : values.pushAt
        ? dayjs(values.pushAt).format('YYYY.MM.DD HH:mm')
        : '시간 미설정';
  const broadcastEstimate = targetCount ? estimateDurationMs(targetCount.count) : null;
  const confirmDescription = [
    `${values.locale} 사용자 ${targetCount ? `약 ${targetCount.count.toLocaleString()}명` : '집계 중인 인원'}에게 ${when} 발송을 시작합니다.`,
    broadcastEstimate ? `예상 소요 ${minutes(broadcastEstimate.minMs)}~${minutes(broadcastEstimate.maxMs)}분.` : null,
    '시작하면 되돌릴 수 없습니다. 중단해도 이미 도달한 사람에게는 취소되지 않습니다.',
  ]
    .filter(Boolean)
    .join(' ');

  if (isReadOnly && initial) {
    return (
      <Sheet open onOpenChange={handleOpenChange}>
        <AdminSideSheetContent title='발송 상세' size='lg' bodyClassName='overflow-hidden p-0'>
          <div className='grid h-full grid-cols-[minmax(0,1fr)_220px] overflow-hidden'>
            <div className='min-h-0 overflow-y-auto'>
              <PanelBand title='수신' />
              <DefinitionRow label='대상'>
                {initial.target === 'ALL'
                  ? `전체 · ${initial.locale ?? '—'}`
                  : `개인 · ${(initial.userNames ?? []).join(', ') || '—'}`}
              </DefinitionRow>
              <DefinitionRow label='발송 시각'>{dayjs(initial.pushAt).format('YYYY.MM.DD HH:mm')}</DefinitionRow>

              <PanelBand title='메시지' />
              <DefinitionRow label='제목'>{initial.title}</DefinitionRow>
              <DefinitionRow label='내용'>
                <p className='whitespace-pre-wrap'>{initial.message}</p>
              </DefinitionRow>
              <DefinitionRow label='이미지'>{initial.imgUrl ?? '—'}</DefinitionRow>
              <DefinitionRow label='링크'>{initial.link ?? '—'}</DefinitionRow>
            </div>
            <aside className='min-h-0 overflow-y-auto border-l border-border p-4'>
              <PushSummaryRail mode='result' row={initial} />
            </aside>
          </div>
        </AdminSideSheetContent>
      </Sheet>
    );
  }

  return (
    <>
      <Sheet open onOpenChange={handleOpenChange}>
        <AdminSideSheetContent
          title={mode === 'edit' ? '푸시 수정' : '푸시 등록'}
          size='lg'
          bodyClassName='overflow-hidden p-0'
        >
          {/* The sheet hands over its full height with no padding: fields scroll on the left,
              the outcome stays pinned on the right, actions sit across the bottom — same
              split as CouponForm. */}
          <div className='flex h-full flex-col'>
            <div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_220px] overflow-hidden'>
              <div className='min-h-0 overflow-y-auto'>
                <PanelBand title='수신' />

                <DefinitionRow label='발송 대상' required>
                  <Segmented
                    name='push-target'
                    value={values.target}
                    onChange={(v) => set('target', v as PushFormValues['target'])}
                    options={[
                      { value: 'ALL', label: '전체' },
                      { value: 'USER', label: '개인' },
                    ]}
                  />
                </DefinitionRow>

                {/* Exclusive on purpose: a per-user send ignores locale, so showing it would lie.
                    Comes after 발송 대상 — language and headcount only mean something once the
                    audience is chosen. */}
                {values.target === 'ALL' ? (
                  <DefinitionRow
                    label='언어'
                    required
                    hint={targetCount ? `약 ${targetCount.count.toLocaleString()}명` : undefined}
                  >
                    <Select value={values.locale} onValueChange={(v) => set('locale', v)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {LOCALE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            {LOCALE_DISPLAY_NAME[opt.value] ?? opt.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </DefinitionRow>
                ) : (
                  <DefinitionRow label='사용자' required hint={`${recipients.length}명 인식됨`}>
                    <Textarea
                      placeholder='username 을 콤마로 구분해 입력하세요'
                      value={values.userNames}
                      onChange={(e) => set('userNames', e.target.value)}
                    />
                    {unknown.length > 0 && (
                      <p className='mt-1 text-xs text-destructive'>존재하지 않는 사용자: {unknown.join(', ')}</p>
                    )}
                  </DefinitionRow>
                )}

                <DefinitionRow
                  label='발송 시점'
                  required
                  hint={values.sendMode === 'now' ? '최대 1분 내에 시작됩니다' : undefined}
                >
                  <Segmented
                    name='push-send-mode'
                    value={values.sendMode}
                    onChange={(v) => set('sendMode', v as PushFormValues['sendMode'])}
                    options={[
                      { value: 'now', label: '즉시' },
                      { value: 'schedule', label: '예약' },
                    ]}
                  />
                  {values.sendMode === 'schedule' && (
                    <DatePicker
                      withTime
                      className='mt-2'
                      min={dayjs().format('YYYY-MM-DD')}
                      value={values.pushAt}
                      onChange={(v) => set('pushAt', v)}
                      placeholder='발송 일시 선택'
                    />
                  )}
                </DefinitionRow>

                <PanelBand title='메시지' />

                <DefinitionRow label='제목' required hint={`${values.title.length}/100`}>
                  <Input value={values.title} onChange={(e) => set('title', e.target.value)} maxLength={100} />
                </DefinitionRow>
                <DefinitionRow label='내용' required hint={`${values.message.length}/500`}>
                  <Textarea value={values.message} onChange={(e) => set('message', e.target.value)} maxLength={500} />
                </DefinitionRow>
                <DefinitionRow label='이미지'>
                  <Input
                    placeholder='알림에 표시할 이미지 URL'
                    value={values.imgUrl}
                    onChange={(e) => set('imgUrl', e.target.value)}
                  />
                </DefinitionRow>
                <DefinitionRow label='링크'>
                  <Input
                    placeholder='탭했을 때 이동할 URL'
                    value={values.link}
                    onChange={(e) => set('link', e.target.value)}
                  />
                </DefinitionRow>
              </div>

              <aside className='min-h-0 overflow-y-auto border-l border-border p-4'>
                <PushSummaryRail
                  mode='compose'
                  target={values.target}
                  locale={values.locale}
                  recipientCount={
                    values.target === 'ALL' ? (targetCount ? targetCount.count : null) : recipients.length
                  }
                  when={when}
                  title={values.title}
                  message={values.message}
                  imgUrl={values.imgUrl}
                />
              </aside>
            </div>

            <div className='flex items-center justify-end gap-2 border-t bg-card px-4 py-3'>
              <Button variant='outline' onClick={onClose} disabled={saving}>
                취소
              </Button>
              <Button onClick={handleSaveClick} disabled={saving}>
                {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                저장
              </Button>
            </div>
          </div>
        </AdminSideSheetContent>
      </Sheet>

      <AlertDialog open={confirmingBroadcast} onOpenChange={(open) => !open && setConfirmingBroadcast(false)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>전체 발송할까요?</AlertDialogTitle>
            <AlertDialogDescription>{confirmDescription}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBroadcast}>발송</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default React.memo(PushForm);
