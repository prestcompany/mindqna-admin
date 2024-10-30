import { createBubble, updateBubble } from '@/client/bubble';
import { BubbleType, Locale, PetBubble } from '@/client/types';
import { Button, Checkbox, Form, Input, Radio, Spin, message } from 'antd';
import { useEffect, useState } from 'react';

type Props = {
  init?: PetBubble;
  reload: () => Promise<any>;
  close: () => void;
};

function BubbleForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [locale, setLocale] = useState<Locale>('ko');
  const [_message, setMessage] = useState('');
  const [types, setTypes] = useState<BubbleType[]>(['general']);
  const [levels, setLevels] = useState<number[]>([0]);

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setLocale(init.locale);
    setMessage(init.message);
    setTypes([init.type]);
    setLevels([init.level]);
  }, [init]);

  const localeOptions = [
    { label: 'ko', value: 'ko' },
    { label: 'en', value: 'en' },
    { label: 'ja', value: 'ja' },
    { label: 'zh', value: 'zh' },
    { label: 'zhTw', value: 'zhTw' },
    { label: 'es', value: 'es' },
    { label: 'id', value: 'id' },
  ];

  const typeOptions = [
    { label: '공통', value: 'general' },
    { label: '오전', value: 'day' },
    { label: '오후', value: 'night' },
    { label: '커스텀', value: 'custom' },
  ];

  const levelOptions = Array(13)
    .fill(0)
    .map((_, idx) => ({ label: idx, value: idx }));

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateBubble({
          id: focusedId,
          locale,
          message: _message,
          level: levels[0],
          type: types[0],
        });
      } else {
        for (const level of levels) {
          if (types.includes('general')) {
            await createBubble({
              locale,
              message: _message,
              level,
              type: 'general',
            });
          }

          if (types.includes('day')) {
            await createBubble({
              locale,
              message: _message,
              level,
              type: 'day',
            });
          }
          if (types.includes('night')) {
            await createBubble({
              locale,
              message: _message,
              level,
              type: 'night',
            });
          }
          if (types.includes('custom')) {
            await createBubble({
              locale,
              message: _message,
              level,
              type: 'custom',
            });
          }
        }
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
        <Form.Item label='locale'>
          <Radio.Group
            options={localeOptions}
            optionType='button'
            buttonStyle='solid'
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            disabled={!!focusedId}
          />
        </Form.Item>
        <Form.Item label='메시지'>
          <Input value={_message} onChange={(e) => setMessage(e.target.value)} />
        </Form.Item>
        <Form.Item label='타입'>
          <Checkbox.Group options={typeOptions} value={types} onChange={(values) => setTypes(values as BubbleType[])} disabled={!!focusedId} />
        </Form.Item>
        <Form.Item label='레벨 (0: all)'>
          <Checkbox.Group options={levelOptions} value={levels} onChange={(values) => setLevels(values)} disabled={!!focusedId} />
        </Form.Item>

        <Button onClick={save} size='large' type='primary'>
          저장
        </Button>
      </Form>
    </>
  );
}

export default BubbleForm;
