import DefaultModal from '@/components/shared/ui/default-modal';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { zodResolver } from '@hookform/resolvers/zod';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

const loginSchema = z.object({
  email: z.string().min(1, '이메일을 입력해주세요').email('올바른 이메일 형식을 입력해주세요'),
  password: z.string().min(1, '비밀번호를 입력해주세요'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

const LoginForm = () => {
  const router = useRouter();
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleFinish = useCallback(async (values: LoginFormValues) => {
    setIsLoading(true);

    try {
      await signIn('credentials', {
        email: values.email,
        password: values.password,
        redirect: true,
        callbackUrl: '/',
      });
    } catch (error) {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      {router?.query.error && router?.query.error !== 'CredentialsSignin' ? (
        <div className='mb-3 p-3 bg-amber-50 border border-amber-200 rounded-md text-amber-700 text-sm'>
          로그인 중 오류가 발생했습니다. {router?.query.error}
        </div>
      ) : null}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinish)}>
          <div className='mb-3'>
            {router?.query.error === 'CredentialsSignin' ? (
              <div className='p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm'>
                로그인을 실패했습니다. 아이디 또는 비밀번호를 다시 확인해주세요.
              </div>
            ) : (
              <></>
            )}
          </div>
          <FormField
            control={form.control}
            name='email'
            render={({ field }) => (
              <FormItem className='mb-4'>
                <FormControl>
                  <Input placeholder='이메일' className='h-12 text-base' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem className='mb-4'>
                <FormControl>
                  <Input placeholder='비밀번호' type='password' className='h-12 text-base' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type='submit' size='lg' className='w-full' disabled={isLoading}>
            로그인
          </Button>

          <button
            type='button'
            className='mt-2 inline-block text-sm text-muted-foreground transition-colors hover:text-foreground'
            onClick={() => setShowPasswordModal(true)}
          >
            비밀번호 찾기
          </button>
        </form>
      </Form>

      <DefaultModal title='비밀번호 찾기' open={showPasswordModal} handleHide={() => setShowPasswordModal(false)}>
        임시 로그인 정보는 admin / admin 입니다.
      </DefaultModal>
    </>
  );
};

export default React.memo(LoginForm);
