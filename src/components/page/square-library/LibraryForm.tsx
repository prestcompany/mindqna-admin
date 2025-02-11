import { createSquareLibrary, LibraryData, LibrarySubType, LibraryType, updateSquareLibrary } from '@/client/square-library';
import { Locale } from '@/client/types';
import { Button, Form, Input, message, Radio, Spin } from 'antd';
import TextArea from 'antd/es/input/TextArea';
import { useEffect, useState } from 'react';
import { subCategoryOptions } from './LibraryList';

type Props = {
  init?: LibraryData;
  type: LibraryType;
  reload: () => Promise<any>;
  close: () => void;
};

function LibraryForm({ init, type, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [img, setImg] = useState<string>('');
  const [category, setCategory] = useState<LibraryType>(type);
  const [subCategory, setSubCategory] = useState<LibrarySubType>();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [link, setLink] = useState('');
  const [isActive, setIsActive] = useState(false);
  const [isFixed, setIsFixed] = useState(false);
  const [locale, setLocale] = useState<Locale>('ko');
  const [name, setName] = useState('');

  useEffect(() => {
    if (!init) {
      setImg('');
      setFocusedId(undefined);
      setLocale('ko');
      setSubCategory(undefined);
      setTitle('');
      setContent('');
      setLink('');
      setIsActive(false);
      setIsFixed(false);
      setName('');
      return;
    }
    setImg(init.img ?? '');
    setFocusedId(init.id);
    setLocale(init.locale);
    setSubCategory(init.subCategory);
    setTitle(init.title);
    setContent(init.content || '');
    setLink(init.link || '');
    setIsActive(init.isActive);
    setIsFixed(init.isFixed);
    setName(init.name);
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

  const activeOptions = [
    { label: '활성화', value: true },
    { label: '비활성화', value: false },
  ];

  const fixOptions = [
    { label: '고정', value: true },
    { label: '고정 안함', value: false },
  ];

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateSquareLibrary(focusedId, {
          img,
          locale,
          subCategory,
          title,
          content,
          isFixed,
          link,
          isActive,
          name,
        });
      } else {
        await createSquareLibrary({
          name,
          img,
          category,
          subCategory: subCategory as LibrarySubType,
          title,
          content,
          link,
          isActive,
          isFixed,
          locale,
        });
      }

      await reload();
      setImg('');
      setFocusedId(undefined);
      setLocale('ko');
      setSubCategory(undefined);
      setTitle('');
      setContent('');
      setLink('');
      setIsActive(false);
      setIsFixed(false);
      setName('');
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
          <Input value={img} onChange={(e) => setImg(e.target.value)} />
        </Form.Item>
        {/* <Form.Item label='국가'>
          <Radio.Group options={localeOptions} optionType='button' buttonStyle='solid' value={locale} onChange={(e) => setLocale(e.target.value)} />
        </Form.Item> */}
        <Form.Item label='타입'>
          <Radio.Group
            options={subCategoryOptions[type]}
            optionType='button'
            buttonStyle='solid'
            value={subCategory}
            onChange={(e) => setSubCategory(e.target.value)}
          />
        </Form.Item>
        <Form.Item label='이름'>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        <Form.Item label='제목키'>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </Form.Item>
        <Form.Item label='내용키'>
          <TextArea value={content} onChange={(e) => setContent(e.target.value)} />
        </Form.Item>
        <Form.Item label='링크'>
          <Input value={link} onChange={(e) => setLink(e.target.value)} />
        </Form.Item>
        <Form.Item label='활성화'>
          <Radio.Group
            options={activeOptions}
            optionType='button'
            buttonStyle='solid'
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            // disabled={!focusedId}
          />
        </Form.Item>
        <Form.Item label='고정'>
          <Radio.Group
            options={fixOptions}
            optionType='button'
            buttonStyle='solid'
            value={isFixed}
            onChange={(e) => setIsFixed(e.target.value)}
            // disabled={!focusedId}
          />
        </Form.Item>

        <Button onClick={save} size='large' type='primary'>
          저장
        </Button>
      </Form>
    </>
  );
}

export default LibraryForm;
