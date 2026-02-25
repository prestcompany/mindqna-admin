import { createLocale, updateLocale } from '@/client/locale';
import { Locale, LocaleWord } from '@/client/types';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

type LocaleFormProps = {
  init?: LocaleWord;
  reload: () => Promise<any>;
  close: () => void;
};

const localeOptions: { label: string; value: Locale }[] = [
  { label: 'ko', value: 'ko' },
  { label: 'en', value: 'en' },
  { label: 'ja', value: 'ja' },
  { label: 'zh', value: 'zh' },
  { label: 'zhTw', value: 'zhTw' },
  { label: 'es', value: 'es' },
  { label: 'id', value: 'id' },
];

const localeSchema = z.object({
  key: z.string().min(1, '키를 입력해주세요.'),
  locales: z.array(z.enum(['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id'])).min(1, '언어를 1개 이상 선택해주세요.'),
  singleValue: z.string().optional(),
  valueKo: z.string().optional(),
  valueEn: z.string().optional(),
  valueJa: z.string().optional(),
  valueZh: z.string().optional(),
  valueZhTw: z.string().optional(),
  valueEs: z.string().optional(),
  valueId: z.string().optional(),
});

type LocaleFormValues = z.infer<typeof localeSchema>;
type LocaleField = 'valueKo' | 'valueEn' | 'valueJa' | 'valueZh' | 'valueZhTw' | 'valueEs' | 'valueId';

const LOCALE_FIELD_MAP: Record<Locale, LocaleField> = {
  ko: 'valueKo',
  en: 'valueEn',
  ja: 'valueJa',
  zh: 'valueZh',
  zhTw: 'valueZhTw',
  es: 'valueEs',
  id: 'valueId',
};

function LocaleForm({ init, reload, close }: LocaleFormProps) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const form = useForm<LocaleFormValues>({
    resolver: zodResolver(localeSchema),
    defaultValues: {
      key: '',
      locales: ['ko', 'en', 'ja', 'zh'],
      singleValue: '',
      valueKo: '',
      valueEn: '',
      valueJa: '',
      valueZh: '',
      valueZhTw: '',
      valueEs: '',
      valueId: '',
    },
  });

  useEffect(() => {
    if (!init) {
      setFocusedId(undefined);
      form.reset({
        key: '',
        locales: ['ko', 'en', 'ja', 'zh'],
        singleValue: '',
        valueKo: '',
        valueEn: '',
        valueJa: '',
        valueZh: '',
        valueZhTw: '',
        valueEs: '',
        valueId: '',
      });
      return;
    }

    setFocusedId(init.id);
    form.reset({
      key: init.key,
      locales: [init.locale],
      singleValue: init.value,
      valueKo: '',
      valueEn: '',
      valueJa: '',
      valueZh: '',
      valueZhTw: '',
      valueEs: '',
      valueId: '',
    });
  }, [init, form]);

  const selectedLocales = form.watch('locales');

  const toggleLocale = (locale: Locale, checked: boolean, currentValues: Locale[]) => {
    if (checked) return Array.from(new Set([...currentValues, locale])) as Locale[];
    return currentValues.filter((l) => l !== locale);
  };

  const getLocaleValue = (values: LocaleFormValues, locale: Locale) => values[LOCALE_FIELD_MAP[locale]];

  const save = async (values: LocaleFormValues) => {
    try {
      setLoading(true);

      if (focusedId) {
        const locale = values.locales[0];
        if (!locale) {
          toast.warning('수정할 언어를 선택해주세요.');
          return;
        }
        const singleValue = values.singleValue?.trim() ?? '';
        if (!singleValue) {
          toast.warning('값을 입력해주세요.');
          return;
        }
        await updateLocale({
          id: focusedId,
          key: values.key,
          locale,
          value: singleValue,
        });
      } else {
        for (const locale of values.locales) {
          const localeValue = getLocaleValue(values, locale)?.trim() ?? '';
          if (!localeValue) {
            toast.warning(`${locale} 값을 입력해주세요.`);
            return;
          }
        }

        for (const locale of values.locales) {
          await createLocale({
            key: values.key,
            locale,
            value: (getLocaleValue(values, locale) ?? '').trim(),
          });
        }
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
          <FormSection title={focusedId ? '다국어 수정' : '다국어 추가'} description='키와 locale별 값을 설정합니다.'>
            <FormGroup title='언어*' description='신규 생성 시 복수 선택 가능합니다.'>
              <FormField
                control={form.control}
                name='locales'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                        {localeOptions.map((opt) => (
                          <label
                            key={opt.value}
                            htmlFor={`locale-${opt.value}`}
                            className='flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/70'
                          >
                            <Checkbox
                              id={`locale-${opt.value}`}
                              checked={field.value.includes(opt.value)}
                              onCheckedChange={(checked) => field.onChange(toggleLocale(opt.value, !!checked, field.value))}
                              disabled={!!focusedId}
                            />
                            <span>{opt.label}</span>
                          </label>
                        ))}
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='키*' description='앱에서 참조하는 locale key'>
              <FormField
                control={form.control}
                name='key'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: onboarding.welcome.title' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <FormSection title='번역 값'>
            {focusedId ? (
              <FormGroup title={`${selectedLocales[0] ?? 'locale'} 값*`}>
                <FormField
                  control={form.control}
                  name='singleValue'
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <Input placeholder='번역 값을 입력하세요.' {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </FormGroup>
            ) : (
              selectedLocales.map((locale) => {
                const fieldName = LOCALE_FIELD_MAP[locale];
                return (
                  <FormGroup key={locale} title={`${locale} 값*`}>
                    <FormField
                      control={form.control}
                      name={fieldName}
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Input placeholder={`${locale} 번역 값을 입력하세요.`} {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </FormGroup>
                );
              })
            )}
          </FormSection>

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {focusedId ? '변경사항 저장' : '다국어 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default LocaleForm;
