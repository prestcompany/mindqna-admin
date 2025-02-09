import DefaultModal from '@/components/shared/ui/default-modal';
import { Alert, Button, Form, Input } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/router';
import React, { useCallback, useState } from 'react';

// ... existing code ...
interface ILoginFormValue {
  email: string; // username을 email로 변경
  password: string;
}

const LoginForm = () => {
  const router = useRouter();
  const [form] = useForm<ILoginFormValue>();
  const [isLoading, setIsLoading] = useState(false);
  const [showPasswordModal, setShowPasswordModal] = useState(false);

  const handleFinish = useCallback(async (value: ILoginFormValue) => {
    setIsLoading(true);

    try {
      await signIn('credentials', {
        // 'login-credentials'에서 'credentials'로 변경
        email: value.email, // username을 email로 변경
        password: value.password,
        redirect: true,
        callbackUrl: '/', // 로그인 성공 후 리다이렉트할 경로
      });
    } catch (error) {
      setIsLoading(false);
    }
  }, []);

  return (
    <>
      {router?.query.error && router?.query.error !== 'CredentialsSignin' ? (
        <div className='mb-3'>
          <Alert message={`로그인 중 오류가 발생했습니다. ${router?.query.error}`} type='warning' />
        </div>
      ) : null}
      <Form<ILoginFormValue> form={form} layout='vertical' onFinish={handleFinish}>
        <div className='mb-3'>
          {router?.query.error === 'CredentialsSignin' ? (
            <>
              <Alert message='로그인을 실패했습니다. 아이디 또는 비밀번호를 다시 확인해주세요.' type='error' />
            </>
          ) : (
            <></>
          )}
        </div>
        <Form.Item
          name='email'
          rules={[
            // username을 email로 변경
            { required: true, message: '이메일을 입력해주세요' },
            { type: 'email', message: '올바른 이메일 형식을 입력해주세요' },
          ]}
        >
          <Input size='large' placeholder='이메일' />
        </Form.Item>

        <Form.Item name='password' rules={[{ required: true, message: '비밀번호를 입력해주세요' }]}>
          <Input placeholder='비밀번호' type='password' size='large' />
        </Form.Item>

        <Button size='large' type='primary' htmlType='submit' className='w-full' loading={isLoading}>
          로그인
        </Button>

        <a className='inline-block mt-2 text-gray-400' onClick={() => setShowPasswordModal(true)}>
          비밀번호 찾기
        </a>
      </Form>

      <DefaultModal title='비밀번호 찾기' open={showPasswordModal} handleHide={() => setShowPasswordModal(false)}>
        🔑 임시 로그인 정보는 admin / admin 입니다.
      </DefaultModal>
    </>
  );
};

export default React.memo(LoginForm);
