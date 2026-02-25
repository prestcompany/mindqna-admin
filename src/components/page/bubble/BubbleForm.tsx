import { createBubble, updateBubble } from '@/client/bubble';
import { BubbleType, Locale, PetBubble } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type Props = {
  init?: PetBubble;
  reload: () => Promise<any>;
  close: () => void;
};

const localeOptions = [
  { label: 'ko', value: 'ko' },
  { label: 'en', value: 'en' },
  { label: 'ja', value: 'ja' },
  { label: 'zh', value: 'zh' },
  { label: 'zhTw', value: 'zhTw' },
  { label: 'es', value: 'es' },
  { label: 'id', value: 'id' },
];

const typeOptions = [
  { label: '공통', value: 'general' },
  { label: '오전', value: 'day' },
  { label: '오후', value: 'night' },
  { label: '커스텀', value: 'custom' },
];

const levelOptions = Array(13)
  .fill(0)
  .map((_, idx) => ({ label: String(idx), value: idx }));

const bubbleSchema = z.object({
  locale: z.string(),
  message: z.string(),
  types: z.array(z.string()),
  levels: z.array(z.number()),
});

type BubbleFormValues = z.infer<typeof bubbleSchema>;

function BubbleForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const focusedId = init?.id;

  const form = useForm<BubbleFormValues>({
    resolver: zodResolver(bubbleSchema),
    defaultValues: {
      locale: 'ko',
      message: '',
      types: ['general'],
      levels: [0],
    },
  });

  useEffect(() => {
    if (!init) return;
    form.reset({
      locale: init.locale,
      message: init.message,
      types: [init.type],
      levels: [init.level],
    });
  }, [init]);

  const save = async (values: BubbleFormValues) => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateBubble({
          id: focusedId,
          locale: values.locale as Locale,
          message: values.message,
          level: values.levels[0],
          type: values.types[0] as BubbleType,
        });
      } else {
        for (const level of values.levels) {
          if (values.types.includes('general')) {
            await createBubble({
              locale: values.locale as Locale,
              message: values.message,
              level,
              type: 'general',
            });
          }

          if (values.types.includes('day')) {
            await createBubble({
              locale: values.locale as Locale,
              message: values.message,
              level,
              type: 'day',
            });
          }
          if (values.types.includes('night')) {
            await createBubble({
              locale: values.locale as Locale,
              message: values.message,
              level,
              type: 'night',
            });
          }
          if (values.types.includes('custom')) {
            await createBubble({
              locale: values.locale as Locale,
              message: values.message,
              level,
              type: 'custom',
            });
          }
        }
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
      {isLoading && <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'><div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' /></div>}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className='space-y-4'>
          <FormField
            control={form.control}
            name='locale'
            render={({ field }) => (
              <FormItem>
                <FormLabel>locale</FormLabel>
                <RadioGroup
                  value={field.value}
                  onValueChange={field.onChange}
                  className='flex flex-wrap gap-4'
                  disabled={!!focusedId}
                >
                  {localeOptions.map((opt) => (
                    <div key={opt.value} className='flex items-center gap-2'>
                      <RadioGroupItem value={opt.value} id={`locale-${opt.value}`} />
                      <Label htmlFor={`locale-${opt.value}`}>{opt.label}</Label>
                    </div>
                  ))}
                </RadioGroup>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='message'
            render={({ field }) => (
              <FormItem>
                <FormLabel>메시지</FormLabel>
                <Input {...field} />
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='types'
            render={({ field }) => (
              <FormItem>
                <FormLabel>타입</FormLabel>
                <div className='flex flex-wrap gap-4'>
                  {typeOptions.map((option) => (
                    <label key={option.value} className='flex items-center gap-2 cursor-pointer'>
                      <Checkbox
                        checked={field.value?.includes(option.value)}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked
                              ? [...field.value, option.value]
                              : field.value.filter((v) => v !== option.value)
                          );
                        }}
                        disabled={!!focusedId}
                      />
                      <span className='text-sm'>{option.label}</span>
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='levels'
            render={({ field }) => (
              <FormItem>
                <FormLabel>레벨 (0: all)</FormLabel>
                <div className='flex flex-wrap gap-4'>
                  {levelOptions.map((option) => (
                    <label key={option.value} className='flex items-center gap-2 cursor-pointer'>
                      <Checkbox
                        checked={field.value?.includes(option.value)}
                        onCheckedChange={(checked) => {
                          field.onChange(
                            checked
                              ? [...field.value, option.value]
                              : field.value.filter((v) => v !== option.value)
                          );
                        }}
                        disabled={!!focusedId}
                      />
                      <span className='text-sm'>{option.label}</span>
                    </label>
                  ))}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' size='lg'>
            저장
          </Button>
        </form>
      </Form>
    </>
  );
}

export default BubbleForm;
