import { createInteriorTemplate, updateInteriorTemplate } from '@/client/interior';
import { createLocale } from '@/client/locale';
import { ImgItem, InteriorTemplate, InteriorTemplateType } from '@/client/types';
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
import { zodResolver } from '@hookform/resolvers/zod';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import AssetsDrawer from '../assets/AssetsDrawer';

const schema = z.object({
  name: z.string().min(1, '필수'),
  type: z.enum(['item', 'wall', 'floor', 'event']),
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
    if (!image) return;
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
        await createLocale({ key: values.name, locale: 'zhTw', value: values.valueZh ?? '' });
        await createLocale({ key: values.name, locale: 'es', value: values.valueEs ?? '' });
        await createLocale({ key: values.name, locale: 'id', value: values.valueId ?? '' });
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
          <div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' />
        </div>
      )}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(save)} className='space-y-4'>
          <div className='space-y-2'>
            <Label>이미지</Label>
            <div className='flex flex-col items-center gap-2'>
              {image && (
                <div className='flex h-[200px] w-[200px] items-center justify-center rounded-md border border-dashed border-border/60 bg-transparent p-2'>
                  <img src={image.uri} alt='img' className='h-full w-full object-contain' />
                </div>
              )}
              <AssetsDrawer onClick={setImage} />
            </div>
          </div>

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

          {!focusedId && (
            <>
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
            </>
          )}

          <FormField
            control={form.control}
            name='type'
            render={({ field }) => (
              <FormItem>
                <FormLabel>타입</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                    {typeOptions.map((opt) => (
                      <div key={opt.value} className='flex items-center gap-2'>
                        <RadioGroupItem value={opt.value} id={`type-${opt.value}`} />
                        <Label htmlFor={`type-${opt.value}`}>{opt.label}</Label>
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
            name='category'
            render={({ field }) => (
              <FormItem>
                <FormLabel>카테고리</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                    {categoryOptions.map((opt) => (
                      <div key={opt.value} className='flex items-center gap-2'>
                        <RadioGroupItem value={opt.value} id={`cat-${opt.value}`} />
                        <Label htmlFor={`cat-${opt.value}`}>{opt.label}</Label>
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
            name='room'
            render={({ field }) => (
              <FormItem>
                <FormLabel>방 타입</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                    {roomOptions.map((opt) => (
                      <div key={opt.value} className='flex items-center gap-2'>
                        <RadioGroupItem value={opt.value} id={`room-${opt.value}`} />
                        <Label htmlFor={`room-${opt.value}`}>{opt.label}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className='flex items-center gap-6'>
            <FormField
              control={form.control}
              name='isPremium'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>코인 타입</FormLabel>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                      {premiumOptions.map((opt) => (
                        <div key={opt.value} className='flex items-center gap-2'>
                          <RadioGroupItem value={opt.value} id={`premium-${opt.value}`} />
                          <Label htmlFor={`premium-${opt.value}`}>{opt.label}</Label>
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
                    <Input type='number' min={0} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>

          <div className='flex gap-4'>
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

          <div className='space-y-2'>
            <Label>배치 가능 좌표</Label>
            <div className='flex'>
              <div className='flex flex-col mt-[46px] mr-4'>
                {Array(13)
                  .fill(0)
                  .map((_, idx) => {
                    const handlePress = () => {
                      if (coords.some((item) => item.y === idx))
                        setCoords((prev) => prev.filter(({ y }) => y !== idx));
                      else
                        setCoords((prev) => [
                          ...prev,
                          ...coordOptions.filter((item) => item.value.y === idx).map((item) => item.value),
                        ]);
                    };
                    return (
                      <Button type='button' variant='outline' onClick={handlePress} key={idx} className='flex-1'>
                        all
                      </Button>
                    );
                  })}
              </div>
              <div>
                <div className='grid grid-cols-7 mb-4'>
                  {Array(7)
                    .fill(0)
                    .map((_, idx) => {
                      const handlePress = () => {
                        if (coords.some((item) => item.x === idx))
                          setCoords((prev) => prev.filter(({ x }) => x !== idx));
                        else
                          setCoords((prev) => [
                            ...prev,
                            ...coordOptions.filter((item) => item.value.x === idx).map((item) => item.value),
                          ]);
                      };
                      return (
                        <Button type='button' variant='outline' onClick={handlePress} key={idx}>
                          all
                        </Button>
                      );
                    })}
                </div>
                <div className='grid grid-cols-7'>
                  {coordOptions.map((option) => {
                    const isSelected = coords.some(({ x, y }) => x === option.value.x && y === option.value.y);
                    const handlePress = () => {
                      if (isSelected) setCoords((prev) => prev.filter(({ x, y }) => x !== option.value.x || y !== option.value.y));
                      else setCoords((prev) => [...prev, option.value]);
                    };
                    return (
                      <Button
                        type='button'
                        variant='outline'
                        onClick={handlePress}
                        key={option.label}
                        style={{ backgroundColor: isSelected ? 'skyblue' : option.value.y >= 5 ? 'beige' : undefined }}
                      >
                        {option.label}
                      </Button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          <FormField
            control={form.control}
            name='isActive'
            render={({ field }) => (
              <FormItem>
                <FormLabel>활성화</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                    {activeOptions.map((opt) => (
                      <div key={opt.value} className='flex items-center gap-2'>
                        <RadioGroupItem value={opt.value} id={`active-${opt.value}`} />
                        <Label htmlFor={`active-${opt.value}`}>{opt.label}</Label>
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
