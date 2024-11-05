import { createLocale, updateLocale } from '@/client/locale';
import { Locale, LocaleWord } from '@/client/types';
import { Button, Checkbox, Form, Input, Spin, message } from 'antd';
import { useEffect, useState } from 'react';

type LocaleFormProps = {
  init?: LocaleWord;
  reload: () => Promise<any>;
  close: () => void;
};

function LocaleForm({ init, reload, close }: LocaleFormProps) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [locales, setLocales] = useState<Locale[]>(['ko', 'en', 'ja', 'zh']);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [valueKo, setValueKo] = useState('');
  const [valueEn, setValueEn] = useState('');
  const [valueJa, setValueJa] = useState('');
  const [valueZh, setValueZh] = useState('');
  const [valueZhTw, setValueZhTw] = useState('');
  const [valueEs, setValueEs] = useState('');
  const [valueId, setValueId] = useState('');

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setLocales([init.locale]);
    setKey(init.key);
    setValue(init.value);
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

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateLocale({
          id: focusedId,
          key,
          locale: locales[0],
          value,
        });
      } else {
        if (locales.includes('ko'))
          await createLocale({
            key,
            locale: 'ko',
            value: valueKo,
          });
        if (locales.includes('en'))
          await createLocale({
            key,
            locale: 'en',
            value: valueEn,
          });
        if (locales.includes('ja'))
          await createLocale({
            key,
            locale: 'ja',
            value: valueJa,
          });
        if (locales.includes('zh'))
          await createLocale({
            key,
            locale: 'zh',
            value: valueZh,
          });
        if (locales.includes('zhTw'))
          await createLocale({
            key,
            locale: 'zhTw',
            value: valueZhTw,
          });
        if (locales.includes('es'))
          await createLocale({
            key,
            locale: 'es',
            value: valueEs,
          });
        if (locales.includes('id'))
          await createLocale({
            key,
            locale: 'id',
            value: valueId,
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
        <Form.Item label='locale'>
          <Checkbox.Group options={localeOptions} value={locales} onChange={(values) => setLocales(values as Locale[])} disabled={!!focusedId} />
        </Form.Item>
        <Form.Item label='key'>
          <Input value={key} onChange={(e) => setKey(e.target.value)} />
        </Form.Item>
        {focusedId ? (
          <Form.Item label='value'>
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          </Form.Item>
        ) : (
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
            <Form.Item label='zhTw'>
              <Input value={valueZhTw} onChange={(e) => setValueZhTw(e.target.value)} />
            </Form.Item>
            <Form.Item label='es'>
              <Input value={valueEs} onChange={(e) => setValueEs(e.target.value)} />
            </Form.Item>
            <Form.Item label='id'>
              <Input value={valueId} onChange={(e) => setValueId(e.target.value)} />
            </Form.Item>
          </>
        )}

        <Button onClick={save} size='large' type='primary'>
          저장
        </Button>
      </Form>
    </>
  );
}

export default LocaleForm;
