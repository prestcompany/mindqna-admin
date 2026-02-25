import { createRule, updateRule } from '@/client/rule';
import { AppRule } from '@/client/types';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  key: z.string().min(1, '필수'),
  value: z.coerce.number(),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  init?: AppRule;
  reload: () => Promise<any>;
  close: () => void;
};

function ExpForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { key: '', value: 0 },
  });

  useEffect(() => {
    if (!init) return;
    setFocusedId(init.id);
    form.reset({ key: init.key, value: init.value });
  }, [init]);

  const save = async (values: FormValues) => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateRule({ id: focusedId, key: values.key, value: values.value, isActive: true });
      } else {
        await createRule({ key: values.key, value: values.value });
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
          <FormSection title={focusedId ? '경험치 규칙 수정' : '경험치 규칙 추가'} description='레벨업 키와 경험치를 관리합니다.'>
            <FormGroup title='규칙 키*' description='예: level_1_exp'>
              <FormField
                control={form.control}
                name='key'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='필요 경험치*'>
              <FormField
                control={form.control}
                name='value'
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

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                저장
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default ExpForm;
