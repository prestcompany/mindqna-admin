import {
  createSquareLibrary,
  LibraryData,
  LibrarySubType,
  LibraryType,
  updateSquareLibrary,
} from '@/client/square-library';
import { Locale } from '@/client/types';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';
import { subCategoryOptions } from './constants';

type Props = {
  init?: LibraryData;
  type: LibraryType;
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

const optionsByType = subCategoryOptions as Record<LibraryType, { label: string; value: string }[]>;

const librarySchema = z.object({
  img: z.string().min(1, '이미지 URL을 입력해주세요.'),
  subCategory: z.string().min(1, '타입을 선택해주세요.'),
  name: z.string().min(1, '이름을 입력해주세요.'),
  title: z.string().min(1, '제목 키를 입력해주세요.'),
  content: z.string().optional(),
  link: z.string().optional(),
  isActive: z.boolean(),
  isFixed: z.boolean(),
  locale: z.enum(['ko', 'en', 'ja', 'zh', 'zhTw', 'es', 'id']),
});

type LibraryFormValues = z.infer<typeof librarySchema>;

function LibraryForm({ init, type, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const form = useForm<LibraryFormValues>({
    resolver: zodResolver(librarySchema),
    defaultValues: {
      img: '',
      subCategory: '',
      name: '',
      title: '',
      content: '',
      link: '',
      isActive: false,
      isFixed: false,
      locale: 'ko',
    },
  });

  useEffect(() => {
    if (!init) {
      setFocusedId(undefined);
      form.reset({
        img: '',
        subCategory: '',
        name: '',
        title: '',
        content: '',
        link: '',
        isActive: false,
        isFixed: false,
        locale: 'ko',
      });
      return;
    }

    setFocusedId(init.id);
    form.reset({
      img: init.img ?? '',
      subCategory: init.subCategory,
      name: init.name,
      title: init.title,
      content: init.content || '',
      link: init.link || '',
      isActive: init.isActive,
      isFixed: init.isFixed,
      locale: init.locale,
    });
  }, [init, form]);

  const subOptions = optionsByType[type] ?? [];

  const save = async (values: LibraryFormValues) => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateSquareLibrary(focusedId, {
          img: values.img,
          locale: values.locale,
          subCategory: values.subCategory as LibrarySubType,
          title: values.title,
          content: values.content,
          isFixed: values.isFixed,
          link: values.link ?? '',
          isActive: values.isActive,
          name: values.name,
        });
      } else {
        await createSquareLibrary({
          name: values.name,
          img: values.img,
          category: type,
          subCategory: values.subCategory as LibrarySubType,
          title: values.title,
          content: values.content,
          link: values.link ?? '',
          isActive: values.isActive,
          isFixed: values.isFixed,
          locale: values.locale,
        });
      }

      await reload();
      setFocusedId(undefined);
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
          <FormSection title={focusedId ? '라이브러리 수정' : '라이브러리 추가'} description='콘텐츠 메타데이터와 노출 옵션을 관리합니다.'>
            <FormGroup title='이미지 URL*'>
              <FormField
                control={form.control}
                name='img'
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

            <FormGroup title='타입*'>
              <FormField
                control={form.control}
                name='subCategory'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:grid-cols-3'>
                        {subOptions.map((opt) => (
                          <div key={opt.value}>
                            <RadioGroupItem value={opt.value} id={`subcat-${opt.value}`} className='peer sr-only' />
                            <Label
                              htmlFor={`subcat-${opt.value}`}
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

            <FormGroup title='이름*'>
              <FormField
                control={form.control}
                name='name'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='관리용 이름' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <FormSection title='콘텐츠 정보'>
            <FormGroup title='제목 키*'>
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='예: library.article.title_001' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='내용'>
              <FormField
                control={form.control}
                name='content'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder='내용 키 또는 설명을 입력하세요.' {...field} rows={4} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='링크'>
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
          </FormSection>

          <FormSection title='운영 설정'>
            <FormGroup title='언어*'>
              <FormField
                control={form.control}
                name='locale'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='grid grid-cols-2 gap-2 sm:grid-cols-4'>
                        {localeOptions.map((opt) => (
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

            <FormGroup title='노출 상태'>
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
                        <div>
                          <RadioGroupItem value='true' id='active-true' className='peer sr-only' />
                          <Label
                            htmlFor='active-true'
                            className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                          >
                            활성화
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value='false' id='active-false' className='peer sr-only' />
                          <Label
                            htmlFor='active-false'
                            className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                          >
                            비활성화
                          </Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <FormGroup title='고정 여부'>
              <FormField
                control={form.control}
                name='isFixed'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup
                        value={String(field.value)}
                        onValueChange={(v) => field.onChange(v === 'true')}
                        className='grid grid-cols-2 gap-2 sm:max-w-[280px]'
                      >
                        <div>
                          <RadioGroupItem value='true' id='fixed-true' className='peer sr-only' />
                          <Label
                            htmlFor='fixed-true'
                            className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                          >
                            고정
                          </Label>
                        </div>
                        <div>
                          <RadioGroupItem value='false' id='fixed-false' className='peer sr-only' />
                          <Label
                            htmlFor='fixed-false'
                            className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted/70 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5 peer-data-[state=checked]:text-primary'
                          >
                            고정 안함
                          </Label>
                        </div>
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
              <Button type='button' variant='outline' onClick={close} disabled={isLoading}>
                취소
              </Button>
              <Button type='submit' size='lg' disabled={isLoading}>
                {isLoading && <Loader2 className='mr-2 h-4 w-4 animate-spin' />}
                {focusedId ? '변경사항 저장' : '라이브러리 저장'}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </>
  );
}

export default LibraryForm;
