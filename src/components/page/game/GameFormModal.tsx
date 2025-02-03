import { createGame, Game, GameCreateParams, updateGame } from '@/client/game';
import DefaultForm from '@/components/shared/form/ui/default-form';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import DefaultModal from '@/components/shared/ui/default-modal';
import { Button, Divider, Form, Input, message, Radio, Select, Spin } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import React, { useState } from 'react';

// 상수 정의
const LOCALE_OPTIONS = [
  { label: 'ko', value: 'ko' },
  { label: 'en', value: 'en' },
  { label: 'ja', value: 'ja' },
  { label: 'zh', value: 'zh' },
  { label: 'zhTw', value: 'zhTw' },
  { label: 'es', value: 'es' },
  { label: 'id', value: 'id' },
] as const;

const TARGET_OPTIONS = {
  ALL: 'ALL',
  USER: 'USER',
} as const;

interface GameFormProps {
  game?: Game;
  isOpen: boolean;
  close: () => void;
}

const GameFormModal = ({ game, isOpen, close }: GameFormProps) => {
  const [form] = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [gameType, setGameType] = useState<string>('');

  const handleFinish = async (formValue: GameCreateParams) => {
    try {
      setIsLoading(true);
      const updatedFormValue = { ...formValue };

      if (game?.id) {
        await updateGame({ ...updatedFormValue, id: game.id });
        messageApi.success('수정되었습니다');
      } else {
        await createGame(updatedFormValue);
        messageApi.success('생성되었습니다');
      }
    } catch (e) {
      messageApi.error('에러가 발생했습니다');
    } finally {
      setTimeout(() => setIsLoading(false), 500);
    }
  };

  console.log(game?.type);

  return (
    <DefaultModal handleHide={close} open={isOpen} maskClosable={false} width={800}>
      {contextHolder}
      <Spin spinning={isLoading} fullscreen />
      <DefaultForm<GameCreateParams> form={form} initialValues={game} onFinish={handleFinish}>
        <FormSection title={game ? '게임 수정' : '게임 등록'} description={game ? '게임 정보를 수정해주세요' : '등록할 게임 정보를 입력해주세요.'}>
          <FormGroup title='언어 종류*'>
            <Form.Item name='locale' rules={[{ required: true, message: '' }]}>
              <Radio.Group>
                {LOCALE_OPTIONS.map(({ label, value }) => (
                  <Radio key={value} value={value}>
                    {label}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          </FormGroup>

          <Divider />
          <FormGroup title='게임 타입*'>
            <Form.Item name='type' rules={[{ required: true, message: '' }]}>
              <Select>
                <Select.Option value='SPEED_MATH'>사칙연산 빨리하기</Select.Option>
                <Select.Option value='MEMORY_TAP'>기억하고 누르기</Select.Option>
                <Select.Option value='SEQUENCE_TAP'>따라 누르기</Select.Option>
                <Select.Option value='SEQUENCE_TAP_2'>따라 누르기 2</Select.Option>
                <Select.Option value='SWIPE_MATCH'>문지르기</Select.Option>
                <Select.Option value='DODGE_AND_COLLECT'>물건 피하고 재화 받기</Select.Option>
                <Select.Option value='ETC'>기타</Select.Option>
              </Select>
            </Form.Item>
          </FormGroup>

          <Divider />

          <FormGroup title='게임명*'>
            <Form.Item name='name' rules={[{ required: true, message: '' }]}>
              <Input placeholder='게임 제목을 입력해주세요.' />
            </Form.Item>
          </FormGroup>

          <Divider />
        </FormSection>

        <div className='text-center'>
          <Button htmlType='submit' type='primary' loading={isLoading}>
            저장
          </Button>
        </div>
      </DefaultForm>
    </DefaultModal>
  );
};

export default React.memo(GameFormModal);
