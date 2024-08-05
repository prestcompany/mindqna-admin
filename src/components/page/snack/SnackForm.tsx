import { createSnack, updateSnack } from '@/client/snack';
import { ImgItem, PetType, Snack, SnackKind } from '@/client/types';
import { Button, Form, Image, Input, InputNumber, Radio, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import AssetsDrawer from '../assets/AssetsDrawer';

type Props = {
  init?: Snack;
  reload: () => Promise<any>;
  close: () => void;
};

function SnackForm({ init, close, reload }: Props) {
  const [isLoading, setLoading] = useState(false);

  const [focusedId, setFocusedId] = useState<number>();
  const [image, setImage] = useState<ImgItem>();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');

  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(0);
  const [order, setOrder] = useState(1);
  const [exp, setExp] = useState(0);
  const [type, setType] = useState<PetType | undefined>(undefined);
  const [kind, setKind] = useState<SnackKind>('normal');
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!init) return;
    if (init.Img) {
      setImage(init.Img);
    }
    setFocusedId(init.id);
    setName(init.name);
    setDesc(init.desc ?? '');
    setIsPaid(init.isPaid);
    setPrice(init.price);
    setOrder(init.order);
    setExp(init.exp);
    setType(init.type);
    setKind(init.kind);
    setIsActive(init.isActive);
  }, [init]);

  const kindOptions: { label: string; value: SnackKind }[] = [
    { label: 'normal', value: 'normal' },
    { label: 'special', value: 'special' },
  ];

  const typeOptions: { label: string; value: PetType }[] = [
    { label: '곰', value: 'bear' },
    { label: '고양이', value: 'cat' },
    { label: '강아지', value: 'dog' },
    { label: '펭귄', value: 'penguin' },
    { label: '병아리', value: 'chick' },
    { label: '토끼', value: 'rebbit' },
    { label: '햄스터', value: 'hamster' },
    { label: '다람쥐', value: 'squirrel' },
  ];

  const premiumOptions = [
    { label: '스타', value: true },
    { label: '하트', value: false },
  ];

  const activeOptions = [
    { label: '활성화', value: true },
    { label: '비활성화', value: false },
  ];

  const save = async () => {
    try {
      if (!image) return;
      setLoading(true);

      if (focusedId) {
        await updateSnack({
          id: focusedId,
          imgId: image.id,
          isPaid,
          name,
          order,
          price,
          exp,
          type: type ?? undefined,
          kind,
          desc,
          isActive,
        });
      } else {
        await createSnack({
          imgId: image.id,
          isPaid,
          name,
          order,
          price,
          exp,
          type: type ?? undefined,
          kind,
          desc,
          isActive,
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
        <Form.Item label='이미지'>
          <div className='flex flex-col items-center gap-2'>
            {image && <Image width={200} height={200} src={image.uri} alt='img' style={{ objectFit: 'contain' }} />}
            <AssetsDrawer onClick={setImage} />
          </div>
        </Form.Item>

        <Form.Item label='이름'>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        <Form.Item label='이름'>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Form.Item>
        <Form.Item label='종료'>
          <Radio.Group options={kindOptions} optionType='button' buttonStyle='solid' value={kind} onChange={(e) => setKind(e.target.value)} />
        </Form.Item>
        <Form.Item label='진화하는 펫 타입'>
          <Radio.Group options={typeOptions} optionType='button' buttonStyle='solid' value={type} onChange={(e) => setType(e.target.value)} />
        </Form.Item>
        <Form.Item label='순서'>
          <InputNumber min={0} max={4} value={order} onChange={(e) => setOrder(e ?? 0)} />
        </Form.Item>
        <Form.Item label='경험치'>
          <InputNumber min={0} value={exp} onChange={(e) => setExp(e ?? 0)} />
        </Form.Item>
        <div className='flex items-center gap-6'>
          <Form.Item label='코인 타입'>
            <Radio.Group options={premiumOptions} optionType='button' buttonStyle='solid' value={isPaid} onChange={(e) => setIsPaid(e.target.value)} />
          </Form.Item>
          <Form.Item label='가격'>
            <InputNumber min={0} value={price} onChange={(v) => setPrice(v ? v : 0)} />
          </Form.Item>
        </div>

        <Form.Item label='활성화'>
          <Radio.Group options={activeOptions} optionType='button' buttonStyle='solid' value={isActive} onChange={(e) => setIsActive(e.target.value)} />
        </Form.Item>

        <Button onClick={save} size='large' type='primary'>
          저장
        </Button>
      </Form>
    </>
  );
}

export default SnackForm;
