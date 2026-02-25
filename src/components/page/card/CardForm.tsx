import { createCardTemplate, updateCardTemplate } from '@/client/card';
import { CardTemplate, CardTemplateType, SpaceType } from '@/client/types';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const schema = z.object({
  name: z.string().min(1, '카드 제목은 필수입니다.'),
  locale: z.string().min(1, '언어를 선택해주세요.'),
  type: z.enum(['basic', 'bonus', 'random']),
  order: z.coerce.number().optional(),
  spaceTypes: z.array(z.enum(['alone', 'couple', 'family', 'friends'])).min(1, '공간 타입을 최소 1개 선택해주세요.'),
});
type FormValues = z.infer<typeof schema>;

type Props = {
  init?: CardTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

const optionsType: { label: string; value: CardTemplateType }[] = [
  { label: 'basic', value: 'basic' },
  { label: 'bonus', value: 'bonus' },
  { label: 'random', value: 'random' },
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
    const normalizedType: FormValues['type'] = type === 'basic' || type === 'bonus' || type === 'random' ? type : 'basic';
    setEditId(id);
    form.reset({ name, locale, type: normalizedType, order, spaceTypes: [spaceType] });
  }, [init, form]);

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
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className='space-y-4 pb-2'>
        <FormSection title={editId ? '카드 템플릿 수정' : '카드 템플릿 추가'} description='기본 정보와 노출 정책을 함께 설정합니다.'>
          <FormGroup title='카드 제목*' description='관리자에서 구분할 수 있는 명칭'>
            <FormField
              control={form.control}
              name='name'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Input placeholder='예: 오늘의 질문 템플릿' {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGroup>

          {!editId && (
            <FormGroup title='정렬 순서' description='0 입력 시 가장 마지막에 배치됩니다.'>
              <FormField
                control={form.control}
                name='order'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input type='number' min={0} placeholder='0' {...field} className='w-full sm:w-[220px]' />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          )}
        </FormSection>

        <FormSection title='언어 설정' description='템플릿이 노출될 언어를 선택하세요.'>
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
                  <FormMessage />
                </FormItem>
              )}
            />
          </FormGroup>
        </FormSection>

        <FormSection title='템플릿 옵션' description='질문 타입과 노출 공간을 설정합니다.'>
          <FormGroup title='질문 타입*'>
            <FormField
              control={form.control}
              name='type'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                      {optionsType.map((opt) => (
                        <div key={opt.value}>
                          <RadioGroupItem value={opt.value} id={`type-${opt.value}`} className='peer sr-only' />
                          <Label
                            htmlFor={`type-${opt.value}`}
                            className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium capitalize transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
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

          <FormGroup title='공간 타입*' description='템플릿이 노출될 공간 범위'>
            <FormField
              control={form.control}
              name='spaceTypes'
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <div className='grid grid-cols-1 gap-2 sm:grid-cols-3'>
                      <div className='sm:col-span-3'>
                        <div className='flex items-center gap-2 rounded-lg border border-dashed border-border bg-muted/30 px-3 py-2'>
                          <Checkbox
                            checked={checkAll ? true : indeterminate ? 'indeterminate' : false}
                            onCheckedChange={(checked) => {
                              field.onChange(checked ? optionsSpaceType.map((o) => o.value) : []);
                            }}
                          />
                          <Label className='cursor-pointer text-sm'>전체 선택</Label>
                        </div>
                      </div>

                      {optionsSpaceType.map((opt) => (
                        <label
                          key={opt.value}
                          htmlFor={`space-${opt.value}`}
                          className='flex cursor-pointer items-center gap-2 rounded-lg border border-border bg-background px-3 py-2 text-sm transition-colors hover:bg-muted/70'
                        >
                          <Checkbox
                            id={`space-${opt.value}`}
                            checked={field.value.includes(opt.value)}
                            onCheckedChange={(checked) => {
                              const next = checked
                                ? [...field.value, opt.value]
                                : field.value.filter((v) => v !== opt.value);
                              field.onChange(next);
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </FormControl>
                  <FormDescription>선택된 공간 타입에서만 카드 템플릿이 사용됩니다.</FormDescription>
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
            <Button type='submit' disabled={isLoading}>
              {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
              {editId ? '변경사항 저장' : '템플릿 저장'}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  );
}

export default CardForm;
