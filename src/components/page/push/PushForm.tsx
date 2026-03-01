import { createPush, CreatePushParams, updatePush } from '@/client/push';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import { z } from 'zod';

const pushSchema = z.object({
  locale: z.string().min(1, '필수'),
  target: z.enum(['ALL', 'USER'], { required_error: '필수' }),
  userNames: z.string().optional(),
  title: z.string().min(1, '필수'),
  message: z.string().min(1, '필수'),
  link: z.string().optional(),
  imgUrl: z.string().optional(),
});

type PushFormValues = z.infer<typeof pushSchema>;

interface IPushFormProps {
  id?: string;
  initialValues?: Partial<CreatePushParams>;
}

const PushForm = ({ id, initialValues }: IPushFormProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<PushFormValues>({
    resolver: zodResolver(pushSchema),
    defaultValues: {
      locale: initialValues?.locale ?? '',
      target: initialValues?.target,
      userNames: '',
      title: initialValues?.title ?? '',
      message: initialValues?.message ?? '',
      link: '',
      imgUrl: '',
    },
  });

  const pushType = form.watch('target');

  const handleFinish = async (formValue: PushFormValues) => {
    try {
      setIsLoading(true);

      const updatedFormValue = {
        ...formValue,
        pushAt: new Date().toISOString(),
        isActive: true,
      } as CreatePushParams;

      if (id) {
        await updatePush({ ...updatedFormValue, id: id, isActive: true });
        toast.success('수정되었습니다');
      } else {
        await createPush(updatedFormValue);
        toast.success('생성되었습니다');
      }
    } catch (e: unknown) {
      toast.error('에러가 발생했습니다');
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinish)} className='my-5'>
          <FormSection title='푸시 발송 등록' description='발송할 푸시 정보를 입력해주세요'>
            <FormGroup title='언어 종류*'>
              <FormField
                control={form.control}
                name='locale'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='flex flex-wrap gap-4'>
                        {LOCALE_OPTIONS.map((locale) => (
                          <div key={locale.value} className='flex items-center gap-2'>
                            <RadioGroupItem value={locale.value} id={`locale-${locale.value}`} />
                            <Label htmlFor={`locale-${locale.value}`}>{locale.label}</Label>
                          </div>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <Separator />

            <FormGroup title='푸시 종류*'>
              <FormField
                control={form.control}
                name='target'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className='flex gap-4'>
                        <div className='flex items-center gap-2'>
                          <RadioGroupItem value='ALL' id='target-all' />
                          <Label htmlFor='target-all'>전체</Label>
                        </div>
                        <div className='flex items-center gap-2'>
                          <RadioGroupItem value='USER' id='target-user' />
                          <Label htmlFor='target-user'>개인</Label>
                        </div>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            {pushType === 'USER' && (
              <>
                <Separator />
                <FormGroup title='사용자 ID*'>
                  <FormField
                    control={form.control}
                    name='userNames'
                    render={({ field }) => (
                      <FormItem>
                        <FormControl>
                          <Textarea placeholder='유저 코드를 입력하세요 ("," 로 구분합니다.)' {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </FormGroup>
              </>
            )}

            <Separator />

            <FormGroup title='제목*'>
              <FormField
                control={form.control}
                name='title'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='푸시 제목을 입력하세요' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <Separator />

            <FormGroup title='내용*'>
              <FormField
                control={form.control}
                name='message'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea placeholder='내용을 입력하세요' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <Separator />

            <FormGroup title='링크 URL'>
              <FormField
                control={form.control}
                name='link'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='이동시킬 링크 URL을 입력하세요' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>

            <Separator />

            <FormGroup title='이미지 URL'>
              <FormField
                control={form.control}
                name='imgUrl'
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder='이동시킬 링크 URL을 입력하세요' {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </FormGroup>
          </FormSection>

          <div className='text-center'>
            <Button type='submit' disabled={isLoading}>
              저장
            </Button>
          </div>
        </form>
      </Form>
    </>
  );
};

export default React.memo(PushForm);
