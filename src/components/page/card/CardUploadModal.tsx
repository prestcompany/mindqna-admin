import { createBulkCardTemplates } from '@/client/card';
import { CardTemplateType, SpaceType } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useEffect, useState } from 'react';
import { CardUploader } from './CardUploader';

export const CardUploadModal = () => {
  const [isUploadDisable, setIsUploadDisable] = useState(true);
  const [cardType, setCardType] = useState<CardTemplateType>();
  const [spaceType, setSpaceType] = useState<SpaceType>();
  const [locale, setLocale] = useState<string>();
  const [uploadFile, setUploadFile] = useState<File>();

  useEffect(() => {
    setIsUploadDisable(!locale || !spaceType || !cardType || !uploadFile);
  }, [uploadFile, locale, spaceType, cardType]);

  const handleFile = (file: File[]) => {
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
        <ShadSelect
          value={locale ?? ''}
          onValueChange={(v: string) => {
            setLocale(v || undefined);
          }}
        >
          <SelectTrigger className='w-[120px]'>
            <SelectValue placeholder='언어' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='ko'>ko</SelectItem>
            <SelectItem value='en'>en</SelectItem>
            <SelectItem value='ja'>ja</SelectItem>
            <SelectItem value='zh'>zh</SelectItem>
            <SelectItem value='zhTw'>zhTw</SelectItem>
            <SelectItem value='es'>es</SelectItem>
            <SelectItem value='id'>id</SelectItem>
          </SelectContent>
        </ShadSelect>
        <ShadSelect
          value={cardType ?? ''}
          onValueChange={(v: string) => {
            setCardType((v || undefined) as CardTemplateType | undefined);
          }}
        >
          <SelectTrigger className='w-[120px]'>
            <SelectValue placeholder='질문타입' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='basic'>basic</SelectItem>
            <SelectItem value='bonus'>bonus</SelectItem>
          </SelectContent>
        </ShadSelect>
        <ShadSelect
          value={spaceType ?? ''}
          onValueChange={(v: string) => {
            setSpaceType((v || undefined) as SpaceType | undefined);
          }}
        >
          <SelectTrigger className='w-[120px]'>
            <SelectValue placeholder='공간타입' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='alone'>혼자</SelectItem>
            <SelectItem value='couple'>커플</SelectItem>
            <SelectItem value='family'>가족</SelectItem>
            <SelectItem value='friends'>친구</SelectItem>
          </SelectContent>
        </ShadSelect>
      </div>
      <CardUploader setFile={handleFile} accept='.xls,.xlsx' />

      <div className='pt-10'>
        <Button disabled={isUploadDisable} onClick={handleUpload}>
          업로드 실행
        </Button>
      </div>
    </div>
  );
};
