import { Banner, createBanner, updateBanner } from '@/client/banner';
import { Locale } from '@/client/types';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import { DatePicker } from '@/components/shared/ui/date-picker';
import { DefinitionRow, PanelBand } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormDescription, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { ChevronDown, ChevronUp, Loader2, X } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { AssetsPickerButton, AssetsPickerPanel } from '../assets/AssetsPicker';
import { errorMessage } from '../coupon/errorMessage';
import { BannerFormValues, bannerFormSchema } from './services/banner-form';
import { isoToKstInput, kstInputToIso } from './services/banner-period';
import { useBannerLocations } from './useBannerLocations';

type Props = {
  init?: Banner;
  reload: () => Promise<any>;
  close: () => void;
};

const activeOptions = [
  { label: '활성화', value: 'true' },
  { label: '비활성화', value: 'false' },
];

function BannerForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [imageUri, setImageUri] = useState<string>('');
  // A step inside this same sheet, not a second overlay on top of it — picking swaps this
  // whole body for the grid, and the form's own state isn't touched by the swap.
  const [pickingImage, setPickingImage] = useState(false);
  const locationOptions = useBannerLocations();
  const focusedId = init?.id;

  const form = useForm<BannerFormValues>({
    resolver: zodResolver(bannerFormSchema),
    defaultValues: {
      locale: 'ko',
      name: '',
      location: '',
      link: '',
      orderIndex: 1,
      isActive: false,
      startAt: '',
      endAt: '',
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
      startAt: isoToKstInput(init.startAt),
      endAt: isoToKstInput(init.endAt),
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
          startAt: kstInputToIso(values.startAt),
          endAt: kstInputToIso(values.endAt),
        });
      } else {
        await createBanner({
          locale: values.locale as Locale,
          img: imageUri,
          link: values.link,
          location: values.location,
          name: values.name,
          orderIndex: values.orderIndex,
          startAt: kstInputToIso(values.startAt),
          endAt: kstInputToIso(values.endAt),
        });
      }

      await reload();
      close();
    } catch (err) {
      toast.error(errorMessage(err));
    }
    setLoading(false);
  };

  if (pickingImage) {
    return (
      <AssetsPickerPanel
        onSelect={(img) => {
          setImageUri(img.uri);
          setPickingImage(false);
        }}
        onBack={() => setPickingImage(false)}
      />
    );
  }

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
            <PanelBand title='기본 정보' />

            <DefinitionRow
              label='대표 이미지'
              required
              hint='권장 비율을 유지하면 리스트/상세에서 안정적으로 노출됩니다.'
            >
              <div className='flex flex-col items-start gap-2'>
                {imageUri && (
                  <div className='flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-border bg-transparent p-2'>
                    <img src={imageUri} alt='banner-preview' className='h-full w-full object-contain' />
                  </div>
                )}
                <AssetsPickerButton onOpen={() => setPickingImage(true)} />
              </div>
            </DefinitionRow>

            <DefinitionRow label='언어' required>
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
                      >
                        {LOCALE_OPTIONS.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem
                              value={opt.value}
                              id={`banner-locale-${opt.value}`}
                              className='peer sr-only'
                            />
                            <Label
                              htmlFor={`banner-locale-${opt.value}`}
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

            <DefinitionRow label='이름' required hint='운영자가 배너를 구분하기 위한 명칭'>
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
            </DefinitionRow>

            <PanelBand title='노출 정책' />

            <DefinitionRow label='노출 위치' required>
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
                              className='flex min-h-10 cursor-pointer items-center rounded-lg border border-border bg-background px-3 py-2 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
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
            </DefinitionRow>

            <DefinitionRow
              label='노출 순서'
              required
              hint='같은 위치/언어 그룹 안에서 순서를 관리합니다. 비활성 배너도 순서를 유지합니다.'
            >
              <FormField
                control={form.control}
                name='orderIndex'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <div className='flex items-center gap-3'>
                        <div className='flex w-full max-w-[220px] items-center rounded-lg border border-border bg-background'>
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
            </DefinitionRow>

            <DefinitionRow label='링크' required hint='클릭 시 이동할 URL'>
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
            </DefinitionRow>

            <DefinitionRow label='게시 시작' hint='한국 시간 기준이에요. 비워두면 바로 노출돼요.'>
              <FormField
                control={form.control}
                name='startAt'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-center gap-2'>
                      <FormControl>
                        <DatePicker
                          withTime
                          value={field.value}
                          onChange={(next) => {
                            field.onChange(next);
                            // The pair is judged together and its error sits on 게시 종료.
                            void form.trigger('endAt');
                          }}
                          placeholder='제한 없음'
                        />
                      </FormControl>
                      {field.value ? (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-9 w-9 shrink-0'
                          onClick={() => {
                            field.onChange('');
                            void form.trigger('endAt');
                          }}
                          aria-label='게시 시작 지우기'
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DefinitionRow>

            <DefinitionRow
              label='게시 종료'
              hint='한국 시간 기준이에요. 이 시각이 되면 노출이 멈춰요. 비워두면 끝나는 날 없이 노출돼요.'
            >
              <FormField
                control={form.control}
                name='endAt'
                render={({ field }) => (
                  <FormItem>
                    <div className='flex items-center gap-2'>
                      <FormControl>
                        <DatePicker
                          withTime
                          value={field.value}
                          onChange={(next) => {
                            field.onChange(next);
                            // The pair is judged together and its error sits on 게시 종료.
                            void form.trigger('endAt');
                          }}
                          min={form.watch('startAt').slice(0, 10) || undefined}
                          placeholder='제한 없음'
                        />
                      </FormControl>
                      {field.value ? (
                        <Button
                          type='button'
                          variant='ghost'
                          size='icon'
                          className='h-9 w-9 shrink-0'
                          onClick={() => {
                            field.onChange('');
                            void form.trigger('endAt');
                          }}
                          aria-label='게시 종료 지우기'
                        >
                          <X className='h-4 w-4' />
                        </Button>
                      ) : null}
                    </div>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </DefinitionRow>

            <DefinitionRow label='활성화' hint='활성화돼 있고 게시 기간 안일 때만 앱에 노출돼요.'>
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
                              className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
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
            </DefinitionRow>
          </div>

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
