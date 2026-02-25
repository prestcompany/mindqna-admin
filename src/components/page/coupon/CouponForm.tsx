import { Coupon, createCoupon, updateCoupon } from '@/client/coupon';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
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

type Props = {
  init?: Coupon;
  reload: () => Promise<any>;
  close: () => void;
};

const premiumOptions = [
  { label: '스타', value: 'true' },
  { label: '하트', value: 'false' },
];

const couponSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  count: z.coerce.number().min(0, '0 이상 입력해주세요.'),
  dueAt: z.string().min(1, '만료일을 입력해주세요.'),
  reward: z.coerce.number().min(0, '0 이상 입력해주세요.'),
  isPaid: z.boolean(),
  ticketCount: z.coerce.number().min(0, '0 이상 입력해주세요.'),
  ticketDueDayNum: z.coerce.number().min(0, '0 이상 입력해주세요.'),
});

type CouponFormValues = z.infer<typeof couponSchema>;

function CouponForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const focusedId = init?.id;

  const form = useForm<CouponFormValues>({
    resolver: zodResolver(couponSchema),
    defaultValues: {
      name: '',
      count: 1,
      dueAt: dayjs().format('YYYY-MM-DD'),
      reward: 0,
      isPaid: false,
      ticketCount: 0,
      ticketDueDayNum: 0,
    },
  });

  const dueAt = form.watch('dueAt');
  const disabled = !dueAt;

  useEffect(() => {
    if (!init) return;

    let isPaid = false;
    let reward = 0;
    if (init.heart > 0) {
      isPaid = false;
      reward = init.heart;
    }
    if (init.star > 0) {
      isPaid = true;
      reward = init.star;
    }

    form.reset({
      name: init.name,
      count: 0,
      dueAt: dayjs(init.dueAt).format('YYYY-MM-DD'),
      reward,
      isPaid,
      ticketCount: init.ticketCount,
      ticketDueDayNum: init.ticketDueDayNum,
    });
  }, [init]);

  const save = async (values: CouponFormValues) => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateCoupon({
          id: focusedId,
          name: values.name,
          count: values.count,
          dueAt: values.dueAt,
          heart: !values.isPaid ? values.reward : 0,
          star: values.isPaid ? values.reward : 0,
          ticketCount: values.ticketCount,
          ticketDueDayNum: values.ticketDueDayNum,
        });
      } else {
        await createCoupon({
          name: values.name,
          count: values.count,
          dueAt: values.dueAt,
          heart: !values.isPaid ? values.reward : 0,
          star: values.isPaid ? values.reward : 0,
          ticketCount: values.ticketCount,
          ticketDueDayNum: values.ticketDueDayNum,
        });
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
          <FormSection title={focusedId ? '쿠폰 수정' : '쿠폰 추가'} description='기본 정보와 보상 구성을 설정합니다.'>
            <FormGroup title='쿠폰 이름*'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: 신규 가입 보상 쿠폰' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='발급 수량*' description='0 입력 시 시스템 정책에 따라 발급 처리됩니다.'>
              <FormField
                control={form.control}
                name='count'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type='number' min={0} {...field} className='w-full sm:w-[220px]' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <FormSection title='보상 설정'>
            <FormGroup title='코인 타입*'>
              <FormField
                control={form.control}
                name='isPaid'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(v === 'true')}
                        className='grid grid-cols-2 gap-2 sm:max-w-[280px]'
                      >
                        {premiumOptions.map((opt) => (
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
            </FormGroup>

            <FormGroup title='코인 수량*'>
              <FormField
                control={form.control}
                name='reward'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type='number' min={0} {...field} className='w-full sm:w-[220px]' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='티켓 수량 / 혜택 일수'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='ticketCount'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={0} {...field} placeholder='티켓 수량' />
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
                        <Input type='number' min={0} {...field} placeholder='혜택 일수 (0=평생권)' />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGroup>
          </FormSection>

          <FormSection title='유효기간'>
            <FormGroup title='쿠폰 만료일*'>
              <FormField
                control={form.control}
                name='dueAt'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type='date'
                        value={field.value ?? ''}
                        onChange={(e) => field.onChange(e.target.value || dayjs().format('YYYY-MM-DD'))}
                        className='w-full sm:w-[220px]'
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={disabled || isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {focusedId ? '변경사항 저장' : '쿠폰 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default CouponForm;
