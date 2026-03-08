import { createInteriorTemplate, updateInteriorTemplate } from '@/client/interior';
import { createLocale } from '@/client/locale';
import { ImgItem, InteriorTemplate, InteriorTemplateType } from '@/client/types';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
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
import useTotalRooms from '@/hooks/useTotalRooms';
import { cn } from '@/lib/utils';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import AssetsDrawer from '../assets/AssetsDrawer';

const schema = z.object({
  name: z.string().min(1, '필수'),
  type: z.enum(['item', 'wall', 'floor', 'todayFrame', 'event']),
  category: z.string().min(1),
  room: z.string().min(1),
  isPremium: z.enum(['true', 'false']),
  isActive: z.enum(['true', 'false']),
  price: z.coerce.number().min(0),
  width: z.coerce.number().min(1).max(7),
  height: z.coerce.number().min(1).max(13),
  valueKo: z.string().optional(),
  valueEn: z.string().optional(),
  valueJa: z.string().optional(),
  valueZh: z.string().optional(),
  valueZhTw: z.string().optional(),
  valueEs: z.string().optional(),
  valueId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

type InteriorFormProps = {
  init?: InteriorTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

const typeOptions = [
  { label: '아이템', value: 'item' },
  { label: '벽지', value: 'wall' },
  { label: '바닥', value: 'floor' },
  { label: '오늘 프레임', value: 'todayFrame' },
  { label: '이벤트', value: 'event' },
];

const categoryOptions = [
  { label: '가구', value: 'furniture' },
  { label: '벽지', value: 'wall' },
  { label: '바닥', value: 'floor' },
];

const premiumOptions = [
  { label: '스타', value: 'true' },
  { label: '하트', value: 'false' },
];

const activeOptions = [
  { label: '활성화', value: 'true' },
  { label: '비활성화', value: 'false' },
];

function InteriorForm({ init, reload, close }: InteriorFormProps) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number | undefined>(undefined);
  const [image, setImage] = useState<ImgItem>();
  const [coords, setCoords] = useState<{ x: number; y: number }[]>([
    { x: 0, y: 5 }, { x: 1, y: 5 }, { x: 2, y: 5 }, { x: 3, y: 5 }, { x: 4, y: 5 }, { x: 5, y: 5 }, { x: 6, y: 5 },
    { x: 0, y: 7 }, { x: 1, y: 7 }, { x: 2, y: 7 }, { x: 3, y: 7 }, { x: 4, y: 7 }, { x: 5, y: 7 }, { x: 6, y: 7 },
    { x: 0, y: 6 }, { x: 1, y: 6 }, { x: 2, y: 6 }, { x: 3, y: 6 }, { x: 4, y: 6 }, { x: 5, y: 6 }, { x: 6, y: 6 },
    { x: 0, y: 8 }, { x: 1, y: 8 }, { x: 2, y: 8 }, { x: 3, y: 8 }, { x: 4, y: 8 }, { x: 5, y: 8 }, { x: 6, y: 8 },
    { x: 0, y: 9 }, { x: 1, y: 9 }, { x: 2, y: 9 }, { x: 3, y: 9 }, { x: 4, y: 9 }, { x: 5, y: 9 }, { x: 6, y: 9 },
    { x: 0, y: 10 }, { x: 1, y: 10 }, { x: 2, y: 10 }, { x: 3, y: 10 }, { x: 4, y: 10 }, { x: 5, y: 10 }, { x: 6, y: 10 },
    { x: 0, y: 11 }, { x: 1, y: 11 }, { x: 2, y: 11 }, { x: 3, y: 11 }, { x: 4, y: 11 }, { x: 5, y: 11 }, { x: 6, y: 11 },
    { x: 0, y: 12 }, { x: 1, y: 12 }, { x: 2, y: 12 }, { x: 3, y: 12 }, { x: 4, y: 12 }, { x: 5, y: 12 }, { x: 6, y: 12 },
  ]);

  const { items } = useTotalRooms();
  const roomOptions = items.map((item) => ({ label: item.type, value: item.type }));

  const coordOptions = Array.from({ length: 7 * 13 }, (_, index) => ({
    x: index % 7,
    y: Math.floor(index / 7),
  })).map((coord) => ({ label: `(${coord.x},${coord.y})`, value: coord }));

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      type: 'item',
      category: 'furniture',
      room: 'room',
      isPremium: 'true',
      isActive: 'true',
      price: 0,
      width: 1,
      height: 1,
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
    if (!init) return;
    setFocusedId(init.id);
    if (init.img) setImage(init.img);
    setCoords(findMismatchedCoordsXY(convertCoordinates(init.disablePositions), coordOptions));
    form.reset({
      name: init.name,
      type: init.type,
      category: init.category,
      room: init.room,
      isPremium: String(init.isPaid) as 'true' | 'false',
      isActive: String(init.isActive) as 'true' | 'false',
      price: init.price,
      width: init.width,
      height: init.height,
    });
  }, [init]);

  const save = async (values: FormValues) => {
    if (!image) {
      toast.warning('이미지를 선택해주세요');
      return;
    }
    try {
      setLoading(true);
      const isPaid = values.isPremium === 'true';
      const isActive = values.isActive === 'true';

      if (focusedId) {
        await updateInteriorTemplate({
          id: focusedId,
          imgId: image.id,
          room: values.room,
          name: values.name,
          category: values.category,
          disablePositions: findMismatchedCoords(coords, coordOptions),
          height: values.height,
          isPaid,
          isActive,
          price: values.price,
          type: values.type as InteriorTemplateType,
          width: values.width,
        });
      } else {
        await createInteriorTemplate({
          imgId: image.id,
          room: values.room,
          name: values.name,
          category: values.category,
          disablePositions: findMismatchedCoords(coords, coordOptions),
          height: values.height,
          isPaid,
          isActive: false,
          price: values.price,
          type: values.type as InteriorTemplateType,
          width: values.width,
        });
        await createLocale({ key: values.name, locale: 'ko', value: values.valueKo ?? '' });
        await createLocale({ key: values.name, locale: 'en', value: values.valueEn ?? '' });
        await createLocale({ key: values.name, locale: 'ja', value: values.valueJa ?? '' });
        await createLocale({ key: values.name, locale: 'zh', value: values.valueZh ?? '' });
        await createLocale({ key: values.name, locale: 'zhTw', value: values.valueZhTw ?? '' });
        await createLocale({ key: values.name, locale: 'es', value: values.valueEs ?? '' });
        await createLocale({ key: values.name, locale: 'id', value: values.valueId ?? '' });
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
          <FormSection title={focusedId ? '인테리어 수정' : '인테리어 추가'} description='이미지와 기본 정보를 설정합니다.'>
            <FormGroup title='대표 이미지*'>
              <div className='flex flex-col items-start gap-2'>
                {image && (
                  <div className='flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-border/60 bg-transparent p-2'>
                    <img src={image.uri} alt='interior-preview' className='h-full w-full object-contain' />
                  </div>
                )}
                <AssetsDrawer onClick={setImage} />
              </div>
            </FormGroup>

            <FormGroup title='이름*' description='다국어 키로도 사용됩니다.'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: interior.modern.sofa.01' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            {!focusedId && (
              <FormGroup title='다국어 값' description='신규 생성 시 locale 기본 값을 함께 등록합니다.'>
                <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
                  {(['valueKo', 'valueEn', 'valueJa', 'valueZh', 'valueZhTw', 'valueEs', 'valueId'] as const).map(
                    (fieldName) => (
                      <FormField
                        key={fieldName}
                        control={form.control}
                        name={fieldName}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{fieldName.replace('value', '').toLowerCase()}</FormLabel>
                            <FormControl>
                              <Input {...field} />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    ),
                  )}
                </div>
              </FormGroup>
            )}
          </FormSection>

          <FormSection title='템플릿 옵션'>
            <FormGroup title='타입*'>
              <FormField
                control={form.control}
                name='type'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                        {typeOptions.map((opt) => (
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

            <FormGroup title='카테고리*'>
              <FormField
                control={form.control}
                name='category'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                        {categoryOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`cat-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`cat-${opt.value}`}
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

            <FormGroup title='방 타입*'>
              <FormField
                control={form.control}
                name='room'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                        {roomOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`room-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`room-${opt.value}`}
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

          <FormSection title='가격/사이즈 및 운영'>
            <FormGroup title='코인 타입*'>
              <FormField
                control={form.control}
                name='isPremium'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:max-w-[280px]'>
                        {premiumOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`premium-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`premium-${opt.value}`}
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

            <FormGroup title='가격*'>
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
            </FormGroup>

            <FormGroup title='사이즈 (W x H)*'>
              <div className='grid grid-cols-2 gap-3 sm:max-w-[320px]'>
                <FormField
                  control={form.control}
                  name='width'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>width</FormLabel>
                      <FormControl>
                        <Input type='number' min={1} max={7} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name='height'
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>height</FormLabel>
                      <FormControl>
                        <Input type='number' min={1} max={13} {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            </FormGroup>

            <FormGroup title='활성화'>
              <FormField
                control={form.control}
                name='isActive'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:max-w-[280px]'>
                        {activeOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`active-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`active-${opt.value}`}
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

          <FormSection title='배치 가능 좌표' description='클릭한 좌표는 배치 가능 영역으로 처리됩니다.'>
            <div className='overflow-auto rounded-lg border border-border/70 bg-muted/20 p-3'>
              <div className='flex min-w-[720px]'>
                <div className='mr-3 mt-[46px] flex flex-col gap-1'>
                  {Array(13)
                    .fill(0)
                    .map((_, idx) => {
                      const handlePress = () => {
                        if (coords.some((item) => item.y === idx)) {
                          setCoords((prev) => prev.filter(({ y }) => y !== idx));
                        } else {
                          setCoords((prev) => [
                            ...prev,
                            ...coordOptions.filter((item) => item.value.y === idx).map((item) => item.value),
                          ]);
                        }
                      };
                      return (
                        <Button type='button' variant='outline' size='sm' onClick={handlePress} key={idx}>
                          all
                        </Button>
                      );
                    })}
                </div>
                <div className='space-y-2'>
                  <div className='grid grid-cols-7 gap-1'>
                    {Array(7)
                      .fill(0)
                      .map((_, idx) => {
                        const handlePress = () => {
                          if (coords.some((item) => item.x === idx)) {
                            setCoords((prev) => prev.filter(({ x }) => x !== idx));
                          } else {
                            setCoords((prev) => [
                              ...prev,
                              ...coordOptions.filter((item) => item.value.x === idx).map((item) => item.value),
                            ]);
                          }
                        };
                        return (
                          <Button type='button' variant='outline' size='sm' onClick={handlePress} key={idx}>
                            all
                          </Button>
                        );
                      })}
                  </div>
                  <div className='grid grid-cols-7 gap-1'>
                    {coordOptions.map((option) => {
                      const isSelected = coords.some(({ x, y }) => x === option.value.x && y === option.value.y);
                      const handlePress = () => {
                        if (isSelected) {
                          setCoords((prev) => prev.filter(({ x, y }) => x !== option.value.x || y !== option.value.y));
                        } else {
                          setCoords((prev) => [...prev, option.value]);
                        }
                      };
                      return (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          onClick={handlePress}
                          key={option.label}
                          className={cn(
                            'px-1 text-[10px]',
                            isSelected && 'border-sky-500 bg-sky-500 text-white hover:border-sky-600 hover:bg-sky-600 hover:text-white',
                            !isSelected && option.value.y >= 5 && 'bg-slate-100 hover:bg-slate-200',
                          )}
                        >
                          {option.label}
                        </Button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </FormSection>

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {focusedId ? '변경사항 저장' : '인테리어 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default InteriorForm;

function findMismatchedCoords(coords: { x: number; y: number }[], coordOptions: { label: string; value: { x: number; y: number } }[]): string {
  const mismatchedLabels: string[] = [];
  coordOptions.forEach((option) => {
    const matchedOption = coords.find((coord) => option.value.x === coord.x && option.value.y === coord.y);
    if (!matchedOption) {
      mismatchedLabels.push(option.label);
    }
  });
  return mismatchedLabels.join(' ');
}

function findMismatchedCoordsXY(coords: { x: number; y: number }[], coordOptions: { label: string; value: { x: number; y: number } }[]) {
  const mismatchedValues: { x: number; y: number }[] = [];
  coordOptions.forEach((option) => {
    const matchedOption = coords.find((coord) => option.value.x === coord.x && option.value.y === coord.y);
    if (!matchedOption) {
      mismatchedValues.push(option.value);
    }
  });
  return mismatchedValues;
}

function convertCoordinates(input: string) {
  const coordinates = input.split(' ').map((coord) => {
    const [x, y] = coord
      .replace(/[^\d,]/g, '')
      .split(',')
      .map((value) => parseInt(value));
    return { x, y };
  });
  return coordinates;
}
