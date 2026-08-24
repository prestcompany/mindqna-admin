import { createCoupon, updateCouponBatch, type CouponBatch } from '@/client/coupon';
import { DefinitionRow, PanelBand } from '@/components/shared/ui/definition-row';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { Segmented } from '@/components/shared/ui/segmented';
import CouponSummaryRail from './CouponSummaryRail';
import { errorMessage } from './errorMessage';

type Props = {
  init?: CouponBatch;
  reload: () => Promise<any>;
  close: () => void;
};

const CODE_PATTERN = /^[A-Za-z0-9_-]{4,32}$/;
const MAX_ISSUE_COUNT = 1000;

const emptyCouponForm = (): CouponFormValues => ({
  name: '',
  issueMode: 'INDIVIDUAL',
  count: 1,
  code: '',
  maxUseCount: 1,
  isUnlimited: false,
  startAt: dayjs().format('YYYY-MM-DD'),
  dueAt: dayjs().add(30, 'day').format('YYYY-MM-DD'),
  isPaid: false,
  reward: 0,
  ticketCount: 0,
  ticketDueDayNum: 0,
});

// The upper bound only applies while creating. On edit, 발급 수량 is seeded from the
// stored codeCount and the input is disabled — a migrated batch can carry more than
// MAX_ISSUE_COUNT codes (see AGENTS.md history), and zodResolver validates the whole
// schema on submit regardless of which fields are rendered.
const makeCouponSchema = (isEdit: boolean) =>
  z
    .object({
      name: z.string().min(1, '이름을 입력해주세요.'),
      issueMode: z.enum(['INDIVIDUAL', 'SHARED']),
      count: z.coerce.number().int(),
      code: z.string(),
      maxUseCount: z.coerce.number().int().min(0),
      isUnlimited: z.boolean(),
      startAt: z.string().min(1, '시작일을 입력해주세요.'),
      dueAt: z.string().min(1, '만료일을 입력해주세요.'),
      isPaid: z.boolean(),
      reward: z.coerce.number().int().min(0, '0 이상 입력해주세요.'),
      ticketCount: z.coerce.number().int().min(0, '0 이상 입력해주세요.'),
      ticketDueDayNum: z.coerce.number().int().min(0, '0 이상 입력해주세요.'),
    })
    .superRefine((values, ctx) => {
      // Gate on the mode too, not just `isEdit`. 발급 수량 is unmounted in SHARED mode, so
      // an error on it has no FormMessage to render and no focusable ref — a value typed
      // before switching modes would block submit with no toast and no request.
      if (!isEdit && values.issueMode === 'INDIVIDUAL') {
        if (values.count < 1) {
          ctx.addIssue({ code: 'custom', path: ['count'], message: '1 이상 입력해주세요.' });
        } else if (values.count > MAX_ISSUE_COUNT) {
          ctx.addIssue({ code: 'custom', path: ['count'], message: `${MAX_ISSUE_COUNT} 이하로 입력해주세요.` });
        }
      }

      if (dayjs(values.startAt).isAfter(dayjs(values.dueAt))) {
        ctx.addIssue({ code: 'custom', path: ['dueAt'], message: '만료일은 시작일보다 빠를 수 없습니다.' });
      }

      if (values.reward <= 0 && values.ticketCount <= 0) {
        ctx.addIssue({ code: 'custom', path: ['reward'], message: '코인 또는 티켓 보상을 설정해주세요.' });
      }

      if (values.issueMode === 'SHARED') {
        if (values.code.trim() && !CODE_PATTERN.test(values.code.trim())) {
          ctx.addIssue({ code: 'custom', path: ['code'], message: '영문/숫자/-/_ 4~32자로 입력해주세요.' });
        }
        if (!values.isUnlimited && values.maxUseCount < 1) {
          ctx.addIssue({ code: 'custom', path: ['maxUseCount'], message: '1 이상 입력하거나 무제한을 선택해주세요.' });
        }
      }
    });

type CouponFormValues = z.infer<ReturnType<typeof makeCouponSchema>>;

