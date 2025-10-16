import { createSnack, updateSnack } from '@/client/snack';
import { ImgItem, PetType, Snack, SnackKind } from '@/client/types';
import { Button, Form, Image, Input, InputNumber, Radio, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import AssetsDrawer from '../assets/AssetsDrawer';

type Props = {
  initialSnack?: Snack;
  reload: () => Promise<any>;
  close: () => void;
};

const KIND_OPTIONS: { label: string; value: SnackKind }[] = [
  { label: 'normal', value: 'normal' },
  { label: 'special', value: 'special' },
];

const TYPE_OPTIONS: { label: string; value: PetType }[] = [
  { label: '곰', value: 'bear' },
  { label: '고양이', value: 'cat' },
  { label: '강아지', value: 'dog' },
  { label: '펭귄', value: 'penguin' },
  { label: '병아리', value: 'chick' },
  { label: '토끼', value: 'rebbit' },
  { label: '햄스터', value: 'hamster' },
  { label: '다람쥐', value: 'squirrel' },
];

const PREMIUM_OPTIONS = [
  { label: '스타', value: true },
  { label: '하트', value: false },
];

const ACTIVE_OPTIONS = [
  { label: '활성화', value: true },
  { label: '비활성화', value: false },
];

function SnackForm({ initialSnack, close, reload }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  // 기본 정보
  const [image, setImage] = useState<ImgItem>();
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [kind, setKind] = useState<SnackKind>('normal');
  const [type, setType] = useState<PetType | undefined>(undefined);

  // 수치 정보
  const [order, setOrder] = useState(1);
  const [exp, setExp] = useState(0);
  const [isPaid, setIsPaid] = useState(false);
  const [price, setPrice] = useState(0);
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!initialSnack) return;

    if (initialSnack.Img) setImage(initialSnack.Img);
    setFocusedId(initialSnack.id);
    setName(initialSnack.name);
    setDesc(initialSnack.desc ?? '');
    setKind(initialSnack.kind);
    setType(initialSnack.type);
    setOrder(initialSnack.order);
    setExp(initialSnack.exp);
    setIsPaid(initialSnack.isPaid);
    setPrice(initialSnack.price);
    setIsActive(initialSnack.isActive);
  }, [initialSnack]);

  const save = async () => {
    // 생성 모드일 때는 이미지 필수
    if (!focusedId && !image) {
      message.warning('이미지를 선택해주세요');
      return;
    }

    try {
      setLoading(true);

      const payload = {
        imgId: image?.id ?? initialSnack?.Img?.id ?? 0,
        name,
        desc,
        kind,
        type: type ?? undefined,
        order,
        exp,
        isPaid,
        price,
        isActive,
      };

      if (focusedId) {
        await updateSnack({ id: focusedId, ...payload });
      } else {
        await createSnack(payload);
      }

      await reload();
      close();
    } catch (err) {
      message.error(`${err}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Spin spinning={isLoading} fullscreen />

      <Form>
        {/* 이미지 */}
        <Form.Item label='이미지'>
          <div className='flex flex-col gap-2 items-center'>
            {image && <Image width={200} height={200} src={image.uri} alt='img' style={{ objectFit: 'contain' }} />}
            <AssetsDrawer onClick={setImage} />
          </div>
        </Form.Item>

        {/* 기본 정보 */}
        <Form.Item label='이름'>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>

        <Form.Item label='설명'>
          <Input value={desc} onChange={(e) => setDesc(e.target.value)} />
        </Form.Item>

        <Form.Item label='종류'>
          <Radio.Group
            options={KIND_OPTIONS}
            optionType='button'
            buttonStyle='solid'
            value={kind}
            onChange={(e) => setKind(e.target.value)}
          />
        </Form.Item>

        <Form.Item label='진화하는 펫 타입'>
          <Radio.Group
            options={TYPE_OPTIONS}
            optionType='button'
            buttonStyle='solid'
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </Form.Item>

        {/* 수치 정보 */}
        <Form.Item label='순서'>
          <InputNumber min={0} max={4} value={order} onChange={(e) => setOrder(e ?? 0)} />
        </Form.Item>

        <Form.Item label='경험치'>
          <InputNumber min={0} value={exp} onChange={(e) => setExp(e ?? 0)} />
        </Form.Item>

        {/* 가격 정보 */}
        <div className='flex gap-6 items-center'>
          <Form.Item label='코인 타입'>
            <Radio.Group
              options={PREMIUM_OPTIONS}
              optionType='button'
              buttonStyle='solid'
              value={isPaid}
              onChange={(e) => setIsPaid(e.target.value)}
            />
          </Form.Item>

          <Form.Item label='가격'>
            <InputNumber min={0} value={price} onChange={(v) => setPrice(v ?? 0)} />
          </Form.Item>
        </div>

        {/* 활성화 상태 */}
        <Form.Item label='활성화'>
          <Radio.Group
            options={ACTIVE_OPTIONS}
            optionType='button'
            buttonStyle='solid'
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
          />
        </Form.Item>

        <Button onClick={save} size='large' type='primary'>
          저장
        </Button>
      </Form>
    </>
  );
}

export default SnackForm;
