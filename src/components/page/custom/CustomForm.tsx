import { createCustomTemplate, updateCustomTemplate } from '@/client/custom';
import { createLocale } from '@/client/locale';
import { ImgItem, PetCustomTemplate, PetCustomTemplateType } from '@/client/types';
import useTotalRooms from '@/hooks/useTotalRooms';
import { Button, Form, Image, Input, InputNumber, Radio, Spin, message } from 'antd';
import { useEffect, useState } from 'react';
import AssetsDrawer from '../assets/AssetsDrawer';

type CustomFormProps = {
  init?: PetCustomTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

function CustomForm({ init, reload, close }: CustomFormProps) {
  const [isLoading, setLoading] = useState(false);

  const { items } = useTotalRooms();

  const [focusedId, setFocusedId] = useState<number | undefined>(undefined);
  const [image, setImage] = useState<ImgItem>();
  const [name, setName] = useState('');
  const [type, setType] = useState<PetCustomTemplateType>();
  const [category, setCategory] = useState('furniture');
  const [room, setRoom] = useState('room');
  const [isPremium, setIsPremium] = useState(true);
  const [price, setPrice] = useState(0);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);

  const [valueKo, setValueKo] = useState('');
  const [valueEn, setValueEn] = useState('');
  const [valueJa, setValueJa] = useState('');
  const [valueZh, setValueZh] = useState('');

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    if (init.img) {
      setImage(init.img);
    }
    setName(init.name);
    setType(init.type);
    setIsPremium(init.isPaid);
    setPrice(init.price);
  }, [init]);

  const typeOptions = [
    { label: '효과', value: 'effect' },
    { label: '옷장', value: 'closet' },
    { label: '짝궁', value: 'buddy' },
  ];

  const roomOptions = items.map((item) => ({ label: item.type, value: item.type }));

  const premiumOptions = [
    { label: '스타', value: true },
    { label: '하트', value: false },
  ];

  const save = async () => {
    if (!image) return;
    try {
      setLoading(true);
      if (focusedId) {
        await updateCustomTemplate({
          id: focusedId,
          imgId: image.id,
          name,
          isPaid: isPremium,
          price,
          type: 'buddy',
          order: 0,
        });
      } else {
        await createCustomTemplate({
          imgId: image.id,
          name,
          isPaid: isPremium,
          price,
          type: 'buddy',
          order: 0,
        });
        await createLocale({
          key: name,
          locale: 'ko',
          value: valueKo,
        });
        await createLocale({
          key: name,
          locale: 'en',
          value: valueEn,
        });
        await createLocale({
          key: name,
          locale: 'ja',
          value: valueJa,
        });
        await createLocale({
          key: name,
          locale: 'zh',
          value: valueZh,
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
        {!focusedId && (
          <>
            <Form.Item label='ko'>
              <Input value={valueKo} onChange={(e) => setValueKo(e.target.value)} />
            </Form.Item>
            <Form.Item label='en'>
              <Input value={valueEn} onChange={(e) => setValueEn(e.target.value)} />
            </Form.Item>
            <Form.Item label='ja'>
              <Input value={valueJa} onChange={(e) => setValueJa(e.target.value)} />
            </Form.Item>
            <Form.Item label='zh'>
              <Input value={valueZh} onChange={(e) => setValueZh(e.target.value)} />
            </Form.Item>
          </>
        )}

        <Form.Item label='타입'>
          <Radio.Group options={typeOptions} optionType='button' buttonStyle='solid' value={type} onChange={(e) => setType(e.target.value)} />
        </Form.Item>
        <Form.Item label='방 타입'>
          <Radio.Group options={roomOptions} optionType='button' buttonStyle='solid' value={room} onChange={(e) => setRoom(e.target.value)} />
        </Form.Item>
        <div className='flex items-center gap-6'>
          <Form.Item label='코인 타입'>
            <Radio.Group options={premiumOptions} optionType='button' buttonStyle='solid' value={isPremium} onChange={(e) => setIsPremium(e.target.value)} />
          </Form.Item>
          <Form.Item label='가격'>
            <InputNumber min={0} value={price} onChange={(v) => setPrice(v ? v : 0)} />
          </Form.Item>
        </div>
        <div className='flex gap-4'>
          <Form.Item label='width'>
            <InputNumber min={1} max={7} value={width} onChange={(v) => setWidth(v ? v : 1)} />
          </Form.Item>
          <Form.Item label='height'>
            <InputNumber min={1} max={13} value={height} onChange={(v) => setHeight(v ? v : 1)} />
          </Form.Item>
        </div>
        <Button onClick={save} size='large' type='primary'>
          저장
        </Button>
      </Form>
    </>
  );
}

export default CustomForm;

function findMismatchedCoords(coords: { x: number; y: number }[], coordOptions: { label: string; value: { x: number; y: number } }[]): string {
  const mismatchedLabels: string[] = [];

  coordOptions.forEach((option) => {
    const matchedOption = coords.find((coord) => option.value.x === coord.x && option.value.y === coord.y);

    if (!matchedOption) {
      mismatchedLabels.push(option.label);
    }
  });

  return mismatchedLabels.join(' ');
}

function findMismatchedCoordsXY(coords: { x: number; y: number }[], coordOptions: { label: string; value: { x: number; y: number } }[]) {
  const mismatchedValues: { x: number; y: number }[] = [];

  coordOptions.forEach((option) => {
    const matchedOption = coords.find((coord) => option.value.x === coord.x && option.value.y === coord.y);

    if (!matchedOption) {
      mismatchedValues.push(option.value);
    }
  });

  return mismatchedValues;
}

function convertCoordinates(input: string) {
  const coordinates = input.split(' ').map((coord) => {
    const [x, y] = coord
      .replace(/[^\d,]/g, '')
      .split(',')
      .map((value) => parseInt(value));
    return { x, y };
  });
  return coordinates;
}
