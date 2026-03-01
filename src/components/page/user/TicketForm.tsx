import { giveTicket } from '@/client/premium';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  type: z.enum(['per', 'sub']),
  amount: z.coerce.number().min(1, '개수를 입력해주세요').max(100),
  dueDayNum: z.coerce.number().min(1, '유효 기간을 입력해주세요').max(365, '최대 365일까지 가능합니다.').optional(),
  message: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

interface TicketFormProps {
  username: string;
  reload: () => Promise<any>;
  close: () => void;
}

const typeOptions = [
  { label: '영구 티켓', value: 'per' },
  { label: '기간 티켓', value: 'sub' },
];

function TicketForm({ username, reload, close }: TicketFormProps) {
  const [loading, setLoading] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      type: 'sub',
      amount: 1,
      dueDayNum: 7,
      message: '',
    },
  });

  const ticketType = form.watch('type');

  const handleSubmit = async (values: FormValues) => {
    try {
      setLoading(true);

      await giveTicket({
        username,
        amount: values.amount,
        message: values.message || `${values.type === 'per' ? '영구' : '기간'} 티켓 지급`,
        dueDayNum: values.type === 'sub' ? values.dueDayNum : undefined,
      });

      toast.success(`${values.amount}개 티켓이 지급되었습니다`);
      await reload();
      close();
      form.reset();
    } catch (err) {
      toast.error(`지급 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {loading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4 pb-2'>
          <FormSection title='지급 대상' description='티켓을 지급할 사용자 정보입니다.'>
            <FormGroup title='Username'>
              <div className='rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-medium text-foreground'>
                {username}
              </div>
            </FormGroup>
          </FormSection>

          <FormSection title='티켓 설정' description='종류와 수량, 메시지를 설정합니다.'>
            <FormGroup title='티켓 종류*'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
                        {typeOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`ticket-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`ticket-${opt.value}`}
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

            <FormGroup title='지급 개수*'>
              <FormField
                control={form.control}
                name='amount'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type='number' min={1} max={100} placeholder='1 ~ 100' {...field} className='w-full sm:w-[220px]' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            {ticketType === 'sub' && (
              <FormGroup title='유효 기간(일)*'>
                <FormField
                  control={form.control}
                  name='dueDayNum'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input type='number' min={1} max={365} placeholder='예: 30' {...field} className='w-full sm:w-[220px]' />
                      </FormControl>
                      <FormDescription>기간 티켓 선택 시 만료 일수를 지정해야 합니다.</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            )}

            <FormGroup title='메모'>
              <FormField
                control={form.control}
                name='message'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='지급 사유 또는 내부 메모 (선택사항)' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={loading}>
                취소
              </Button>
              <Button type='submit' disabled={loading}>
                {loading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                티켓 지급
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default TicketForm;
