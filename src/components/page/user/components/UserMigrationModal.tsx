import { transferUser } from '@/client/user';
import { Alert, Button, Card, Form, Input, Modal } from 'antd';
import { useState } from 'react';

interface UserMigrationModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function UserMigrationModal({ open, onClose, onSuccess }: UserMigrationModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      await transferUser({
        oldUserName: values.oldUserName,
        newUserName: values.newUserName,
      });

      Modal.success({
        title: '로그인 수단 교체 완료',
        content: (
          <div className='space-y-2'>
            <p>
              <strong>{values.oldUserName}</strong> 계정의 로그인 수단이
            </p>
            <p>
              <strong>{values.newUserName}</strong> 계정의 로그인 정보로 교체되었습니다.
            </p>
            <p className='text-sm text-gray-600'>교체된 정보: 로그인 제공자, 소셜 ID, 이메일</p>
          </div>
        ),
      });

      onSuccess();
      onClose();
      form.resetFields();
    } catch (err) {
      Modal.error({
        title: '로그인 수단 교체 실패',
        content: `${err}`,
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    onClose();
    form.resetFields();
  };

  return (
    <Modal
      title='🔄 로그인 수단 교체'
      open={open}
      onCancel={handleCancel}
      width={600}
      footer={[
        <Button key='cancel' onClick={handleCancel} disabled={loading}>
          취소
        </Button>,
        <Button key='submit' type='primary' loading={loading} onClick={() => form.submit()} danger>
          교체 실행
        </Button>,
      ]}
    >
      <div className='space-y-4'>
        {/* 경고 메시지 */}
        <Alert
          message='⚠️ 주의: 되돌릴 수 없는 작업입니다'
          description='기존 계정의 로그인 수단이 새 계정의 로그인 정보로 교체되며, 새 계정은 임시 상태로 변경됩니다.'
          type='warning'
          showIcon
        />

        <Form form={form} layout='vertical' onFinish={handleSubmit}>
          <Card title='📤 기존 계정 (유지할 데이터)' size='small' className='mb-4'>
            <Form.Item
              name='oldUserName'
              label='데이터를 유지할 계정의 유저코드'
              rules={[
                { required: true, message: '기존 계정 ID를 입력해주세요' },
                { min: 10, message: '유효한 유저코드를 입력해주세요' },
              ]}
            >
              <Input placeholder='예: 01234567' size='large' />
            </Form.Item>
            <div className='text-sm text-gray-600'>💡 이 계정의 모든 데이터는 유지되며, 로그인 수단만 교체됩니다.</div>
          </Card>

          <div className='mb-4 text-center'>
            <div className='text-2xl'>🔄</div>
            <div className='text-sm text-gray-500'>로그인 수단 교체</div>
          </div>

          <Card title='📥 새 로그인 계정 (로그인 정보 제공)' size='small' className='mb-4'>
            <Form.Item
              name='newUserName'
              label='로그인 정보를 가져올 계정의 유저코드'
              rules={[
                { required: true, message: '새 계정 ID를 입력해주세요' },
                { min: 10, message: '유효한 유저코드를 입력해주세요' },
              ]}
            >
              <Input placeholder='예: fedcba98' size='large' />
            </Form.Item>
            <div className='text-sm text-gray-600'>💡 이 계정의 로그인 정보가 기존 계정으로 이동합니다.</div>
          </Card>
        </Form>

        {/* 도움말 */}
        <Card size='small' className='bg-blue-50 border-blue-200'>
          <div className='text-sm text-blue-800'>
            <div className='mb-2 font-medium'>🔍 교체되는 정보:</div>
            <ul className='ml-4 space-y-1 list-disc'>
              <li>로그인 제공자 (Google, Kakao, Apple, Line 등)</li>
              <li>소셜 계정 ID</li>
              <li>이메일 주소</li>
            </ul>
            <div className='mt-3 mb-2 font-medium'>📋 작업 과정:</div>
            <ol className='ml-4 space-y-1 list-decimal'>
              <li>새 계정을 임시 상태로 변경</li>
              <li>기존 계정에 새 로그인 정보 적용</li>
              <li>기존 계정의 모든 데이터는 그대로 유지</li>
            </ol>
          </div>
        </Card>
      </div>
    </Modal>
  );
}

export default UserMigrationModal;
