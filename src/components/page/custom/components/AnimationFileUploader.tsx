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

  if (fileState.isLoading) {
    return <Spin size='large' />;
  }

  // 아무 파일도 없는 경우 - 업로더 표시
  if (!fileState.animationData && !fileState.existingFileUrl) {
    return <CardUploader setFile={handleFileSelect} accept='.json' />;
  }

  return (
    <div className='flex flex-col gap-4'>
      {/* 새로 업로드된 파일이 있으면 Lottie로 표시 */}
      {fileState.uploadFile && fileState.animationData ? (
        <Lottie loop animationData={fileState.animationData} play style={{ width: 150, height: 150 }} />
      ) : fileState.existingFileUrl ? (
        // 기존 파일이 있으면 LottieCDNPlayer로 표시
        <LottieCDNPlayer fileUrl={fileState.existingFileUrl} width={150} height={150} />
      ) : null}

      {/* 파일이 있을 때 버튼들 표시 */}
      {(fileState.animationData || fileState.existingFileUrl) && (
        <div className='flex gap-2'>
          {isEditMode ? (
            // 수정 모드 버튼들
            <>
              {!fileState.uploadFile && (
                <>
                  <Button type='dashed' onClick={handleFileReplace}>
                    파일 교체
                  </Button>
                  <input
                    ref={fileInputRef}
                    type='file'
                    accept='.json'
                    style={{ display: 'none' }}
                    onChange={handleInputChange}
                  />
                </>
              )}
              {fileState.uploadFile && (
                <Button type='default' onClick={handleCancel}>
                  취소
                </Button>
              )}
            </>
          ) : (
            // 신규 생성 모드 버튼들
            <>
              <Button type='dashed' onClick={handleFileReplace}>
                파일 교체
              </Button>
              <Button type='default' onClick={handleCancel}>
                파일 제거
              </Button>
              <input
                ref={fileInputRef}
                type='file'
                accept='.json'
                style={{ display: 'none' }}
                onChange={handleInputChange}
              />
            </>
          )}
        </div>
      )}

      {!isEditMode && <CardUploader setFile={handleFileSelect} accept='.json' />}
    </div>
  );
};

export default AnimationFileUploader;
