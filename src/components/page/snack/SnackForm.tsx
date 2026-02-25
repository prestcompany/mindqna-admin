import { createSnack, updateSnack } from '@/client/snack';
import { ImgItem, PetType, Snack, SnackKind } from '@/client/types';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
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

type Props = {
  initialSnack?: Snack;
  reload: () => Promise<any>;
  close: () => void;
};

const KIND_OPTIONS: { label: string; value: SnackKind }[] = [
  { label: 'normal', value: 'normal' },
  { label: 'special', value: 'special' },
];

const TYPE_OPTIONS: { label: string; value: PetType }[] = [
  { label: '곰', value: 'bear' },
  { label: '고양이', value: 'cat' },
  { label: '강아지', value: 'dog' },
  { label: '펭귄', value: 'penguin' },
  { label: '병아리', value: 'chick' },
  { label: '토끼', value: 'rebbit' },
  { label: '햄스터', value: 'hamster' },
  { label: '다람쥐', value: 'squirrel' },
];

const PREMIUM_OPTIONS = [
  { label: '스타', value: 'true' },
  { label: '하트', value: 'false' },
];

const ACTIVE_OPTIONS = [
  { label: '활성화', value: 'true' },
  { label: '비활성화', value: 'false' },
];

const snackSchema = z.object({
  name: z.string(),
  desc: z.string(),
  kind: z.string(),
  type: z.string().optional(),
  order: z.number(),
  exp: z.number(),
  isPaid: z.boolean(),
  price: z.number(),
  isActive: z.boolean(),
});

type SnackFormValues = z.infer<typeof snackSchema>;

function SnackForm({ initialSnack, close, reload }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [image, setImage] = useState<ImgItem>();

  const form = useForm<SnackFormValues>({
    resolver: zodResolver(snackSchema),
    defaultValues: {
      name: '',
      desc: '',
      kind: 'normal',
      type: undefined,
      order: 1,
      exp: 0,
      isPaid: false,
      price: 0,
      isActive: false,
    },
  });

  useEffect(() => {
    if (!initialSnack) return;

    if (initialSnack.Img) setImage(initialSnack.Img);
    form.reset({
      name: initialSnack.name,
      desc: initialSnack.desc ?? '',
      kind: initialSnack.kind,
      type: initialSnack.type,
      order: initialSnack.order,
      exp: initialSnack.exp,
      isPaid: initialSnack.isPaid,
      price: initialSnack.price,
      isActive: initialSnack.isActive,
    });
  }, [initialSnack]);

  const save = async (values: SnackFormValues) => {
    if (!initialSnack?.id && !image) {
      toast.warning('이미지를 선택해주세요');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        imgId: image?.id ?? initialSnack?.Img?.id ?? 0,
        name: values.name,
        desc: values.desc,
        kind: values.kind as SnackKind,
        type: (values.type as PetType) ?? undefined,
        order: values.order,
        exp: values.exp,
        isPaid: values.isPaid,
        price: values.price,
        isActive: values.isActive,
      };

      if (initialSnack?.id) {
        await updateSnack({ id: initialSnack.id, ...payload });
      } else {
        await createSnack(payload);
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
        <div className='flex fixed inset-0 z-50 justify-center items-center bg-background/80'>
          <div className='w-8 h-8 rounded-full border-b-2 animate-spin border-primary' />
        </div>
      )}

      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className='space-y-4 pb-2'>
          <FormSection title={initialSnack ? '간식 수정' : '간식 추가'} description='이미지, 스탯, 노출 옵션을 설정합니다.'>
            <FormGroup title='대표 이미지*' description='리스트와 상세 화면에 노출됩니다.'>
              <div className='flex flex-col gap-2 items-start'>
                {image && (
                  <div className='flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-border/60 bg-transparent p-2'>
                    <img src={image.uri} alt='img' className='h-full w-full object-contain' />
                  </div>
                )}
                <AssetsDrawer onClick={setImage} />
              </div>
            </FormGroup>

            <FormGroup title='이름*'>
              <FormField
                control={form.control}
                name='name'
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

            <FormGroup title='설명'>
              <FormField
                control={form.control}
                name='desc'
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
          </FormSection>

          <FormSection title='노출/타입 설정'>
            <FormGroup title='종류*'>
              <FormField
                control={form.control}
                name='kind'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                        {KIND_OPTIONS.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`kind-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`kind-${opt.value}`}
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

            <FormGroup title='진화하는 펫 타입'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value ?? ''} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                        {TYPE_OPTIONS.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`type-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`type-${opt.value}`}
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
          </FormSection>

          <FormSection title='가격/운영 설정'>
            <FormGroup title='순서 / 경험치'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='order'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>순서</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          max={4}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name='exp'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>경험치</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGroup>

            <FormGroup title='코인 타입 / 가격'>
              <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                <FormField
                  control={form.control}
                  name='isPaid'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>코인 타입</FormLabel>
                      <FormControl>
                        <RadioGroup
                          value={String(field.value)}
                          onValueChange={(v) => field.onChange(v === 'true')}
                          className='grid grid-cols-2 gap-2'
                        >
                          {PREMIUM_OPTIONS.map((opt) => (
                            <div key={opt.value}>
                              <RadioGroupItem value={opt.value} id={`isPaid-${opt.value}`} className='peer sr-only' />
                              <Label
                                htmlFor={`isPaid-${opt.value}`}
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

                <FormField
                  control={form.control}
                  name='price'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>가격</FormLabel>
                      <FormControl>
                        <Input
                          type='number'
                          min={0}
                          value={field.value}
                          onChange={(e) => field.onChange(Number(e.target.value) || 0)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGroup>

            <FormGroup title='활성 상태'>
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
                      >
                        {ACTIVE_OPTIONS.map((opt) => (
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
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close}>
                취소
              </Button>
              <Button type='submit' size='lg'>
                {initialSnack ? '변경사항 저장' : '간식 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default SnackForm;
