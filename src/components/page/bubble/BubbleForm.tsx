import { createBubble, updateBubble } from '@/client/bubble';
import { BubbleType, Locale, PetBubble } from '@/client/types';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type Props = {
  init?: PetBubble;
  reload: () => Promise<any>;
  close: () => void;
};

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
  locale: z.string().min(1, '언어를 선택해주세요.'),
  message: z.string().min(1, '메시지를 입력해주세요.'),
  types: z.array(z.string()).min(1, '타입을 1개 이상 선택해주세요.'),
  levels: z.array(z.number()).min(1, '레벨을 1개 이상 선택해주세요.'),
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
      {isLoading && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'>
          <Loader2 className='h-8 w-8 animate-spin text-primary' />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className='space-y-4 pb-2'>
          <FormSection title={focusedId ? '말풍선 수정' : '말풍선 추가'} description='메시지, 타입, 레벨 조건을 설정합니다.'>
            <FormGroup title='언어*'>
              <FormField
                control={form.control}
                name='locale'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={field.value}
                        onValueChange={field.onChange}
                        className='grid grid-cols-2 gap-2 sm:grid-cols-4'
                        disabled={!!focusedId}
                      >
                        {LOCALE_OPTIONS.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`locale-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`locale-${opt.value}`}
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                            >
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    {!!focusedId ? <FormDescription>수정 모드에서는 언어 변경이 제한됩니다.</FormDescription> : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='메시지*'>
              <FormField
                control={form.control}
                name='message'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='말풍선에 노출될 문구' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <FormSection title='노출 조건'>
            <FormGroup title='타입*' description='복수 선택 시 선택 타입별로 생성됩니다.'>
              <FormField
                control={form.control}
                name='types'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                        {typeOptions.map((option) => (
                          <label
                            key={option.value}
                            className='flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/70'
                          >
                            <Checkbox
                              checked={field.value?.includes(option.value)}
                              onCheckedChange={(checked) => {
                                const nextValues = checked
                                  ? Array.from(new Set([...field.value, option.value]))
                                  : field.value.filter((v) => v !== option.value);
                                field.onChange(nextValues);
                              }}
                              disabled={!!focusedId}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    {!!focusedId ? <FormDescription>수정 모드에서는 타입 변경이 제한됩니다.</FormDescription> : null}
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='레벨*' description='0은 전체 레벨 대상으로 처리됩니다.'>
              <FormField
                control={form.control}
                name='levels'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className='grid grid-cols-3 gap-2 sm:grid-cols-6'>
                        {levelOptions.map((option) => (
                          <label
                            key={option.value}
                            className='flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/70'
                          >
                            <Checkbox
                              checked={field.value?.includes(option.value)}
                              onCheckedChange={(checked) => {
                                const nextValues = checked
                                  ? Array.from(new Set([...field.value, option.value]))
                                  : field.value.filter((v) => v !== option.value);
                                field.onChange(nextValues);
                              }}
                              disabled={!!focusedId}
                            />
                            <span>{option.label}</span>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    {!!focusedId ? <FormDescription>수정 모드에서는 레벨 변경이 제한됩니다.</FormDescription> : null}
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
                {focusedId ? '변경사항 저장' : '말풍선 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default BubbleForm;