/** Two choices on one track — no shadow, the selected item just takes the card surface. */
function CouponForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const isEdit = !!init;
  // The form models one coin type, so it cannot represent a coupon granting both.
  // Editing one would silently zero the currency the radio did not select — the
  // backend blocks that once redeemed, but not while usedCount is 0. Lock instead.
  const hasBothCurrencies = !!init && init.heart > 0 && init.star > 0;
  const isLocked = (!!init && init.usedCount > 0) || hasBothCurrencies;
  // 발급 중단 stores the instant of the stop, and the API keeps that instant unless the
  // calendar DAY changes — so an unrelated edit can no longer re-open a closed coupon.
  const isClosed = !!init && dayjs(init.dueAt).isBefore(dayjs());
  const couponSchema = useMemo(() => makeCouponSchema(isEdit), [isEdit]);

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: emptyCouponForm(),
  });

  const values = form.watch();
  const isShared = values.issueMode === 'SHARED';

  // Reset in BOTH directions. An early return on the create branch would leave a
  // reused instance holding the previously edited coupon's code and count — the
  // two fields that decide what actually gets issued.
  useEffect(() => {
    if (!init) {
      form.reset(emptyCouponForm());
      return;
    }

    form.reset({
      name: init.name,
      issueMode: init.issueMode,
      count: init.codeCount,
      code: init.code ?? '',
      // capacity is codeCount for individual batches, which is not a per-code
      // limit — only shared batches carry a meaningful maxUseCount.
      maxUseCount: init.issueMode === 'SHARED' ? init.capacity : 1,
      isUnlimited: init.issueMode === 'SHARED' && init.capacity === 0,
      startAt: dayjs(init.startAt).format('YYYY-MM-DD'),
      dueAt: dayjs(init.dueAt).format('YYYY-MM-DD'),
      isPaid: init.star > 0,
      reward: init.star > 0 ? init.star : init.heart,
      ticketCount: init.ticketCount,
      ticketDueDayNum: init.ticketDueDayNum,
    });
  }, [init]);

  const applyQuickRange = (days: number) => {
    form.setValue('startAt', dayjs().format('YYYY-MM-DD'));
    form.setValue('dueAt', dayjs().add(days, 'day').format('YYYY-MM-DD'));
  };

  // Deliberately NO effect carrying 발급 수량 into 최대 이용 횟수 on a mode switch.
  // An earlier revision added one and it fired on every mode change, so switching
  // 공용 → 개별 → 공용 overwrote a maxUseCount the admin had typed.

  // Last-resort feedback: a field the current mode has unmounted cannot render or focus a
  // FormMessage, and react-hook-form fails the submit silently in that case.
  const onInvalid = (errors: FieldErrors<CouponFormValues>) => {
    const first = Object.values(errors).find((error) => error?.message);
    toast.error(first?.message ? String(first.message) : '입력값을 확인해주세요.');
  };

  const save = async (input: CouponFormValues) => {
    setLoading(true);
    try {
      // A dual-currency coupon cannot be represented by the radio, so its rewards are
      // locked above. Send the stored values back unchanged: deriving them from the
      // radio would zero one currency, which `updateCouponBatch` rejects as a reward
      // change, leaving the coupon uneditable even for its name or dates.
      const heart = hasBothCurrencies ? init!.heart : input.isPaid ? 0 : input.reward;
      const star = hasBothCurrencies ? init!.star : input.isPaid ? input.reward : 0;

      if (init) {
        await updateCouponBatch({
          batchId: init.batchId,
          name: input.name,
          startAt: input.startAt,
          dueAt: input.dueAt,
          maxUseCount: input.issueMode === 'SHARED' ? (input.isUnlimited ? 0 : input.maxUseCount) : undefined,
          heart,
          star,
          ticketCount: input.ticketCount,
          ticketDueDayNum: input.ticketDueDayNum,
        });
        toast.success('쿠폰을 수정했습니다.');
      } else {
        await createCoupon({
          name: input.name,
          issueMode: input.issueMode,
          startAt: input.startAt,
          dueAt: input.dueAt,
          count: input.issueMode === 'INDIVIDUAL' ? input.count : undefined,
          code: input.issueMode === 'SHARED' ? input.code.trim() || undefined : undefined,
          maxUseCount: input.issueMode === 'SHARED' ? (input.isUnlimited ? 0 : input.maxUseCount) : undefined,
          heart,
          star,
          ticketCount: input.ticketCount,
          ticketDueDayNum: input.ticketDueDayNum,
        });
        toast.success('쿠폰을 발급했습니다.');
      }

      await reload();
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    }
    setLoading(false);
  };

  // Constraints belong beside the outcome they constrain, not buried in the field list.
  const notices =
    isClosed || isLocked ? (
      <div className='space-y-2 border-t border-border pt-3 text-xs leading-relaxed text-slate-600'>
        {isClosed && <p>이미 종료된 쿠폰입니다. 만료일을 오늘 이후로 바꿔야 다시 사용할 수 있습니다.</p>}
        {isLocked && (
          <p>
            {hasBothCurrencies
              ? '하트와 스타를 함께 지급하는 쿠폰이라 이 화면에서는 보상을 수정할 수 없습니다.'
              : `이미 ${init?.usedCount}명이 사용해 보상과 코드를 변경할 수 없습니다.`}
          </p>
        )}
      </div>
    ) : null;

  return (
    <>
      {isLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      )}
      <Form {...form}>
        {/* The sheet hands over its full height with no padding: fields scroll on the left,
            the outcome stays pinned on the right, actions sit across the bottom. */}
        <form onSubmit={form.handleSubmit(save, onInvalid)} className='flex h-full flex-col'>
          <div className='grid min-h-0 flex-1 grid-cols-[minmax(0,1fr)_220px] overflow-hidden'>
            <div className='min-h-0 overflow-y-auto'>
              <PanelBand title='타입' />

              <DefinitionRow label='발급 방식' hint={isEdit ? '생성 후 변경 불가' : undefined}>
                {isEdit ? (
                  <div className='pt-1'>
                    <Badge variant={isShared ? 'softInfo' : 'softNeutral'}>
                      {isShared ? '공용 코드' : '개별 코드'}
                    </Badge>
                  </div>
                ) : (
                  <FormField
                    control={form.control}
                    name='issueMode'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormControl>
                          <Segmented
                            name='mode'
                            value={field.value}
                            onChange={field.onChange}
                            options={[
                              { value: 'INDIVIDUAL', label: '개별 코드' },
                              { value: 'SHARED', label: '공용 코드' },
                            ]}
                          />
                        </FormControl>
                        <p className='text-xs text-slate-500'>
                          {isShared ? '코드 하나를 여러 사람이 사용합니다.' : '서로 다른 코드를 1인 1장씩 사용합니다.'}
                        </p>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                )}
              </DefinitionRow>

              {!isShared && (
                <DefinitionRow label='발급 수량' hint={`1~${MAX_ISSUE_COUNT}장 · 코드 자동 생성`}>
                  <FormField
                    control={form.control}
                    name='count'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormControl>
                          <Input type='number' min={1} max={MAX_ISSUE_COUNT} disabled={isEdit} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </DefinitionRow>
              )}

              {isShared && (
                <>
                  <DefinitionRow label='쿠폰 코드' hint='비우면 자동 생성 · 대소문자 무시'>
                    <FormField
                      control={form.control}
                      name='code'
                      render={({ field }) => (
                        <FormItem className='space-y-1.5'>
                          <FormControl>
                            <Input placeholder='예: SUMMER2026' disabled={isEdit} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </DefinitionRow>

                  <DefinitionRow label='최대 이용 횟수'>
                    <FormField
                      control={form.control}
                      name='maxUseCount'
                      render={({ field }) => (
                        <FormItem className='space-y-1.5'>
                          <div className='flex items-center gap-3'>
                            <FormControl>
                              <Input type='number' min={0} disabled={values.isUnlimited} {...field} />
                            </FormControl>
                            <FormField
                              control={form.control}
                              name='isUnlimited'
                              render={({ field: unlimited }) => (
                                <FormItem className='flex shrink-0 items-center gap-2 space-y-0'>
                                  <FormControl>
                                    <Checkbox
                                      checked={unlimited.value}
                                      onCheckedChange={(checked) => unlimited.onChange(checked === true)}
                                      id='coupon-unlimited'
                                    />
                                  </FormControl>
                                  <Label htmlFor='coupon-unlimited' className='whitespace-nowrap text-sm'>
                                    무제한
                                  </Label>
                                </FormItem>
                              )}
                            />
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </DefinitionRow>
                </>
              )}

              <PanelBand title='기본 정보' />

              <DefinitionRow label='쿠폰 이름'>
                <FormField
                  control={form.control}
                  name='name'
                  render={({ field }) => (
                    <FormItem className='space-y-1.5'>
                      <FormControl>
                        <Input placeholder='예: 여름 이벤트 보상' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DefinitionRow>

              <PanelBand title='사용 기간' />

              <DefinitionRow label='시작일 / 만료일'>
                <div className='grid grid-cols-2 gap-2'>
                  <FormField
                    control={form.control}
                    name='startAt'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormControl>
                          <Input type='date' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='dueAt'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormControl>
                          <Input type='date' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </DefinitionRow>

              <DefinitionRow label='빠른 설정'>
                <div className='flex flex-wrap gap-1.5 pt-1'>
                  {[7, 30, 90].map((days) => (
                    <button
                      key={days}
                      type='button'
                      onClick={() => applyQuickRange(days)}
                      className='inline-flex h-8 items-center rounded-full border border-border bg-card px-3 text-xs font-medium text-slate-600 transition-colors duration-fast hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring'
                    >
                      오늘부터 {days}일
                    </button>
                  ))}
                </div>
              </DefinitionRow>

              <PanelBand title='보상' />

              <DefinitionRow label='코인'>
                <div className='flex gap-2'>
                  <FormField
                    control={form.control}
                    name='isPaid'
                    render={({ field }) => (
                      <FormItem className='shrink-0 space-y-0'>
                        <FormControl>
                          <Segmented
                            name='isPaid'
                            className='w-[128px]'
                            value={String(field.value)}
                            onChange={(next) => field.onChange(next === 'true')}
                            disabled={isLocked}
                            options={[
                              { value: 'false', label: '하트' },
                              { value: 'true', label: '스타' },
                            ]}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='reward'
                    render={({ field }) => (
                      <FormItem className='flex-1 space-y-1.5'>
                        <FormControl>
                          <Input type='number' min={0} disabled={isLocked} placeholder='수량' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </DefinitionRow>

              <DefinitionRow label='프리미엄 티켓' hint='기간 0은 평생권'>
                <div className='grid grid-cols-2 gap-2'>
                  <FormField
                    control={form.control}
                    name='ticketCount'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormControl>
                          <Input type='number' min={0} disabled={isLocked} placeholder='수량' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name='ticketDueDayNum'
                    render={({ field }) => (
                      <FormItem className='space-y-1.5'>
                        <FormControl>
                          <Input type='number' min={0} disabled={isLocked} placeholder='기간 (일)' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </DefinitionRow>
            </div>

            <CouponSummaryRail
              mode={isEdit ? 'edit' : 'create'}
              notices={notices}
              values={{
                name: values.name,
                issueMode: values.issueMode,
                code: values.code,
                count: values.count,
                maxUseCount: values.maxUseCount,
                isUnlimited: values.isUnlimited,
                startAt: values.startAt,
                dueAt: values.dueAt,
                isPaid: values.isPaid,
                reward: values.reward,
                ticketCount: values.ticketCount,
                ticketDueDayNum: values.ticketDueDayNum,
              }}
            />
          </div>

          <div className='flex items-center gap-3 border-t bg-card px-4 py-3'>
            <p className='min-w-0 truncate text-xs text-slate-500'>
              {isEdit ? '변경 내용은 이 배치의 모든 코드에 적용됩니다.' : '발급 후 코드는 목록에서 펼쳐 복사합니다.'}
            </p>
            <div className='ml-auto flex shrink-0 gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {isEdit ? '변경사항 저장' : '쿠폰 발급'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default CouponForm;
