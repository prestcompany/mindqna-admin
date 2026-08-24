import { createBulkCardTemplates } from '@/client/card';
import { CardTemplateType, SpaceType } from '@/client/types';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CardUploader } from './CardUploader';

type Props = {
  close: () => void;
};

export const CardUploadModal = ({ close }: Props) => {
  const queryClient = useQueryClient();
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
    setUploadFile(file[0]);
  };

  const handleUpload = async () => {
    if (!locale || !spaceType || !cardType || !uploadFile) return;

    try {
      const result = await createBulkCardTemplates({ locale, cardType, spaceType, file: uploadFile });
      if (result.count > 0) {
        toast.success('업로드 성공');
        await queryClient.invalidateQueries({ queryKey: ['cardTemplates'] });
        close();
      } else {
        toast.error('업로드 실패');
      }
    } catch (err) {
      toast.error('처리중 에러가 발생했습니다.');
    }
  };

  return (
    <div>
      <DefinitionRow label='언어'>
        <ShadSelect
          value={locale ?? ''}
          onValueChange={(v: string) => {
            setLocale(v || undefined);
          }}
        >
          <SelectTrigger className='w-full'>
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
      </DefinitionRow>

      <DefinitionRow label='질문타입'>
        <ShadSelect
          value={cardType ?? ''}
          onValueChange={(v: string) => {
            setCardType((v || undefined) as CardTemplateType | undefined);
          }}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='질문타입' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='basic'>basic</SelectItem>
            <SelectItem value='bonus'>bonus</SelectItem>
          </SelectContent>
        </ShadSelect>
      </DefinitionRow>

      <DefinitionRow label='공간타입'>
        <ShadSelect
          value={spaceType ?? ''}
          onValueChange={(v: string) => {
            setSpaceType((v || undefined) as SpaceType | undefined);
          }}
        >
          <SelectTrigger className='w-full'>
            <SelectValue placeholder='공간타입' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='alone'>혼자</SelectItem>
            <SelectItem value='couple'>커플</SelectItem>
            <SelectItem value='family'>가족</SelectItem>
            <SelectItem value='friends'>친구</SelectItem>
          </SelectContent>
        </ShadSelect>
      </DefinitionRow>

      <div className='pt-4'>
        <CardUploader setFile={handleFile} accept='.xls,.xlsx' />
      </div>

      <div className='pt-6'>
        <Button disabled={isUploadDisable} onClick={handleUpload}>
          업로드 실행
        </Button>
      </div>
    </div>
  );
};
