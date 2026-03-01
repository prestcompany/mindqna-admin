import { giveCoin } from '@/client/premium';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
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
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
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
    } finally {
      setLoading(false);
    }
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
          {currentCoins && (
            <FormSection title='현재 잔액'>
              <div className='grid grid-cols-2 gap-3 sm:max-w-[320px]'>
                <div className='rounded-lg border border-border bg-muted/30 px-4 py-3 text-center'>
                  <div className='text-xs text-muted-foreground'>하트</div>
                  <div className='text-lg font-semibold text-foreground'>{currentCoins.hearts}</div>
                </div>
                <div className='rounded-lg border border-border bg-muted/30 px-4 py-3 text-center'>
                  <div className='text-xs text-muted-foreground'>스타</div>
                  <div className='text-lg font-semibold text-foreground'>{currentCoins.stars}</div>
                </div>
              </div>
            </FormSection>
          )}

          <FormSection title='코인 관리' description='지급 또는 회수할 코인 정보를 입력하세요.'>
            <FormGroup title='공간 ID'>
              <div className='rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground'>
                {spaceId}
              </div>
            </FormGroup>

            <FormGroup title='작업 유형*'>
              <FormField
                control={form.control}
                name='operation'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:max-w-[280px]'>
                        {operationOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`op-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`op-${opt.value}`}
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

            <FormGroup title='코인 타입*'>
              <FormField
                control={form.control}
                name='isStar'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:max-w-[280px]'>
                        {coinTypeOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`coin-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`coin-${opt.value}`}
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

            <FormGroup title={`${operation === 'give' ? '지급' : '회수'} 수량*`}>
              <FormField
                control={form.control}
                name='amount'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        type='number'
                        min={1}
                        max={operation === 'take' ? getCurrentCoinCount() : undefined}
                        {...field}
                        className='w-full sm:w-[220px]'
                      />
                    </FormControl>
                    {operation === 'take' && currentCoins ? (
                      <FormDescription>최대 {getCurrentCoinCount()}개 회수 가능합니다.</FormDescription>
                    ) : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='메시지'>
              <FormField
                control={form.control}
                name='meta'
                render={({ field }) => (
                  <FormItem>
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
            </FormGroup>
          </FormSection>

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' onClick={close} size='lg' variant='outline' disabled={isLoading}>
                취소
              </Button>
              <Button
                type='submit'
                size='lg'
                variant={operation === 'take' ? 'destructive' : 'default'}
                disabled={isLoading}
              >
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {operation === 'give' ? '지급하기' : '회수하기'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default CoinForm;
