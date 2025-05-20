import { GameRewardPolicy, updateGameRewardPolicy } from '@/client/game';
import DefaultForm from '@/components/shared/form/ui/default-form';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import DefaultModal from '@/components/shared/ui/default-modal';
import { Button, Divider, Form, InputNumber, Spin, message } from 'antd';
import { useForm } from 'antd/es/form/Form';
import { useEffect, useState } from 'react';

interface GameRewardPolicyModalProps {
  gameRewardPolicy?: GameRewardPolicy;
  isOpen: boolean;
  close: () => void;
  refetch: () => void;
}

const GameRewardPolicyModal = ({ gameRewardPolicy, isOpen, close, refetch }: GameRewardPolicyModalProps) => {
  const [form] = useForm<GameRewardPolicy>();
  const [isLoading, setIsLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const [individualRanks, setIndividualRanks] = useState<any>(null);
  const [rangeRank, setRangeRank] = useState<any>(null);
  const [individualRankKeys, setIndividualRankKeys] = useState<string[]>([]);

  const rankTitleMap: Record<string, string> = {
    rank1: '1등',
    rank2: '2등',
    rank3: '3등',
    rank4: '4등',
    rank5: '5등',
  };
  const handleClose = () => {
    form.resetFields();
    // 상태 초기화 추가
    setIndividualRanks(null);
    setRangeRank(null);
    setIndividualRankKeys([]);
    close();
  };

  const handleFinish = async (values: GameRewardPolicy) => {
    setIsLoading(true);
    const updatedFormValue = { ...values };

    try {
      await updateGameRewardPolicy({ ...updatedFormValue, id: gameRewardPolicy!.id });

      messageApi.success('수정되었습니다');
    } catch (error) {
      messageApi.error('에러가 발생했습니다');
    } finally {
      setTimeout(() => {
        setIsLoading(false);
        handleClose();
        refetch();
      }, 500);
    }
  };

  useEffect(() => {
    if (isOpen && gameRewardPolicy) {
      // 모달이 열리고 데이터가 있을 때 상태 설정
      const condition = gameRewardPolicy.condition || {};
      setIndividualRanks(condition.individualRanks || {});
      setRangeRank(condition.rangeRank || {});
      setIndividualRankKeys(Object.keys(condition.individualRanks || {}));
      // 폼 값 설정
      form.setFieldsValue(gameRewardPolicy);
    } else if (isOpen && !gameRewardPolicy) {
      // 모달이 열리고 데이터가 없을 때 상태 초기화
      setIndividualRanks({});
      setRangeRank({});
      setIndividualRankKeys([]);
      form.resetFields();
    }
  }, [isOpen, gameRewardPolicy, form]);

  useEffect(() => {
    if (isOpen) {
      // 모달이 열릴 때 상태 초기화
      if (gameRewardPolicy) {
        // 데이터가 있을 때
        form.setFieldsValue(gameRewardPolicy);
      } else {
        // 데이터가 없을 때
        form.resetFields();
      }
    } else {
      // 모달이 닫힐 때 상태 초기화
      form.resetFields();
    }
  }, [isOpen, gameRewardPolicy, form]);

  return (
    <DefaultModal open={isOpen} onCancel={handleClose} handleHide={handleClose} maskClosable={false} width={800}>
      {contextHolder}
      <Spin spinning={isLoading} fullscreen />
      <DefaultForm form={form} onFinish={handleFinish}>
        <FormSection title='상위 랭킹 보상' description='상위 랭킹 보상 정책을 수정하세요.' key={individualRankKeys.length}>
          {individualRankKeys.map((key) => (
            <>
              <FormGroup title={rankTitleMap[key]} key={key}>
                <Form.Item key={key} name={['condition', 'individualRanks', key, 'hearts']}>
                  <InputNumber key={key} type='number' value={individualRanks?.[key].hearts} />
                </Form.Item>
              </FormGroup>
              <Divider />
            </>
          ))}
        </FormSection>

        <FormSection title='그 외 랭킹 보상' description='하위 랭킹 보상 정책을 수정하세요.'>
          <FormGroup title='보상'>
            <Form.Item name={['condition', 'rangeRank', 'hearts']}>
              <InputNumber type='number' value={rangeRank?.hearts} />
            </Form.Item>
          </FormGroup>
          <FormGroup title='랭킹 범위 - 시작'>
            <Form.Item name={['condition', 'rangeRank', 'rankStart']}>
              <InputNumber type='number' value={rangeRank?.rankStart} min={1} max={rangeRank?.rankEnd} />
            </Form.Item>
          </FormGroup>
          <FormGroup title='랭킹 범위 - 끝'>
            <Form.Item name={['condition', 'rangeRank', 'rankEnd']}>
              <InputNumber type='number' value={rangeRank?.rankEnd} min={rangeRank?.rankStart} />
            </Form.Item>
          </FormGroup>
          <Divider />
        </FormSection>
        <div className='text-center'>
          <Button htmlType='submit' type='primary' loading={isLoading}>
            {gameRewardPolicy ? '수정' : '생성'}
          </Button>
        </div>
      </DefaultForm>
    </DefaultModal>
  );
};

export default GameRewardPolicyModal;
