import { createGame, Game, GameCreateParams, updateGame } from '@/client/game';
import DefaultForm from '@/components/shared/form/ui/default-form';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import DefaultModal from '@/components/shared/ui/default-modal';
import { Button, ColorPicker, Divider, Form, Input, message, Select, Spin, Switch } from 'antd';
import { useForm } from 'antd/lib/form/Form';
import { PauseIcon, PlayIcon } from 'lucide-react';
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
  refetch: () => void;
}

const GameFormModal = ({ game, isOpen, close, refetch }: GameFormProps) => {
  const [form] = useForm();
  const [isLoading, setIsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();
  const [colors, setColors] = useState({
    backgroundColor: game?.backgroundColor || '',
    primaryKeyColor: game?.primaryKeyColor || '',
    secondaryKeyColor: game?.secondaryKeyColor || '',
    primaryAccentColor: game?.primaryAccentColor || '',
    secondaryAccentColor: game?.secondaryAccentColor || '',
    headerTextColor: game?.headerTextColor || '',
  });
  const [audio, setAudio] = useState<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  const handlePlayAudio = (url: string) => {
    if (!url) {
      messageApi.warning('URL을 입력해주세요');
      return;
    }

    if (audio) {
      if (isPlaying) {
        audio.pause();
        setIsPlaying(false);
      } else {
        audio.play();
        setIsPlaying(true);
      }
    } else {
      const newAudio = new Audio(url);
      newAudio.addEventListener('ended', () => setIsPlaying(false));
      newAudio.play();
      setAudio(newAudio);
      setIsPlaying(true);
    }
  };

  const handleColorChange = (colorKey: string, value: string) => {
    setColors((prev) => ({ ...prev, [colorKey]: value }));
    form.setFieldValue(colorKey, value);
  };

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
      setTimeout(() => {
        setIsLoading(false);
        handleClose();
        refetch();
      }, 500);
    }
  };

  const handleClose = () => {
    if (audio) {
      audio.pause();
      setAudio(null);
      setIsPlaying(false);
    }
    form.resetFields();
    close();
  };

  return (
    <DefaultModal handleHide={handleClose} open={isOpen} maskClosable={false} width={800}>
      {contextHolder}
      <Spin spinning={isLoading} fullscreen />
      <DefaultForm<Game> form={form} initialValues={game} onFinish={handleFinish}>
        <FormSection title={game ? '게임 수정' : '게임 등록'} description={game ? '게임 정보를 수정해주세요' : '등록할 게임 정보를 입력해주세요.'}>
          {/* <FormGroup title='언어 종류*'>
            <Form.Item name='locale' rules={[{ required: true, message: '' }]}>
              <Radio.Group>
                {LOCALE_OPTIONS.map(({ label, value }) => (
                  <Radio key={value} value={value}>
                    {label}
                  </Radio>
                ))}
              </Radio.Group>
            </Form.Item>
          </FormGroup> */}

          <FormGroup title='게임 타입*'>
            <Form.Item name='type' rules={[{ required: true, message: '' }]}>
              <Select disabled={!!game}>
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
          <FormGroup title='라이프 제한'>
            <Form.Item name='playLimitLife'>
              <Input type='number' placeholder='라이프 제한을 입력해주세요.' />
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='제한시간 (초)'>
            <Form.Item name='timeLimitSecond'>
              <Input type='number' placeholder='제한시간을 입력해주세요.' />
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='일일 플레이 제한'>
            <Form.Item name='dailyPlayLimit'>
              <Input type='number' placeholder='일일 플레이 제한을 입력해주세요.' />
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='이용권 충전 (하트)'>
            <Form.Item name='ticketRechargeHeart'>
              <Input type='number' placeholder='하트 충전량을 입력해주세요.' />
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='이용권 충전 (별)'>
            <Form.Item name='ticketRechargeStar'>
              <Input type='number' placeholder='별 충전량을 입력해주세요.' />
            </Form.Item>
          </FormGroup>
          <Divider />

          <FormGroup title='게임 배경음'>
            <Form.Item name='bgmUrl'>
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item name='bgmUrl' noStyle>
                  <Input style={{ width: 'calc(100% - 40px)' }} placeholder='게임 배경음 URL을 입력해주세요.' />
                </Form.Item>
                <Button
                  style={{
                    height: '32px', // Input의 기본 높이와 동일하게
                    width: '40px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  icon={isPlaying ? <PauseIcon /> : <PlayIcon />}
                  onClick={() => handlePlayAudio(form.getFieldValue('bgmUrl'))}
                />
              </Input.Group>
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='게임 배경색'>
            <Form.Item name='backgroundColor'>
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item name='backgroundColor' noStyle>
                  <Input
                    style={{ width: 'calc(30% - 40px)' }}
                    placeholder='#000000'
                    onChange={(e) => {
                      const color = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(color)) {
                        handleColorChange('backgroundColor', color);
                      }
                    }}
                  />
                </Form.Item>
                <ColorPicker
                  format='hex'
                  value={colors.backgroundColor}
                  style={{ width: '40px', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                  onChange={(color) => {
                    handleColorChange('backgroundColor', color.toHexString());
                  }}
                />
              </Input.Group>
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='게임 주요 색상'>
            <Form.Item name='primaryKeyColor'>
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item name='primaryKeyColor' noStyle>
                  <Input
                    style={{ width: 'calc(30% - 40px)' }}
                    placeholder='#000000'
                    onChange={(e) => {
                      const color = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(color)) {
                        handleColorChange('primaryKeyColor', color);
                      }
                    }}
                  />
                </Form.Item>
                <ColorPicker
                  format='hex'
                  value={colors.primaryKeyColor}
                  style={{ width: '40px', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                  onChange={(color) => {
                    handleColorChange('primaryKeyColor', color.toHexString());
                  }}
                />
              </Input.Group>
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='게임 보조 색상'>
            <Form.Item name='secondaryKeyColor'>
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item name='secondaryKeyColor' noStyle>
                  <Input
                    style={{ width: 'calc(30% - 40px)' }}
                    placeholder='#000000'
                    onChange={(e) => {
                      const color = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(color)) {
                        handleColorChange('secondaryKeyColor', color);
                      }
                    }}
                  />
                </Form.Item>
                <ColorPicker
                  format='hex'
                  value={colors.secondaryKeyColor}
                  style={{ width: '40px', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                  onChange={(color) => {
                    handleColorChange('secondaryKeyColor', color.toHexString());
                  }}
                />
              </Input.Group>
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='게임 주요 강조 색상'>
            <Form.Item name='primaryAccentColor'>
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item name='primaryAccentColor' noStyle>
                  <Input
                    style={{ width: 'calc(30% - 40px)' }}
                    placeholder='#000000'
                    onChange={(e) => {
                      const color = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(color)) {
                        handleColorChange('primaryAccentColor', color);
                      }
                    }}
                  />
                </Form.Item>
                <ColorPicker
                  format='hex'
                  value={colors.primaryAccentColor}
                  style={{ width: '40px', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                  onChange={(color) => {
                    handleColorChange('primaryAccentColor', color.toHexString());
                  }}
                />
              </Input.Group>
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='게임 보조 강조 색상'>
            <Form.Item name='secondaryAccentColor'>
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item name='secondaryAccentColor' noStyle>
                  <Input
                    style={{ width: 'calc(30% - 40px)' }}
                    placeholder='#000000'
                    onChange={(e) => {
                      const color = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(color)) {
                        handleColorChange('secondaryAccentColor', color);
                      }
                    }}
                  />
                </Form.Item>
                <ColorPicker
                  format='hex'
                  value={colors.secondaryAccentColor}
                  style={{ width: '40px', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                  onChange={(color) => {
                    handleColorChange('secondaryAccentColor', color.toHexString());
                  }}
                />
              </Input.Group>
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='헤더 텍스트 색상'>
            <Form.Item name='headerTextColor'>
              <Input.Group compact style={{ display: 'flex' }}>
                <Form.Item name='headerTextColor' noStyle>
                  <Input
                    style={{ width: 'calc(30% - 40px)' }}
                    placeholder='#000000'
                    onChange={(e) => {
                      const color = e.target.value;
                      if (/^#[0-9A-F]{6}$/i.test(color)) {
                        handleColorChange('headerTextColor', color);
                      }
                    }}
                  />
                </Form.Item>
                <ColorPicker
                  format='hex'
                  value={colors.headerTextColor}
                  style={{ width: '40px', justifyContent: 'center', alignItems: 'center', display: 'flex' }}
                  onChange={(color) => {
                    handleColorChange('headerTextColor', color.toHexString());
                  }}
                />
              </Input.Group>
            </Form.Item>
          </FormGroup>
          <Divider />
          <FormGroup title='활성 상태'>
            <Form.Item name='isActive' valuePropName='checked'>
              <Switch />
            </Form.Item>
          </FormGroup>
        </FormSection>

        <div className='text-center'>
          <Button htmlType='submit' type='primary' loading={isLoading}>
            {game ? '수정' : '생성'}
          </Button>
        </div>
      </DefaultForm>
    </DefaultModal>
  );
};

export default React.memo(GameFormModal);
