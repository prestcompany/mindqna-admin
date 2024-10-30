import { createBulkCardTemplates } from '@/client/card';
import { CardTemplateType, SpaceType } from '@/client/types';
import { Button, Select } from 'antd';
import { RcFile } from 'antd/es/upload';
import { useEffect, useState } from 'react';
import { CardUploader } from './CardUploader';

export const CardUploadModal = () => {
  const [isUploadDisable, setIsUploadDisable] = useState(true);
  const [cardType, setCardType] = useState<CardTemplateType>();
  const [spaceType, setSpaceType] = useState<SpaceType>();
  const [locale, setLocale] = useState<string>();
  const [uploadFile, setUploadFile] = useState<RcFile>();

  useEffect(() => {
    setIsUploadDisable(!locale || !spaceType || !cardType || !uploadFile);
  }, [uploadFile, locale, spaceType, cardType]);

  const handleFile = (file: RcFile[]) => {
    if (file.length === 0) return;
    console.log('file', file[0]);
    setUploadFile(file[0]);
  };

  const handleUpload = async () => {
    if (!locale || !spaceType || !cardType || !uploadFile) return;
    console.log('upload', locale, spaceType, cardType, uploadFile);

    try {
      const result = await createBulkCardTemplates({ locale, cardType, spaceType, file: uploadFile });
      if (result.count > 0) {
        alert('업로드 성공');
        window.location.reload();
      } else {
        alert('업로드 실패');
      }
    } catch (err) {
      alert('처리중 에러가 발생했습니다.');
    }
  };

  return (
    <div className='flex-col items-center'>
      <div className='flex items-center gap-2 py-4'>
        <Select
          placeholder='언어'
          style={{ width: 120 }}
          options={[
            { label: 'ko', value: 'ko' },
            { label: 'en', value: 'en' },
            { label: 'ja', value: 'ja' },
            { label: 'zh', value: 'zh' },
            { label: 'zhTw', value: 'zhTw' },
            { label: 'es', value: 'es' },
            { label: 'id', value: 'id' },
          ]}
          value={locale}
          onChange={(v: string) => {
            setLocale(v);
          }}
          allowClear
        />
        <Select
          placeholder='질문타입'
          style={{ width: 120 }}
          options={[
            { label: 'basic', value: 'basic' },
            { label: 'bonus', value: 'bonus' },
          ]}
          value={cardType}
          onChange={(v: CardTemplateType) => {
            setCardType(v);
          }}
          allowClear
        />
        <Select
          placeholder='공간타입'
          style={{ width: 120 }}
          options={[
            { label: '혼자', value: 'alone' },
            { label: '커플', value: 'couple' },
            { label: '가족', value: 'family' },
            { label: '친구', value: 'friends' },
          ]}
          value={spaceType}
          onChange={(v: SpaceType) => {
            setSpaceType(v);
          }}
          allowClear
        />
      </div>
      <CardUploader setFile={handleFile} accept='.xls,.xlsx' />

      <div className='pt-10'>
        <Button type='primary' disabled={isUploadDisable} onClick={handleUpload}>
          업로드 실행
        </Button>
      </div>
    </div>
  );
};
