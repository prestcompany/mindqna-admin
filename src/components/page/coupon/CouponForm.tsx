import { Coupon, createCoupon, updateCoupon } from '@/client/coupon';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
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
  name: z.string(),
  count: z.coerce.number(),
  dueAt: z.string(),
  reward: z.coerce.number(),
  isPaid: z.boolean(),
  ticketCount: z.coerce.number(),
  ticketDueDayNum: z.coerce.number(),
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
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/20'>
          <Loader2 className='h-8 w-8 animate-spin' />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className='space-y-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='count'
            render={({ field }) => (
              <FormItem>
                <FormLabel>쿠폰 수</FormLabel>
                <FormControl>
                  <Input type='number' min={0} {...field} className='w-32' />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='flex items-end gap-6'>
            <FormField
              control={form.control}
              name='isPaid'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코인 타입</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={String(field.value)}
                      onValueChange={(v) => field.onChange(v === 'true')}
                      className='flex gap-4'
                    >
                      {premiumOptions.map((opt) => (
                        <div key={opt.value} className='flex items-center gap-2'>
                          <RadioGroupItem value={opt.value} id={`isPaid-${opt.value}`} />
                          <Label htmlFor={`isPaid-${opt.value}`}>{opt.label}</Label>
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
                  <FormLabel>하트/골드 양</FormLabel>
                  <FormControl>
                    <Input type='number' min={0} {...field} className='w-32' />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <FormField
            control={form.control}
            name='ticketCount'
            render={({ field }) => (
              <FormItem>
                <FormLabel>티켓 수</FormLabel>
                <FormControl>
                  <Input type='number' min={0} {...field} className='w-32' />
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
                <FormLabel>티켓 혜택 일 (0=평생권)</FormLabel>
                <FormControl>
                  <Input type='number' min={0} {...field} className='w-32' />
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
                <FormLabel>쿠폰 사용 만료일</FormLabel>
                <FormControl>
                  <Input
                    type='date'
                    value={field.value ?? ''}
                    onChange={(e) => field.onChange(e.target.value || dayjs().format('YYYY-MM-DD'))}
                    className='w-[200px]'
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' size='lg' disabled={disabled || isLoading}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            저장
          </Button>
        </form>
      </Form>
    </>
  );
}

export default CouponForm;
