import { createCardTemplate, updateCardTemplate } from '@/client/card';
import { CardTemplate, CardTemplateType, SpaceType } from '@/client/types';
import { Button, Checkbox, Divider, Form, Input, Radio, message } from 'antd';
import { useEffect, useState } from 'react';

type Props = {
  init?: CardTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

function CardForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  useEffect(() => {
    if (!init) return;
    const { id, name, locale, type, spaceType, order } = init;
    setEditId(id);
    setLocale(locale);
    setName(name);
    setOrder(order);
    setType(type);
    setSpaceTypes([spaceType]);
  }, [init]);

  const optionsLocale: { label: string; value: string }[] = [
    { label: 'ko', value: 'ko' },
    { label: 'en', value: 'en' },
    { label: 'ja', value: 'ja' },
    { label: 'zh', value: 'zh' },
    { label: 'zhTw', value: 'zhTw' },
    { label: 'es', value: 'es' },
    { label: 'id', value: 'id' },
  ];

  const optionsType: { label: string; value: CardTemplateType }[] = [
    {
      label: 'basic',
      value: 'basic',
    },
    {
      label: 'bonus',
      value: 'bonus',
    },
    // {
    //   label: "랜덤",
    //   value: "random",
    // },
  ];

  const optionsSpaceType: { label: string; value: SpaceType }[] = [
    { label: '혼자', value: 'alone' },
    { label: '커플', value: 'couple' },
    { label: '가족', value: 'family' },
    { label: '친구', value: 'friends' },
  ];

  const [editId, setEditId] = useState<number | undefined>(undefined);
  const [locale, setLocale] = useState(optionsLocale[0].value);
  const [name, setName] = useState('');
  const [type, setType] = useState<CardTemplateType>(optionsType[0].value);
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);
  const [order, setOrder] = useState(0);

  const checkAll = optionsSpaceType.length === spaceTypes.length;
  const indeterminate = spaceTypes.length > 0 && spaceTypes.length < optionsSpaceType.length;

  const disabled = !locale || !name || !type || spaceTypes.length <= 0;

  const clearAll = () => {
    setLocale(optionsLocale[0].value);
    setName('');
    setType(optionsType[0].value);
    setSpaceTypes([]);
    close();
  };

  const handleSubmit = async () => {
    if (disabled) return;
    try {
      setLoading(true);
      if (editId) {
        await updateCardTemplate({ templateId: editId, name, locale, type, spaceTypes });
      } else {
        await createCardTemplate({ name, locale, type, spaceTypes, order });
      }
      messageApi.success({ content: '성공' });
      await reload();
      clearAll();
    } catch (err) {
      messageApi.error({
        content: `실패 ${err}`,
      });
    }
    setLoading(false);
  };

  return (
    <div>
      {contextHolder}
      <Form>
        <Form.Item label='제목'>
          <Input placeholder='질문' value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        <Form.Item label='언어'>
          <Radio.Group options={optionsLocale} value={locale} onChange={(e) => setLocale(e.target.value)} optionType='button' buttonStyle='solid' />
        </Form.Item>
        {!editId && (
          <Form.Item label='순서'>
            <Input placeholder='0을 입력시 가장 마지막에 입력됨' value={order} type='number' onChange={(e) => setOrder(parseInt(e.target.value))} />
          </Form.Item>
        )}

        <Form.Item label='질문 타입'>
          <Radio.Group options={optionsType} value={type} onChange={(e) => setType(e.target.value)} optionType='button' buttonStyle='solid' />
        </Form.Item>
        <Form.Item label='공간 타입'>
          <Checkbox
            indeterminate={indeterminate}
            checked={checkAll}
            onChange={(e) => setSpaceTypes(e.target.checked ? optionsSpaceType.map((option) => option.value) : [])}
          >
            all
          </Checkbox>
          <Divider type='vertical' />
          <Checkbox.Group options={optionsSpaceType} value={spaceTypes} onChange={(checked) => setSpaceTypes(checked)} />
        </Form.Item>
        <Form.Item>
          <Button onClick={handleSubmit} type='primary' htmlType='submit' disabled={disabled} loading={isLoading}>
            {editId ? '수정' : '저장'}
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default CardForm;
