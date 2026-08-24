import { giveCoin } from '@/client/premium';
import BulkMessageKeywords from './components/BulkMessageKeywords';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { refreshSpaceCoinMutationCaches } from './services/space-coin-cache';

const schema = z.object({
  operation: z.enum(['give', 'take']),
  isStar: z.enum(['true', 'false']),
  amount: z.coerce.number().min(1),
  meta: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const defaultCoinFormValues: FormValues = {
  operation: 'give',
  isStar: 'false',
  amount: 1,
  meta: '',
};

let lastSubmittedCoinFormValues: FormValues = { ...defaultCoinFormValues };

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
  const queryClient = useQueryClient();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { ...lastSubmittedCoinFormValues },
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

      lastSubmittedCoinFormValues = {
        operation: values.operation,
        isStar: values.isStar,
        amount: values.amount,
        meta: values.meta ?? '',
      };

      toast.success(
        `${starBool ? '스타' : '하트'} ${values.amount}개 ${values.operation === 'give' ? '지급' : '회수'} 완료`,
      );
      await refreshSpaceCoinMutationCaches({ spaceId, queryClient, reload });
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
        <form onSubmit={form.handleSubmit(save)} className='flex flex-col gap-4 pb-2'>
          <div className='-mx-6 flex gap-4'>
            <div className='min-w-0 flex-1'>
              <DefinitionRow label='공간 ID'>
                <div className='rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground'>
                  {spaceId}
                </div>
              </DefinitionRow>

              <DefinitionRow label='작업 유형*'>
                <FormField
                  control={form.control}
                  name='operation'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className='grid grid-cols-2 gap-2'
                        >
                          {operationOptions.map((opt) => (
                            <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={`op-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`op-${opt.value}`}
                                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
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
              </DefinitionRow>

              <DefinitionRow label='코인 타입*'>
                <FormField
                  control={form.control}
                  name='isStar'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <RadioGroup
                          value={field.value}
                          onValueChange={field.onChange}
                          className='grid grid-cols-2 gap-2'
                        >
                          {coinTypeOptions.map((opt) => (
                            <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={`coin-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`coin-${opt.value}`}
                                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
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
              </DefinitionRow>

              <DefinitionRow label={`${operation === 'give' ? '지급' : '회수'} 수량*`}>
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
                          className='w-full'
                        />
                      </FormControl>
                      {operation === 'take' && currentCoins ? (
                        <FormDescription>최대 {getCurrentCoinCount()}개 회수 가능합니다.</FormDescription>
                      ) : null}
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DefinitionRow>

              <DefinitionRow label='메시지'>
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
                      <BulkMessageKeywords
                        onPick={(keyword) => {
                          const current = form.getValues('meta') ?? '';
                          form.setValue('meta', current.trim() ? `${current} ${keyword}` : keyword, {
                            shouldDirty: true,
                          });
                        }}
                      />
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </DefinitionRow>
            </div>

            {currentCoins && (
              <aside className='w-[220px] shrink-0 space-y-3 border-l border-border py-1 pl-4 pr-6'>
                <div className='text-sm font-medium text-foreground'>현재 잔액</div>
                <div className='rounded-lg border border-border bg-muted/30 px-4 py-3 text-center'>
                  <div className='text-xs text-muted-foreground'>하트</div>
                  <div className='text-lg font-semibold text-foreground'>{currentCoins.hearts}</div>
                </div>
                <div className='rounded-lg border border-border bg-muted/30 px-4 py-3 text-center'>
                  <div className='text-xs text-muted-foreground'>스타</div>
                  <div className='text-lg font-semibold text-foreground'>{currentCoins.stars}</div>
                </div>
              </aside>
            )}
          </div>

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
