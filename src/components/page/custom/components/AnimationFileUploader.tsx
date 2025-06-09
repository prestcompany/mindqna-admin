import { Button, Spin } from 'antd';
import { RcFile } from 'antd/es/upload';
import dynamic from 'next/dynamic';
import React, { useRef } from 'react';
import { CardUploader } from '../../card/CardUploader';
import LottieCDNPlayer from '../LottieCDNPlayer';
import { AnimationFileState } from '../types';

const Lottie = dynamic(() => import('react-lottie-player'), { ssr: false });

interface AnimationFileUploaderProps {
  fileState: AnimationFileState;
  isEditMode: boolean;
  onFileUpload: (files: RcFile[]) => void;
  onResetToExisting: () => void;
  onRemoveFile?: () => void;
}

const AnimationFileUploader: React.FC<AnimationFileUploaderProps> = ({
  fileState,
  isEditMode,
  onFileUpload,
  onResetToExisting,
  onRemoveFile,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileReplace = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (files: RcFile[]) => {
    // 단일 파일만 처리
    if (files.length > 0) {
      onFileUpload([files[0]]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onFileUpload([files[0] as RcFile]);
    }
    // input 값 초기화 (같은 파일 재선택 가능하도록)
    e.target.value = '';
  };

  const handleCancel = () => {
    if (isEditMode) {
      onResetToExisting();
    } else {
      onRemoveFile?.();
    }
  };

  // 버튼 텍스트와 동작 정의
  const getButtonConfig = () => {
    if (isEditMode) {
      return {
        replaceText: '파일 교체',
        cancelText: fileState.uploadFile ? '취소' : '기존 파일로',
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
    return <Spin size='large' />;
  }

  // 아무 파일도 없는 경우 - 업로더 표시
  if (!fileState.animationData && !fileState.existingFileUrl) {
    return <CardUploader setFile={handleFileSelect} accept='.json' />;
  }

  const buttonConfig = getButtonConfig();

  return (
    <div className='flex flex-col gap-4'>
      {/* 파일 미리보기 */}
      {fileState.uploadFile && fileState.animationData ? (
        <Lottie loop animationData={fileState.animationData} play style={{ width: 150, height: 150 }} />
      ) : fileState.existingFileUrl ? (
        <LottieCDNPlayer fileUrl={fileState.existingFileUrl} width={150} height={150} />
      ) : null}

      {/* 일관된 버튼 레이아웃 */}
      <div className='flex gap-2'>
        <Button type='dashed' onClick={handleFileReplace}>
          {buttonConfig.replaceText}
        </Button>

        {buttonConfig.showCancel && (
          <Button type='default' onClick={handleCancel}>
            {buttonConfig.cancelText}
          </Button>
        )}

        <input ref={fileInputRef} type='file' accept='.json' style={{ display: 'none' }} onChange={handleInputChange} />
      </div>
    </div>
  );
};

export default AnimationFileUploader;
