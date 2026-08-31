import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import React, { useRef } from 'react';
import { CardUploader } from '../../card/CardUploader';
import LottieCDNPlayer from '../LottieCDNPlayer';
import { AnimationFileState } from '../types';

const Lottie = dynamic(() => import('react-lottie-player'), { ssr: false });

interface AnimationFileUploaderProps {
  fileState: AnimationFileState;
  isEditMode: boolean;
  onFileUpload: (files: File[]) => void;
  onReplaceStart: () => void;
  onResetToExisting: () => void;
  onRemoveFile?: () => void;
}

const AnimationFileUploader: React.FC<AnimationFileUploaderProps> = ({
  fileState,
  isEditMode,
  onFileUpload,
  onReplaceStart,
  onResetToExisting,
  onRemoveFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileReplace = () => {
    onReplaceStart();
    fileInputRef.current?.click();
  };

  const handleFileSelect = (files: File[]) => {
    if (files.length > 0) {
      onFileUpload([files[0]]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload([files[0]]);
    }
    e.target.value = '';
  };

  const handleCancel = () => {
    if (isEditMode) {
      onResetToExisting();
    } else {
      onRemoveFile?.();
    }
  };

  const getButtonConfig = () => {
    if (isEditMode) {
      return {
        replaceText: fileState.uploadFile ? '다른 파일 선택' : '파일 교체',
        cancelText: fileState.uploadFile || fileState.isReplacePending ? '교체 취소' : '기존 파일로',
        showCancel: true,
      };
    } else {
      return {
        replaceText: '파일 교체',
        cancelText: '파일 제거',
        showCancel: true,
      };
    }
  };

  if (fileState.isLoading) {
    return <Loader2 className='h-8 w-8 animate-spin' />;
  }

  if (!fileState.animationData && !fileState.existingFileUrl) {
    return <CardUploader setFile={handleFileSelect} accept='.json' />;
  }

  const buttonConfig = getButtonConfig();

  return (
    <div className='flex flex-col gap-4'>
      {fileState.uploadFile && fileState.animationData ? (
        <Lottie loop animationData={fileState.animationData} play style={{ width: 150, height: 150 }} />
      ) : fileState.existingFileUrl ? (
        <LottieCDNPlayer fileUrl={fileState.existingFileUrl} width={150} height={150} />
      ) : null}

      {isEditMode && fileState.isReplacePending && !fileState.uploadFile ? (
        <p className='text-sm text-warning-foreground'>교체할 로티 파일을 선택하거나 교체 취소를 눌러주세요.</p>
      ) : null}

      <div className='flex gap-2'>
        <Button variant='outline' onClick={handleFileReplace}>
          {buttonConfig.replaceText}
        </Button>

        {buttonConfig.showCancel && (
          <Button variant='outline' onClick={handleCancel}>
            {buttonConfig.cancelText}
          </Button>
        )}

        <input ref={fileInputRef} type='file' accept='.json' style={{ display: 'none' }} onChange={handleInputChange} />
      </div>
    </div>
  );
};

export default AnimationFileUploader;
