import {
  createPush,
  getPushTargetCount,
  PushUnknownUserNamesError,
  updatePush,
  type AdminPushItem,
} from '@/client/push';
import type { Locale } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
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

  const submit = async () => {
    const title = values.title.trim();
    const message = values.message.trim();
    if (!title || !message) {
      toast.error('제목과 내용을 입력해주세요');
      return;
    }
    if (values.target === 'USER' && recipients.length === 0) {
      toast.error('사용자를 1명 이상 입력해주세요');
      return;
    }
    // Mirrors the server's 400. A bad imgUrl is the expensive one: it reaches FCM as
    // notification.imageUrl and fails the whole batch, so the operator hears it here.
    const urlError = pushUrlError(values);
    if (urlError) {
      toast.error(urlError);
      return;
    }
    if (values.sendMode === 'schedule') {
      const pushAtMs = values.pushAt ? new Date(values.pushAt).getTime() : NaN;
      if (Number.isNaN(pushAtMs) || pushAtMs <= Date.now()) {
        toast.error('발송 시각은 현재보다 미래여야 합니다');
        return;
      }
    }

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

  const handleOpenChange = (open: boolean) => {
    if (!open) onClose();
  };

  if (isReadOnly && initial) {
    return (
      <Sheet open onOpenChange={handleOpenChange}>
        <AdminSideSheetContent title='발송 상세' size='lg' bodyClassName='overflow-hidden p-0'>
          <div className='grid h-full grid-cols-[minmax(0,1fr)_220px] overflow-hidden'>
            <div className='min-h-0 overflow-y-auto'>
              <DefinitionRow label='대상'>
                {initial.target === 'ALL'
                  ? `전체 · ${initial.locale ?? '—'}`
                  : `개인 · ${(initial.userNames ?? []).join(', ') || '—'}`}
              </DefinitionRow>
              <DefinitionRow label='제목'>{initial.title}</DefinitionRow>
              <DefinitionRow label='내용'>
                <p className='whitespace-pre-wrap'>{initial.message}</p>
              </DefinitionRow>
              <DefinitionRow label='링크'>{initial.link ?? '—'}</DefinitionRow>
              <DefinitionRow label='이미지'>{initial.imgUrl ?? '—'}</DefinitionRow>
              <DefinitionRow label='발송 시각'>{dayjs(initial.pushAt).format('YYYY.MM.DD HH:mm')}</DefinitionRow>
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
              <DefinitionRow label='발송 시점*'>
                <RadioGroup
                  value={values.sendMode}
                  onValueChange={(v) => set('sendMode', v as PushFormValues['sendMode'])}
                  className='flex gap-4'
                >
                  <Choice id='send-now' value='now' label='즉시 발송' />
                  <Choice id='send-schedule' value='schedule' label='예약' />
                </RadioGroup>
                {values.sendMode === 'schedule' ? (
                  <Input
                    type='datetime-local'
                    className='mt-2'
                    min={dayjs().format('YYYY-MM-DDTHH:mm')}
                    value={values.pushAt}
                    onChange={(e) => set('pushAt', e.target.value)}
                  />
                ) : (
                  <p className='mt-1 text-xs text-slate-600'>즉시 발송은 최대 1분 내에 시작됩니다</p>
                )}
              </DefinitionRow>

              <DefinitionRow label='발송 대상*'>
                <RadioGroup
                  value={values.target}
                  onValueChange={(v) => set('target', v as PushFormValues['target'])}
                  className='flex gap-4'
                >
                  <Choice id='target-all' value='ALL' label='전체' />
                  <Choice id='target-user' value='USER' label='개인' />
                </RadioGroup>
              </DefinitionRow>

              {/* Exclusive on purpose: a per-user send ignores locale, so showing it would lie. */}
              {values.target === 'ALL' ? (
                <DefinitionRow label='언어*'>
                  <RadioGroup
                    value={values.locale}
                    onValueChange={(v) => set('locale', v)}
                    className='flex flex-wrap gap-4'
                  >
                    {LOCALE_OPTIONS.map((opt) => (
                      <Choice key={opt.value} id={`locale-${opt.value}`} value={opt.value} label={opt.label} />
                    ))}
                  </RadioGroup>
                </DefinitionRow>
              ) : (
                <DefinitionRow label='사용자*'>
                  <Textarea
                    placeholder='username 을 콤마로 구분해 입력하세요'
                    value={values.userNames}
                    onChange={(e) => set('userNames', e.target.value)}
                  />
                  <p className='mt-1 text-xs text-slate-600'>{recipients.length}명 인식됨</p>
                  {unknown.length > 0 && (
                    <p className='mt-1 text-xs text-red-600'>존재하지 않는 사용자: {unknown.join(', ')}</p>
                  )}
                </DefinitionRow>
              )}

              <DefinitionRow label='제목*'>
                <Input value={values.title} onChange={(e) => set('title', e.target.value)} maxLength={100} />
              </DefinitionRow>
              <DefinitionRow label='내용*'>
                <Textarea value={values.message} onChange={(e) => set('message', e.target.value)} maxLength={500} />
              </DefinitionRow>
              <DefinitionRow label='링크'>
                <Input
                  placeholder='탭했을 때 이동할 URL'
                  value={values.link}
                  onChange={(e) => set('link', e.target.value)}
                />
              </DefinitionRow>
              <DefinitionRow label='이미지 URL'>
                <Input
                  placeholder='알림에 표시할 이미지 URL'
                  value={values.imgUrl}
                  onChange={(e) => set('imgUrl', e.target.value)}
                />
              </DefinitionRow>
            </div>

            <aside className='min-h-0 overflow-y-auto border-l border-border p-4'>
              <PushSummaryRail
                mode='compose'
                target={values.target}
                locale={values.locale}
                recipientCount={values.target === 'ALL' ? (targetCount ? targetCount.count : null) : recipients.length}
                when={
                  values.sendMode === 'now'
                    ? '지금'
                    : values.pushAt
                      ? dayjs(values.pushAt).format('YYYY.MM.DD HH:mm')
                      : '시간 미설정'
                }
              />
            </aside>
          </div>

          <div className='flex items-center justify-end gap-2 border-t bg-card px-4 py-3'>
            <Button variant='outline' onClick={onClose} disabled={saving}>
              취소
            </Button>
            <Button onClick={submit} disabled={saving}>
              {saving && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              저장
            </Button>
          </div>
        </div>
      </AdminSideSheetContent>
    </Sheet>
  );
}

function Choice({ id, value, label }: { id: string; value: string; label: string }) {
  return (
    <div className='flex items-center gap-2'>
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id}>{label}</Label>
    </div>
  );
}

export default React.memo(PushForm);
