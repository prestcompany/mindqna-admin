import { RoomCategory, RoomTemplate, createRoom, updateRoom } from '@/client/room';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

export const categoryOptions = [
  { label: '다락방', value: 'rooftop' },
  { label: '실내', value: 'inner' },
  { label: '야외', value: 'outer' },
];

const coinTypeOptions = [
  { label: '스타', value: 'true' },
  { label: '하트', value: 'false' },
];

const activeOptions = [
  { label: '활성화', value: 'true' },
  { label: '비활성화', value: 'false' },
];

const roomSchema = z.object({
  name: z.string().min(1, '이름을 입력해주세요.'),
  category: z.enum(['rooftop', 'inner', 'outer']),
  isPaid: z.boolean(),
  price: z.coerce.number().min(0, '0 이상 입력해주세요.'),
  isActive: z.boolean(),
});

type RoomFormValues = z.infer<typeof roomSchema>;

type Props = {
  init?: RoomTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

function RoomForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const form = useForm<RoomFormValues>({
    resolver: zodResolver(roomSchema),
    defaultValues: {
      name: '',
      category: 'inner',
      isPaid: false,
      price: 0,
      isActive: false,
    },
  });

  useEffect(() => {
    if (!init) {
      setFocusedId(undefined);
      form.reset({
        name: '',
        category: 'inner',
        isPaid: false,
        price: 0,
        isActive: false,
      });
      return;
    }

    setFocusedId(init.id);
    form.reset({
      name: init.type,
      category: init.category,
      isPaid: init.isPaid,
      price: init.price,
      isActive: init.isActive,
    });
  }, [init, form]);

  const save = async (values: RoomFormValues) => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateRoom({
          id: focusedId,
          name: values.name,
          category: values.category as RoomCategory,
          isPaid: values.isPaid,
          price: values.price,
          isActive: values.isActive,
        });
      } else {
        await createRoom({
          name: values.name,
          category: values.category as RoomCategory,
          isPaid: values.isPaid,
          price: values.price,
        });
      }

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
          <div className='-mx-6'>
            <DefinitionRow label='이름*'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: 기본 실내 테마' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DefinitionRow>

            <DefinitionRow label='카테고리*'>
              <FormField
                control={form.control}
                name='category'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className='grid grid-cols-1 gap-2 sm:grid-cols-3'
                      >
                        {categoryOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`cat-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`cat-${opt.value}`}
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
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
                name='isPaid'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(v === 'true')}
                        className='grid grid-cols-2 gap-2 sm:max-w-[280px]'
                      >
                        {coinTypeOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`paid-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`paid-${opt.value}`}
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
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

            <DefinitionRow label='가격*'>
              <FormField
                control={form.control}
                name='price'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type='number' min={0} {...field} className='w-full sm:w-[220px]' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DefinitionRow>

            <DefinitionRow label='활성화'>
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(v === 'true')}
                        className='grid grid-cols-2 gap-2 sm:max-w-[280px]'
                        disabled={!focusedId}
                      >
                        {activeOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`active-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`active-${opt.value}`}
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
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
          </div>

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {focusedId ? '변경사항 저장' : '방 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default RoomForm;
