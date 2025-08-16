import { giveTicket } from '@/client/premium';
import { Button, Card, Form, Input, InputNumber, Radio, message } from 'antd';
import { useState } from 'react';

interface TicketFormProps {
  username: string;
  reload: () => Promise<any>;
  close: () => void;
}

function TicketForm({ username, reload, close }: TicketFormProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<'per' | 'sub'>('sub');

  const typeOptions = [
    { label: '🎫 영구 티켓', value: 'per' },
    { label: '⏰ 기간 티켓', value: 'sub' },
  ];

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);

      await giveTicket({
        username,
        amount: values.amount,
        message: values.message || `${type === 'per' ? '영구' : '기간'} 티켓 지급`,
        dueDayNum: type === 'sub' ? values.dueDayNum : undefined,
      });

      message.success(`${values.amount}개 티켓이 지급되었습니다`);
      await reload();
      close();
      form.resetFields();
    } catch (err) {
      message.error(`지급 실패: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='space-y-4'>
      <Card size='small' title='👤 사용자 정보'>
        <div className='flex gap-2 items-center'>
          <span className='font-medium'>Username:</span>
          <span className='text-blue-600'>{username}</span>
        </div>
      </Card>

      <Form form={form} layout='vertical' onFinish={handleSubmit} initialValues={{ amount: 1, dueDayNum: 7 }}>
        <Card size='small' title='🎫 티켓 설정'>
          <Form.Item label='티켓 종류'>
            <Radio.Group
              options={typeOptions}
              optionType='button'
              buttonStyle='solid'
              value={type}
              onChange={(e) => setType(e.target.value)}
            />
          </Form.Item>

          <Form.Item name='amount' label='지급 개수' rules={[{ required: true, message: '개수를 입력해주세요' }]}>
            <InputNumber min={1} max={100} placeholder='지급할 티켓 개수' style={{ width: '100%' }} />
          </Form.Item>

          {type === 'sub' && (
            <Form.Item
              name='dueDayNum'
              label='유효 기간 (일)'
              rules={[{ required: true, message: '기간을 입력해주세요' }]}
            >
              <InputNumber min={1} max={365} placeholder='티켓 유효 기간' style={{ width: '100%' }} addonAfter='일' />
            </Form.Item>
          )}

          <Form.Item name='message' label='메모 (선택사항)'>
            <Input placeholder='티켓 지급 사유나 메모' />
          </Form.Item>
        </Card>

        <div className='flex gap-2 justify-end'>
          <Button onClick={close} disabled={loading}>
            취소
          </Button>
          <Button type='primary' htmlType='submit' loading={loading}>
            티켓 지급
          </Button>
        </div>
      </Form>
    </div>
  );
}

export default TicketForm;
