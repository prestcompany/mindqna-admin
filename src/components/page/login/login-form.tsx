import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
        <div className='mb-4 rounded-lg border border-warning/35 bg-warning/15 px-3 py-2 text-sm text-warning-foreground'>
          로그인 중 오류가 발생했습니다. {router?.query.error}
        </div>
      ) : null}
      <Form {...form}>
        <form onSubmit={form.handleSubmit(handleFinish)} className='space-y-4'>
          <div>
            {router?.query.error === 'CredentialsSignin' ? (
              <div className='rounded-lg border border-destructive/25 bg-destructive/10 px-3 py-2 text-sm text-destructive'>
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
              <FormItem>
                <Label className='text-sm font-medium text-foreground'>이메일</Label>
                <FormControl>
                  <Input
                    placeholder='admin@example.com'
                    className='h-11 border-border bg-canvas text-base focus-visible:ring-foreground'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='password'
            render={({ field }) => (
              <FormItem>
                <Label className='text-sm font-medium text-foreground'>비밀번호</Label>
                <FormControl>
                  <Input
                    placeholder='비밀번호'
                    type='password'
                    className='h-11 border-border bg-canvas text-base focus-visible:ring-foreground'
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button
            type='submit'
            size='lg'
            className='h-11 w-full bg-foreground text-white hover:bg-foreground'
            disabled={isLoading}
          >
            {isLoading ? '로그인 중...' : '로그인'}
          </Button>

          <button
            type='button'
            className='inline-block text-sm text-muted-foreground transition-colors hover:text-foreground'
            onClick={() => setShowPasswordModal(true)}
          >
            비밀번호 찾기
          </button>
        </form>
      </Form>

      <Dialog open={showPasswordModal} onOpenChange={(isOpen) => !isOpen && setShowPasswordModal(false)}>
        <DialogContent className='max-w-md'>
          <DialogHeader>
            <DialogTitle>비밀번호 찾기</DialogTitle>
          </DialogHeader>
          <div className='text-sm text-foreground'>
            임시 로그인 정보는{' '}
            <code className='rounded bg-muted px-1.5 py-0.5 text-xs text-foreground'>admin / admin</code> 입니다.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default React.memo(LoginForm);
