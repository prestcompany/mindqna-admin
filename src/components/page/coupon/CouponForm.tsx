import { Coupon, createCoupon, updateCoupon } from '@/client/coupon';
import { Button, DatePicker, Form, Input, InputNumber, Radio, Spin, message } from 'antd';
import dayjs from 'dayjs';
import { useEffect, useState } from 'react';

type Props = {
  init?: Coupon;
  reload: () => Promise<any>;
  close: () => void;
};

function CouponForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const [name, setName] = useState('');
  const [count, setCount] = useState(1);
  const [dueAt, setDueAt] = useState(dayjs().format('YYYY-MM-DD'));
  const [reward, setReward] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [ticketCount, setTicketCount] = useState(0);
  const [ticketDueDayNum, setTicketDueDayNum] = useState(0);

  const disabled = !dueAt;

  const premiumOptions = [
    { label: '스타', value: true },
    { label: '하트', value: false },
  ];

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setName(init.name);
    setCount(0);
    setDueAt(dayjs(init.dueAt).format('YYYY-MM-DD'));
    if (init.heart > 0) {
      setIsPaid(false);
      setReward(init.heart);
    }
    if (init.star > 0) {
      setIsPaid(true);
      setReward(init.star);
    }

    setTicketCount(init.ticketCount);
    setTicketDueDayNum(init.ticketDueDayNum);
  }, [init]);

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateCoupon({
          id: focusedId,
          name,
          count,
          dueAt,
          heart: !isPaid ? reward : 0,
          star: isPaid ? reward : 0,
          ticketCount,
          ticketDueDayNum,
        });
      } else {
        await createCoupon({
          name,
          count,
          dueAt,
          heart: !isPaid ? reward : 0,
          star: isPaid ? reward : 0,
          ticketCount,
          ticketDueDayNum,
        });
      }

      await reload();
      close();
    } catch (err) {
      message.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      <Spin spinning={isLoading} fullscreen />
      <Form>
        <Form.Item label='이름'>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>

        <Form.Item label='쿠폰 수'>
          <InputNumber min={0} value={count} onChange={(v) => setCount(v ? v : 0)} />
        </Form.Item>

        <div className='flex items-center gap-6'>
          <Form.Item label='코인 타입'>
            <Radio.Group options={premiumOptions} optionType='button' buttonStyle='solid' value={isPaid} onChange={(e) => setIsPaid(e.target.value)} />
          </Form.Item>
          <Form.Item label='하트/골드 양'>
            <InputNumber min={0} value={reward} onChange={(v) => setReward(v ? v : 0)} />
          </Form.Item>
        </div>

        <Form.Item label='티켓 수'>
          <InputNumber min={0} value={ticketCount} onChange={(v) => setTicketCount(v ? v : 0)} />
        </Form.Item>

        <Form.Item label='티켓 혜택 일 (0=평생권) '>
          <InputNumber min={0} value={ticketDueDayNum} onChange={(v) => setTicketDueDayNum(v ? v : 0)} />
        </Form.Item>

        <Form.Item label='쿠푠 사용 만료일'>
          <DatePicker onChange={(day) => setDueAt(day?.format('YYYY-MM-DD') ?? dayjs().format('YYYY-MM-DD'))} />
        </Form.Item>

        <Button onClick={save} size='large' type='primary' disabled={disabled}>
          저장
        </Button>
      </Form>
    </>
  );
}

export default CouponForm;
