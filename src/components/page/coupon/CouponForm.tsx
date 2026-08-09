import { createCoupon, updateCouponBatch, type CouponBatch } from '@/client/coupon';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
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
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import CouponSummaryCard from './CouponSummaryCard';

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

const couponSchema = z
  .object({
    name: z.string().min(1, '이름을 입력해주세요.'),
    issueMode: z.enum(['INDIVIDUAL', 'SHARED']),
    count: z.coerce.number().int().min(1, '1 이상 입력해주세요.').max(MAX_ISSUE_COUNT),
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

type CouponFormValues = z.infer<typeof couponSchema>;

function CouponForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const isEdit = !!init;
  // The form models one coin type, so it cannot represent a coupon granting both.
  // Editing one would silently zero the currency the radio did not select — the
  // backend blocks that once redeemed, but not while usedCount is 0. Lock instead.
  const hasBothCurrencies = !!init && init.heart > 0 && init.star > 0;
  const isLocked = (!!init && init.usedCount > 0) || hasBothCurrencies;

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: emptyCouponForm(),
  });

  const values = form.watch();

  // Reset in BOTH directions. An early return on the create branch would leave a
  // reused instance holding the previously edited coupon's code and count — the
  // two fields that decide what actually gets issued — and would make correctness
  // depend on the parent mounting a fresh instance, which this file cannot see.
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
  // 공용 → 개별 → 공용 overwrote a maxUseCount the admin had typed with the hidden
  // count field's stale value. The two fields are independent inputs; each mode
  // shows its own and the admin fills it in.

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
          maxUseCount:
            input.issueMode === 'SHARED' ? (input.isUnlimited ? 0 : input.maxUseCount) : undefined,
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
          maxUseCount:
            input.issueMode === 'SHARED' ? (input.isUnlimited ? 0 : input.maxUseCount) : undefined,
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
      toast.error(`${err}`);
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
        <form onSubmit={form.handleSubmit(save)} className='space-y-4 pb-2'>
          <FormSection
            title='발급 방식'
            description={
              isEdit
                ? '발급 방식은 변경할 수 없습니다.'
                : '개별 코드는 1인 1코드로 각 1회, 공용 코드는 모두 같은 코드를 씁니다.'
            }
          >
            {isEdit ? (
              <Badge variant={values.issueMode === 'SHARED' ? 'softInfo' : 'softNeutral'}>
                {values.issueMode === 'SHARED' ? '공용 코드' : '개별 코드'}
              </Badge>
            ) : (
              <FormField
                control={form.control}
                name='issueMode'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className='grid grid-cols-2 gap-2 sm:max-w-[360px]'
                      >
                        {[
                          { value: 'INDIVIDUAL', label: '개별 코드' },
                          { value: 'SHARED', label: '공용 코드' },
                        ].map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`mode-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`mode-${opt.value}`}
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                            >
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}
          </FormSection>

          <FormSection title='기본 정보'>
            <FormGroup title='쿠폰 이름*'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: 여름 이벤트 보상' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            {values.issueMode === 'INDIVIDUAL' && (
              <FormGroup title='발급 수량*' description={`1~${MAX_ISSUE_COUNT}장. 코드는 자동 생성됩니다.`}>
                <FormField
                  control={form.control}
                  name='count'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input
                          type='number'
                          min={1}
                          max={MAX_ISSUE_COUNT}
                          disabled={isEdit}
                          {...field}
                          className='w-full sm:w-[220px]'
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            )}

            {values.issueMode === 'SHARED' && (
              <>
                <FormGroup title='쿠폰 코드' description='비우면 10자리로 자동 생성됩니다. 대소문자는 구분하지 않습니다.'>
                  <FormField
                    control={form.control}
                    name='code'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Input placeholder='예: SUMMER2026' disabled={isEdit} {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FormGroup>

                <FormGroup title='최대 이용 횟수*'>
                  <div className='flex items-center gap-3'>
                    <FormField
                      control={form.control}
                      name='maxUseCount'
                      render={({ field }) => (
                        <FormItem className='flex-1'>
                          <FormControl>
                            <Input
                              type='number'
                              min={0}
                              disabled={values.isUnlimited}
                              {...field}
                              className='w-full sm:w-[220px]'
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name='isUnlimited'
                      render={({ field }) => (
                        <FormItem className='flex items-center gap-2'>
                          <FormControl>
                            <Checkbox
                              checked={field.value}
                              onCheckedChange={(checked) => field.onChange(checked === true)}
                              id='coupon-unlimited'
                            />
                          </FormControl>
                          <Label htmlFor='coupon-unlimited' className='text-sm font-medium'>
                            무제한
                          </Label>
                        </FormItem>
                      )}
                    />
                  </div>
                </FormGroup>
              </>
            )}
          </FormSection>

          <FormSection title='사용 기간'>
            <FormGroup title='시작일 / 만료일*'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='startAt'
                  render={({ field }) => (
                    <FormItem>
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
                    <FormItem>
                      <FormControl>
                        <Input type='date' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className='mt-2 flex flex-wrap gap-1.5'>
                {[7, 30, 90].map((days) => (
                  <button
                    key={days}
                    type='button'
                    onClick={() => applyQuickRange(days)}
                    className='rounded-full border border-border bg-white px-2.5 py-0.5 text-xs font-medium text-slate-600 transition-colors duration-fast hover:bg-slate-100'
                  >
                    오늘부터 {days}일
                  </button>
                ))}
              </div>
            </FormGroup>
          </FormSection>

          <FormSection
            title='보상'
            description={
              hasBothCurrencies
                ? '이 쿠폰은 하트와 스타를 함께 지급합니다. 이 화면은 코인을 한 종류만 다루므로 보상을 수정할 수 없습니다.'
                : isLocked
                  ? `이미 ${init?.usedCount}명이 사용한 쿠폰입니다. 보상과 코드는 변경할 수 없습니다.`
                  : undefined
            }
          >
            <FormGroup title='코인 종류 / 수량*'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='isPaid'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(v === 'true')}
                          className='grid grid-cols-2 gap-2'
                          disabled={isLocked}
                        >
                          {[
                            { label: '하트', value: 'false' },
                            { label: '스타', value: 'true' },
                          ].map((opt) => (
                            <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={`isPaid-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`isPaid-${opt.value}`}
                                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                              >
                                {opt.label}
                              </Label>
                            </div>
                          ))}
                        </RadioGroup>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='reward'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={0} disabled={isLocked} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGroup>

            <FormGroup title='프리미엄 티켓' description='기간 0은 평생권입니다.'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='ticketCount'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={0} disabled={isLocked} placeholder='티켓 수량' {...field} />
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
            </FormGroup>
          </FormSection>

          <CouponSummaryCard
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

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={isLoading}>
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
