import { giveCoin } from '@/client/premium';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  operation: z.enum(['give', 'take']),
  isStar: z.enum(['true', 'false']),
  amount: z.coerce.number().min(1),
  meta: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

type CoinFormProps = {
  spaceId: string;
  currentCoins?: { hearts: number; stars: number };
  reload: () => Promise<any>;
  close: () => void;
};

const operationOptions = [
  { label: '지급', value: 'give' },
  { label: '회수', value: 'take' },
];

const coinTypeOptions = [
  { label: '스타', value: 'true' },
  { label: '하트', value: 'false' },
];

function CoinForm({ spaceId, currentCoins, reload, close }: CoinFormProps) {
  const [isLoading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      operation: 'give',
      isStar: 'false',
      amount: 1,
      meta: '',
    },
  });

  const operation = form.watch('operation');
  const isStar = form.watch('isStar') === 'true';

  const getCurrentCoinCount = () => {
    if (!currentCoins) return 0;
    return isStar ? currentCoins.stars : currentCoins.hearts;
  };

  const save = async (values: FormValues) => {
    const starBool = values.isStar === 'true';
    const currentCount = currentCoins ? (starBool ? currentCoins.stars : currentCoins.hearts) : 0;

    if (values.operation === 'take' && values.amount > currentCount) {
      toast.error(`현재 ${starBool ? '스타' : '하트'} 잔액(${currentCount})보다 많이 회수할 수 없습니다.`);
      return;
    }

    try {
      setLoading(true);
      const finalAmount = values.operation === 'take' ? -values.amount : values.amount;

      await giveCoin({
        spaceId,
        isStar: starBool,
        amount: finalAmount,
        message: values.meta || `${values.operation === 'give' ? '지급' : '회수'}: ${values.amount}개`,
      });

      toast.success(`${starBool ? '스타' : '하트'} ${values.amount}개 ${values.operation === 'give' ? '지급' : '회수'} 완료`);
      await reload();
      close();
    } catch (err) {
      toast.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <div className={isLoading ? 'opacity-50 pointer-events-none' : ''}>
      <div className='space-y-6'>
        {currentCoins && (
          <Card className='bg-gray-50'>
            <CardContent className='p-4'>
              <div className='text-center'>
                <div className='mb-2 text-lg font-semibold'>현재 잔액</div>
                <div className='flex gap-4 justify-center'>
                  <div className='text-center'>
                    <div className='font-bold text-red-500'>{currentCoins.hearts}</div>
                    <div className='text-xs text-gray-500'>하트</div>
                  </div>
                  <div className='text-center'>
                    <div className='font-bold text-yellow-500'>{currentCoins.stars}</div>
                    <div className='text-xs text-gray-500'>스타</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <Form {...form}>
          <form onSubmit={form.handleSubmit(save)} className='space-y-4'>
            <FormItem>
              <FormLabel>공간 ID</FormLabel>
              <FormControl>
                <Input value={spaceId} disabled />
              </FormControl>
            </FormItem>

            <FormField
              control={form.control}
              name='operation'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>작업 유형</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                      {operationOptions.map((opt) => (
                        <div key={opt.value} className='flex items-center gap-2'>
                          <RadioGroupItem value={opt.value} id={`op-${opt.value}`} />
                          <Label htmlFor={`op-${opt.value}`}>{opt.label}</Label>
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
              name='isStar'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코인 타입</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                      {coinTypeOptions.map((opt) => (
                        <div key={opt.value} className='flex items-center gap-2'>
                          <RadioGroupItem value={opt.value} id={`coin-${opt.value}`} />
                          <Label htmlFor={`coin-${opt.value}`}>{opt.label}</Label>
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
              name='amount'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{operation === 'give' ? '지급' : '회수'} 수량</FormLabel>
                  <FormControl>
                    <Input
                      type='number'
                      min={1}
                      max={operation === 'take' ? getCurrentCoinCount() : undefined}
                      {...field}
                    />
                  </FormControl>
                  {operation === 'take' && currentCoins && (
                    <FormDescription>최대 {getCurrentCoinCount()}개 회수 가능</FormDescription>
                  )}
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name='meta'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>메시지 (선택사항)</FormLabel>
                  <FormControl>
                    <Textarea
                      {...field}
                      placeholder={`${operation === 'give' ? '지급' : '회수'} 사유를 입력하세요...`}
                      rows={3}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator className='my-4' />

            <div className='flex gap-2'>
              <Button type='button' onClick={close} size='lg' variant='outline' className='flex-1'>
                취소
              </Button>
              <Button
                type='submit'
                size='lg'
                variant={operation === 'take' ? 'destructive' : 'default'}
                className='flex-[2]'
              >
                {operation === 'give' ? '지급하기' : '회수하기'}
              </Button>
            </div>
          </form>
        </Form>
      </div>
    </div>
  );
}

export default CoinForm;
