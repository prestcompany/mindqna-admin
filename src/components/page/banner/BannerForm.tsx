import { Banner, createBanner, updateBanner } from '@/client/banner';
import { Locale } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
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

const localeOptions = [
  { label: 'ko', value: 'ko' },
  { label: 'en', value: 'en' },
  { label: 'ja', value: 'ja' },
  { label: 'zh', value: 'zh' },
  { label: 'zhTw', value: 'zhTw' },
  { label: 'es', value: 'es' },
  { label: 'id', value: 'id' },
];

const activeOptions = [
  { label: '활성화', value: 'true' },
  { label: '비활성화', value: 'false' },
];

const bannerSchema = z.object({
  locale: z.string(),
  name: z.string(),
  location: z.string(),
  link: z.string(),
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
      isActive: false,
    },
  });

  useEffect(() => {
    if (!init) return;
    setImageUri(init.imgUri ?? '');
    form.reset({
      locale: init.locale,
      name: init.name,
      location: init.location,
      link: init.link,
      isActive: init.isActive,
    });
  }, [init]);

  const save = async (values: BannerFormValues) => {
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
          isActive: values.isActive,
        });
      } else {
        await createBanner({
          locale: values.locale as Locale,
          img: imageUri,
          link: values.link,
          location: values.location,
          name: values.name,
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
        <div className='flex fixed inset-0 z-50 justify-center items-center bg-background/80'>
          <div className='w-8 h-8 rounded-full border-b-2 animate-spin border-primary' />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className='space-y-4'>
          <div>
            <Label className='block mb-2'>이미지</Label>
            <div className='flex flex-col gap-2 items-center'>
              {imageUri && (
                <div className='flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-border/60 bg-transparent p-2'>
                  <img src={imageUri} alt='img' className='h-full w-full object-contain' />
                </div>
              )}
              <AssetsDrawer onClick={(img) => setImageUri(img.uri)} />
            </div>
          </div>

          <FormField
            control={form.control}
            name='locale'
            render={({ field }) => (
              <FormItem>
                <FormLabel>locale</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex flex-wrap gap-4'>
                    {localeOptions.map((opt) => (
                      <div key={opt.value} className='flex gap-2 items-center'>
                        <RadioGroupItem value={opt.value} id={`locale-${opt.value}`} />
                        <Label htmlFor={`locale-${opt.value}`}>{opt.label}</Label>
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
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>이름</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='location'
            render={({ field }) => (
              <FormItem>
                <FormLabel>위치</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex flex-wrap gap-4'>
                    {locationOptions.map((opt) => (
                      <div key={opt.value} className='flex gap-2 items-center'>
                        <RadioGroupItem value={opt.value} id={`location-${opt.value}`} />
                        <Label htmlFor={`location-${opt.value}`}>{opt.label}</Label>
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
            name='link'
            render={({ field }) => (
              <FormItem>
                <FormLabel>링크</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='isActive'
            render={({ field }) => (
              <FormItem>
                <FormLabel>활성화</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={String(field.value)}
                    onValueChange={(v) => field.onChange(v === 'true')}
                    className='flex gap-4'
                    disabled={!focusedId}
                  >
                    {activeOptions.map((opt) => (
                      <div key={opt.value} className='flex gap-2 items-center'>
                        <RadioGroupItem value={opt.value} id={`isActive-${opt.value}`} />
                        <Label htmlFor={`isActive-${opt.value}`}>{opt.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
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

export default BannerForm;
