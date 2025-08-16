import { giveCoin } from '@/client/premium';
import { Button, Card, Divider, Form, Input, InputNumber, Radio, Spin, message } from 'antd';
import { useState } from 'react';

type CoinFormProps = {
  spaceId: string;
  currentCoins?: { hearts: number; stars: number };
  reload: () => Promise<any>;
  close: () => void;
};

type OperationType = 'give' | 'take';

function CoinForm({ spaceId, currentCoins, reload, close }: CoinFormProps) {
  const [isLoading, setLoading] = useState(false);
  const [operation, setOperation] = useState<OperationType>('give');
  const [amount, setAmount] = useState(1);
  const [isStar, setStar] = useState(false);
  const [meta, setMetaMessage] = useState('');

  const operationOptions = [
    { label: '🎁 지급', value: 'give' },
    { label: '📤 회수', value: 'take' },
  ];

  const coinTypeOptions = [
    { label: '⭐ 스타', value: true },
    { label: '❤️ 하트', value: false },
  ];

  const getCurrentCoinCount = () => {
    if (!currentCoins) return 0;
    return isStar ? currentCoins.stars : currentCoins.hearts;
  };

  const getMaxTakeAmount = () => {
    const current = getCurrentCoinCount();
    return operation === 'take' ? current : Infinity;
  };

  const save = async () => {
    if (operation === 'take' && amount > getCurrentCoinCount()) {
      message.error(`현재 ${isStar ? '스타' : '하트'} 잔액(${getCurrentCoinCount()})보다 많이 회수할 수 없습니다.`);
      return;
    }

    try {
      setLoading(true);

      const finalAmount = operation === 'take' ? -amount : amount;

      await giveCoin({
        spaceId,
        isStar,
        amount: finalAmount,
        message: meta || `${operation === 'give' ? '지급' : '회수'}: ${amount}개`,
      });

      message.success(`${isStar ? '스타' : '하트'} ${amount}개 ${operation === 'give' ? '지급' : '회수'} 완료`);
      await reload();
      close();
    } catch (err) {
      message.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      <Spin spinning={isLoading} />

      <div className='space-y-6'>
        {/* 현재 잔액 표시 */}
        {currentCoins && (
          <Card size='small' className='bg-gray-50'>
            <div className='text-center'>
              <div className='mb-2 text-lg font-semibold'>현재 잔액</div>
              <div className='flex gap-4 justify-center'>
                <div className='text-center'>
                  <div className='text-2xl'>❤️</div>
                  <div className='font-bold text-red-500'>{currentCoins.hearts}</div>
                  <div className='text-xs text-gray-500'>하트</div>
                </div>
                <div className='text-center'>
                  <div className='text-2xl'>⭐</div>
                  <div className='font-bold text-yellow-500'>{currentCoins.stars}</div>
                  <div className='text-xs text-gray-500'>스타</div>
                </div>
              </div>
            </div>
          </Card>
        )}

        <Form layout='vertical'>
          <Form.Item label='공간 ID'>
            <Input value={spaceId} disabled />
          </Form.Item>

          <Form.Item label='작업 유형'>
            <Radio.Group
              options={operationOptions}
              optionType='button'
              buttonStyle='solid'
              value={operation}
              onChange={(e) => setOperation(e.target.value)}
              size='large'
            />
          </Form.Item>

          <Form.Item label='코인 타입'>
            <Radio.Group
              options={coinTypeOptions}
              optionType='button'
              buttonStyle='solid'
              value={isStar}
              onChange={(e) => setStar(e.target.value)}
              size='large'
            />
          </Form.Item>

          <Form.Item
            label={`${operation === 'give' ? '지급' : '회수'} 수량`}
            extra={operation === 'take' && currentCoins && `최대 ${getCurrentCoinCount()}개 회수 가능`}
          >
            <InputNumber
              min={1}
              max={getMaxTakeAmount()}
              value={amount}
              onChange={(e) => setAmount(e ?? 1)}
              style={{ width: '100%' }}
              size='large'
              formatter={(value) => `${value}개`}
              parser={(value) => value!.replace('개', '') as unknown as number}
            />
          </Form.Item>

          <Form.Item label='메시지 (선택사항)'>
            <Input.TextArea
              value={meta}
              onChange={(e) => setMetaMessage(e.target.value)}
              placeholder={`${operation === 'give' ? '지급' : '회수'} 사유를 입력하세요...`}
              rows={3}
            />
          </Form.Item>

          <Divider />

          <div className='flex gap-2'>
            <Button onClick={close} size='large' style={{ flex: 1 }}>
              취소
            </Button>
            <Button onClick={save} size='large' type='primary' style={{ flex: 2 }} danger={operation === 'take'}>
              {operation === 'give' ? '🎁 지급하기' : '📤 회수하기'}
            </Button>
          </div>
        </Form>
      </div>
    </>
  );
}

export default CoinForm;
