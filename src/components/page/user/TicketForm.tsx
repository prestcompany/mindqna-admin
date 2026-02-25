import { giveTicket } from '@/client/premium';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, Ticket } from 'lucide-react';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  type: z.enum(['per', 'sub']),
  amount: z.coerce.number().min(1, '개수를 입력해주세요').max(100),
  dueDayNum: z.coerce.number().min(1).max(365).optional(),
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
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base'>사용자 정보</CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-2 items-center'>
            <span className='font-medium'>Username:</span>
            <span className='text-blue-600'>{username}</span>
          </div>
        </CardContent>
      </Card>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
          <Card>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base flex items-center gap-2'>
                <Ticket className='w-4 h-4' />
                티켓 설정
              </CardTitle>
            </CardHeader>
            <CardContent className='space-y-4'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>티켓 종류</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                        {typeOptions.map((opt) => (
                          <div key={opt.value} className='flex items-center gap-2'>
                            <RadioGroupItem value={opt.value} id={`ticket-${opt.value}`} />
                            <Label htmlFor={`ticket-${opt.value}`}>{opt.label}</Label>
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
                    <FormLabel>지급 개수</FormLabel>
                    <FormControl>
                      <Input type='number' min={1} max={100} placeholder='지급할 티켓 개수' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {ticketType === 'sub' && (
                <FormField
                  control={form.control}
                  name='dueDayNum'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>유효 기간 (일)</FormLabel>
                      <FormControl>
                        <Input type='number' min={1} max={365} placeholder='티켓 유효 기간' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name='message'
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>메모 (선택사항)</FormLabel>
                    <FormControl>
                      <Input placeholder='티켓 지급 사유나 메모' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className='flex gap-2 justify-end'>
            <Button type='button' variant='outline' onClick={close} disabled={loading}>
              취소
            </Button>
            <Button type='submit' disabled={loading}>
              {loading && <Loader2 className='w-4 h-4 animate-spin' />}
              티켓 지급
            </Button>
          </div>
        </form>
      </Form>
    </div>
  );
}

export default TicketForm;
