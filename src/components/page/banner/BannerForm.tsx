import { Banner, createBanner, updateBanner } from '@/client/banner';
import { Locale } from '@/client/types';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import AssetsDrawer from '../assets/AssetsDrawer';

export const locationOptions = [
  { label: '홈-우체통-하단', value: 'main_bottom' },
  { label: '홈-네비게이터-하단', value: 'main_right_small' },
  { label: '알림-헤더-하단', value: 'push_top' },
  { label: '지갑-무료충전소-상단', value: 'wallet_charge_top' },
  { label: '지갑-무료충전소-하단', value: 'wallet_charge' },
  { label: '홈-메인-팝업', value: 'main_popup' },
  { label: '광장-라이브러리-상단', value: 'square_library_top' },
  { label: '제휴 충전소', value: 'partner_charge' },
];

type Props = {
  init?: Banner;
  reload: () => Promise<any>;
  close: () => void;
};

const activeOptions = [
  { label: '활성화', value: 'true' },
  { label: '비활성화', value: 'false' },
];

const bannerSchema = z.object({
  locale: z.string().min(1, '언어를 선택해주세요.'),
  name: z.string().min(1, '이름을 입력해주세요.'),
  location: z.string().min(1, '위치를 선택해주세요.'),
  link: z.string().min(1, '링크를 입력해주세요.'),
  orderIndex: z.coerce.number().int().min(1, '1 이상의 숫자를 입력해주세요.'),
  isActive: z.boolean(),
});

type BannerFormValues = z.infer<typeof bannerSchema>;

function BannerForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string>('');
  const focusedId = init?.id;

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerSchema),
    defaultValues: {
      locale: 'ko',
      name: '',
      location: '',
      link: '',
      orderIndex: 1,
      isActive: false,
    },
  });

  const changeOrderIndex = (nextValue: number) => {
    form.setValue('orderIndex', Math.max(1, nextValue), {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  useEffect(() => {
    if (!init) return;
    setImageUri(init.imgUri ?? '');
    form.reset({
      locale: init.locale,
      name: init.name,
      location: init.location,
      link: init.link,
      orderIndex: init.orderIndex ?? 1,
      isActive: init.isActive,
    });
  }, [init]);

  const save = async (values: BannerFormValues) => {
    if (!imageUri) {
      toast.warning('이미지를 선택해주세요');
      return;
    }

    try {
      setLoading(true);
      if (focusedId) {
        await updateBanner({
          id: focusedId,
          locale: values.locale as Locale,
          img: imageUri,
          link: values.link,
          location: values.location,
          name: values.name,
          orderIndex: values.orderIndex,
          isActive: values.isActive,
        });
      } else {
        await createBanner({
          locale: values.locale as Locale,
          img: imageUri,
          link: values.link,
          location: values.location,
          name: values.name,
          orderIndex: values.orderIndex,
        });
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
          <FormSection title={focusedId ? '배너 수정' : '배너 추가'} description='배너 기본 정보와 노출 위치를 설정합니다.'>
            <FormGroup title='대표 이미지*' description='권장 비율을 유지하면 리스트/상세에서 안정적으로 노출됩니다.'>
              <div className='flex flex-col items-start gap-2'>
                {imageUri && (
                  <div className='flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-border/60 bg-transparent p-2'>
                    <img src={imageUri} alt='banner-preview' className='h-full w-full object-contain' />
                  </div>
                )}
                <AssetsDrawer onClick={(img) => setImageUri(img.uri)} />
              </div>
            </FormGroup>

            <FormGroup title='언어*'>
              <FormField
                control={form.control}
                name='locale'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                        {LOCALE_OPTIONS.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`banner-locale-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`banner-locale-${opt.value}`}
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

            <FormGroup title='이름*' description='운영자가 배너를 구분하기 위한 명칭'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: 신규 시즌 프로모션 배너' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <FormSection title='노출 정책'>
            <FormGroup title='노출 위치*'>
              <FormField
                control={form.control}
                name='location'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-1 gap-2'>
                        {locationOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`location-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`location-${opt.value}`}
                              className='flex min-h-10 cursor-pointer items-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                            >
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormDescription>선택된 위치의 배너 슬롯에 노출됩니다.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup
              title='노출 순서*'
              description='같은 위치/언어 그룹 안에서 순서를 관리합니다. 비활성 배너도 순서를 유지합니다.'
            >
              <FormField
                control={form.control}
                name='orderIndex'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className='flex items-center gap-3'>
                        <div className='flex w-full max-w-[220px] items-center rounded-lg border border-border bg-background shadow-sm'>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='h-11 w-11 rounded-r-none border-r'
                            onClick={() => changeOrderIndex((field.value ?? 1) - 1)}
                            disabled={(field.value ?? 1) <= 1}
                            aria-label='노출 순서 감소'
                          >
                            <ChevronDown className='h-4 w-4' />
                          </Button>
                          <div className='flex min-w-0 flex-1 flex-col items-center justify-center px-3 py-2'>
                            <span className='text-xs text-muted-foreground'>현재 순서</span>
                            <span className='text-lg font-semibold tabular-nums'>{field.value ?? 1}</span>
                          </div>
                          <Button
                            type='button'
                            variant='ghost'
                            size='icon'
                            className='h-11 w-11 rounded-l-none border-l'
                            onClick={() => changeOrderIndex((field.value ?? 1) + 1)}
                            aria-label='노출 순서 증가'
                          >
                            <ChevronUp className='h-4 w-4' />
                          </Button>
                        </div>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='링크*' description='클릭 시 이동할 URL'>
              <FormField
                control={form.control}
                name='link'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='https://...' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='활성화'>
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
                            <RadioGroupItem value={opt.value} id={`isActive-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`isActive-${opt.value}`}
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                            >
                              {opt.label}
                            </Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    {!focusedId ? <FormDescription>신규 등록 시 기본 비활성 상태로 생성됩니다.</FormDescription> : null}
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
                {focusedId ? '변경사항 저장' : '배너 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default BannerForm;
