import { createCoupon, updateCouponBatch, type CouponBatch } from '@/client/coupon';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { useForm, type FieldErrors } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import CouponSummaryLine from './CouponSummaryLine';
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

/**
 * A section is a label and its fields, divided by a hairline — no card, no header row.
 * Four bordered cards stacked inside a 600px sheet read as boxes inside a box; the panel
 * already is the container.
 */
function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className='border-b border-border py-5 first:pt-1 last:border-b-0 last:pb-1'>
      <h3 className='mb-3 font-mono text-[11px] font-medium uppercase tracking-wider text-slate-500'>{title}</h3>
      <div className='space-y-4'>{children}</div>
    </section>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className='space-y-1.5'>
      <div className='flex flex-wrap items-baseline gap-x-2'>
        <span className='text-sm font-medium text-slate-900'>{label}</span>
        {hint && <span className='text-xs text-slate-500'>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

/** Two or three choices on one track — smaller and calmer than a stack of option cards. */
function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as T)}
      disabled={disabled}
      className={`grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-border bg-muted/50 p-1 ${className ?? ''}`}
    >
      {options.map((option) => (
        <div key={option.value}>
          <RadioGroupItem value={option.value} id={`${name}-${option.value}`} className='peer sr-only' />
          <Label
            htmlFor={`${name}-${option.value}`}
            // peer-* only reaches siblings of the input, so the checked style lives here.
            className='flex h-8 cursor-pointer items-center justify-center rounded-md text-sm font-medium text-slate-600 transition-colors duration-fast peer-focus-visible:ring-1 peer-focus-visible:ring-ring peer-data-[state=checked]:bg-card peer-data-[state=checked]:text-slate-900'
          >
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

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

  return (
    <>
      {isLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      )}
      <Form {...form}>
        {/* The sheet gives this its full height with no padding, so the form owns the
            split: one scrolling column, one pinned block with the summary and actions. */}
        <form onSubmit={form.handleSubmit(save, onInvalid)} className='flex h-full flex-col'>
          <div className='min-h-0 flex-1 overflow-y-auto px-6'>
            <Section title='타입'>
              {isEdit ? (
                <Badge variant={isShared ? 'softInfo' : 'softNeutral'}>{isShared ? '공용 코드' : '개별 코드'}</Badge>
              ) : (
                <FormField
                  control={form.control}
                  name='issueMode'
                  render={({ field }) => (
                    <FormItem>
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
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
              {/* One line that describes the current choice, rather than a description
                  packed into every option at once. */}
              <p className='text-xs text-slate-500'>
                {isShared ? '코드 하나를 여러 사람이 사용합니다.' : '서로 다른 코드를 1인 1장씩, 각 1회 사용합니다.'}
                {isEdit && ' 타입은 변경할 수 없습니다.'}
              </p>
            </Section>

            <Section title='기본 정보'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <Field label='쿠폰 이름'>
                      <FormControl>
                        <Input placeholder='예: 여름 이벤트 보상' {...field} />
                      </FormControl>
                    </Field>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {!isShared && (
                <FormField
                  control={form.control}
                  name='count'
                  render={({ field }) => (
                    <FormItem>
                      <Field label='발급 수량' hint={`1~${MAX_ISSUE_COUNT}장 · 코드 자동 생성`}>
                        <FormControl>
                          <Input type='number' min={1} max={MAX_ISSUE_COUNT} disabled={isEdit} {...field} />
                        </FormControl>
                      </Field>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              {isShared && (
                <>
                  <FormField
                    control={form.control}
                    name='code'
                    render={({ field }) => (
                      <FormItem>
                        <Field label='쿠폰 코드' hint='비우면 자동 생성 · 대소문자 무시'>
                          <FormControl>
                            <Input placeholder='예: SUMMER2026' disabled={isEdit} {...field} />
                          </FormControl>
                        </Field>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name='maxUseCount'
                    render={({ field }) => (
                      <FormItem>
                        <Field label='최대 이용 횟수'>
                          <div className='flex items-center gap-3'>
                            <FormControl>
                              <Input type='number' min={0} disabled={values.isUnlimited} {...field} />
                            </FormControl>
                            <FormField
                              control={form.control}
                              name='isUnlimited'
                              render={({ field: unlimited }) => (
                                <FormItem className='flex shrink-0 items-center gap-2'>
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
                        </Field>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              )}
            </Section>

            <Section title='사용 기간'>
              <div className='grid grid-cols-2 gap-3'>
                <FormField
                  control={form.control}
                  name='startAt'
                  render={({ field }) => (
                    <FormItem>
                      <Field label='시작일'>
                        <FormControl>
                          <Input type='date' {...field} />
                        </FormControl>
                      </Field>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='dueAt'
                  render={({ field }) => (
                    <FormItem>
                      <Field label='만료일'>
                        <FormControl>
                          <Input type='date' {...field} />
                        </FormControl>
                      </Field>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className='flex flex-wrap gap-1.5'>
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

              {isClosed && (
                <p className='text-xs text-slate-500'>
                  이미 종료된 쿠폰입니다. 저장해도 종료 상태는 유지되며, 다시 사용하게 하려면 만료일을 오늘 이후 날짜로
                  변경해주세요.
                </p>
              )}
            </Section>

            <Section title='보상'>
              <Field label='코인'>
                <div className='flex gap-2'>
                  <FormField
                    control={form.control}
                    name='isPaid'
                    render={({ field }) => (
                      <FormItem className='shrink-0'>
                        <FormControl>
                          <Segmented
                            name='isPaid'
                            className='w-[136px]'
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
                      <FormItem className='flex-1'>
                        <FormControl>
                          <Input type='number' min={0} disabled={isLocked} placeholder='수량' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Field>

              <Field label='프리미엄 티켓' hint='기간 0은 평생권'>
                <div className='grid grid-cols-2 gap-3'>
                  <FormField
                    control={form.control}
                    name='ticketCount'
                    render={({ field }) => (
                      <FormItem>
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
                      <FormItem>
                        <FormControl>
                          <Input type='number' min={0} disabled={isLocked} placeholder='기간 (일)' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </Field>

              {isLocked && (
                <p className='text-xs text-slate-500'>
                  {hasBothCurrencies
                    ? '하트와 스타를 함께 지급하는 쿠폰입니다. 이 화면은 코인을 한 종류만 다루므로 보상을 수정할 수 없습니다.'
                    : `이미 ${init?.usedCount}명이 사용해 보상과 코드를 변경할 수 없습니다.`}
                </p>
              )}
            </Section>
          </div>

          <div className='space-y-3 border-t bg-card px-6 py-3'>
            <CouponSummaryLine
              mode={isEdit ? 'edit' : 'create'}
              values={{
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

            <div className='flex justify-end gap-2'>
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
