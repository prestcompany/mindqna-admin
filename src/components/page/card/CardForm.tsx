import { createCardTemplate, updateCardTemplate } from '@/client/card';
import { CardTemplate, CardTemplateType, SpaceType } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Separator } from '@/components/ui/separator';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, '필수'),
  locale: z.string().min(1),
  type: z.enum(['basic', 'bonus']),
  order: z.coerce.number().optional(),
  spaceTypes: z.array(z.enum(['alone', 'couple', 'family', 'friends'])).min(1, '최소 1개 선택'),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  init?: CardTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

const optionsLocale = [
  { label: 'ko', value: 'ko' },
  { label: 'en', value: 'en' },
  { label: 'ja', value: 'ja' },
  { label: 'zh', value: 'zh' },
  { label: 'zhTw', value: 'zhTw' },
  { label: 'es', value: 'es' },
  { label: 'id', value: 'id' },
];

const optionsType: { label: string; value: CardTemplateType }[] = [
  { label: 'basic', value: 'basic' },
  { label: 'bonus', value: 'bonus' },
];

const optionsSpaceType: { label: string; value: SpaceType }[] = [
  { label: '혼자', value: 'alone' },
  { label: '커플', value: 'couple' },
  { label: '가족', value: 'family' },
  { label: '친구', value: 'friends' },
];

function CardForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [editId, setEditId] = useState<number | undefined>(undefined);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: '',
      locale: 'ko',
      type: 'basic',
      order: 0,
      spaceTypes: [],
    },
  });

  useEffect(() => {
    if (!init) return;
    const { id, name, locale, type, spaceType, order } = init;
    setEditId(id);
    form.reset({ name, locale, type, order, spaceTypes: [spaceType] });
  }, [init]);

  const spaceTypes = form.watch('spaceTypes');
  const checkAll = optionsSpaceType.length === spaceTypes.length;
  const indeterminate = spaceTypes.length > 0 && spaceTypes.length < optionsSpaceType.length;

  const handleSubmit = async (values: FormValues) => {
    try {
      setLoading(true);
      if (editId) {
        await updateCardTemplate({
          templateId: editId,
          name: values.name,
          locale: values.locale,
          type: values.type,
          spaceTypes: values.spaceTypes,
        });
      } else {
        await createCardTemplate({
          name: values.name,
          locale: values.locale,
          type: values.type,
          spaceTypes: values.spaceTypes,
          order: values.order ?? 0,
        });
      }
      toast.success('성공');
      await reload();
      form.reset();
      close();
    } catch (err) {
      toast.error(`실패 ${err}`);
    }
    setLoading(false);
  };

  return (
    <div>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4'>
          <FormField
            control={form.control}
            name='name'
            render={({ field }) => (
              <FormItem>
                <FormLabel>제목</FormLabel>
                <FormControl>
                  <Input placeholder='질문' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name='locale'
            render={({ field }) => (
              <FormItem>
                <FormLabel>언어</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex flex-wrap gap-4'>
                    {optionsLocale.map((opt) => (
                      <div key={opt.value} className='flex items-center gap-2'>
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

          {!editId && (
            <FormField
              control={form.control}
              name='order'
              render={({ field }) => (
                <FormItem>
                  <FormLabel>순서</FormLabel>
                  <FormControl>
                    <Input type='number' placeholder='0을 입력시 가장 마지막에 입력됨' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name='type'
            render={({ field }) => (
              <FormItem>
                <FormLabel>질문 타입</FormLabel>
                <FormControl>
                  <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                    {optionsType.map((opt) => (
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
            name='spaceTypes'
            render={({ field }) => (
              <FormItem>
                <FormLabel>공간 타입</FormLabel>
                <FormControl>
                  <div className='flex flex-wrap items-center gap-3'>
                    <div className='flex items-center gap-2'>
                      <Checkbox
                        checked={checkAll}
                        ref={(el) => {
                          if (el) (el as any).indeterminate = indeterminate;
                        }}
                        onCheckedChange={(checked) => {
                          field.onChange(checked ? optionsSpaceType.map((o) => o.value) : []);
                        }}
                      />
                      <Label>all</Label>
                    </div>
                    <Separator orientation='vertical' className='inline-block h-4' />
                    {optionsSpaceType.map((opt) => (
                      <div key={opt.value} className='flex items-center gap-2'>
                        <Checkbox
                          checked={field.value.includes(opt.value)}
                          onCheckedChange={(checked) => {
                            const next = checked
                              ? [...field.value, opt.value]
                              : field.value.filter((v) => v !== opt.value);
                            field.onChange(next);
                          }}
                        />
                        <Label>{opt.label}</Label>
                      </div>
                    ))}
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' disabled={isLoading}>
            {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
            {editId ? '수정' : '저장'}
          </Button>
        </form>
      </Form>
    </div>
  );
}

export default CardForm;
