import { createPush, CreatePushParams } from '@/client/push';
import DefaultForm from '@/components/shared/form/ui/default-form';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import { Button, Checkbox, Divider, Form, Input, message, Radio } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import TextArea from 'antd/lib/input/TextArea';
import React, { useState } from 'react';

interface IPushFormProps {
  id?: string;
  initialValues?: Partial<CreatePushParams>;
}

const PushForm = ({ id, initialValues }: IPushFormProps) => {
  const [form] = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [pushType, setPushType] = useState<string>('');
  const localeOptions = [
    { label: 'ko', value: 'ko' },
    { label: 'en', value: 'en' },
    { label: 'ja', value: 'ja' },
    { label: 'zh', value: 'zh' },
    { label: 'zhTw', value: 'zhTw' },
    { label: 'es', value: 'es' },
  ];

  const handleFinish = async (formValue: CreatePushParams) => {
    try {
      setIsLoading(true);

      if (id) {
        // await updatePush(id);
        messageApi.success('수정되었습니다');
      } else {
        await createPush(formValue);
        messageApi.success('생성되었습니다');
      }
    } catch (e: unknown) {
      messageApi.error('에러가 발생했습니다');
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  return (
    <>
      {contextHolder}
      <DefaultForm<CreatePushParams> form={form} initialValues={initialValues} onFinish={handleFinish}>
        <FormSection title='푸시 발송 등록' description='발송할 푸시 정보를 입력해주세요'>
          <FormGroup title='언어 종류*'>
            <Form.Item name='locale' rules={[{ required: true, message: '필수값입니다' }]}>
              <Checkbox.Group>
                <Checkbox value='all'>전체</Checkbox>
                {localeOptions.map((locale) => (
                  <Checkbox key={locale.value} value={locale.value}>
                    {locale.label}
                  </Checkbox>
                ))}
              </Checkbox.Group>
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='푸시 종류*'>
            <Form.Item name='target' rules={[{ required: true, message: '필수값입니다' }]}>
              <Radio.Group onChange={(e) => setPushType(e.target.value)}>
                <Radio value='ALL'>전체</Radio>
                <Radio value='USER'>개인</Radio>
              </Radio.Group>
            </Form.Item>
          </FormGroup>

          {pushType === 'PERSONAL' && ( // 조건부 렌더링 추가
            <>
              <Divider />
              <FormGroup title='사용자 ID'>
                <Form.Item name='userNames' rules={[{ required: false }]}>
                  <TextArea placeholder='사용자 ID를 입력하세요 ("," 로 구분합니다.)' />
                </Form.Item>
              </FormGroup>
            </>
          )}

          <Divider />

          <FormGroup title='제목*'>
            <Form.Item name='title' rules={[{ required: true, message: '필수값입니다' }]}>
              <Input placeholder='푸시 제목을 입력하세요' />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='내용*'>
            <Form.Item name='message' rules={[{ required: true, message: '필수값입니다' }]}>
              <TextArea placeholder='내용을 입력하세요' />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='링크 URL'>
            <Form.Item name='link' rules={[{ required: false }]}>
              <Input placeholder='이동시킬 링크 URL을 입력하세요' />
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='이미지 URL'>
            <Form.Item name='price' rules={[{ required: false }]}>
              <Input placeholder='이동시킬 링크 URL을 입력하세요' />
            </Form.Item>
          </FormGroup>
        </FormSection>

        {/* <FormSection title='상품상세' description='상품 상세 정보를 입력해주세요'>
          <FormGroup title='상품상세'>
            <Form.Item name='description'>
              <QuillEditor />
            </Form.Item>
          </FormGroup>
        </FormSection> */}

        <div className='text-center'>
          <Button htmlType='submit' type='primary' loading={isLoading}>
            저장
          </Button>
        </div>
      </DefaultForm>
    </>
  );
};

export default React.memo(PushForm);
