import { message } from 'antd';
import { RcFile } from 'antd/es/upload';
import { useCallback, useState } from 'react';
import { AnimationFileState } from '../types';

export const useAnimationFile = () => {
  const [fileState, setFileState] = useState<AnimationFileState>({
    existingFileUrl: '',
    isLoading: false,
  });

  const loadExistingAnimation = useCallback(async (fileUrl: string) => {
    setFileState((prev) => ({
      ...prev,
      existingFileUrl: fileUrl,
      animationData: undefined,
      uploadFile: undefined,
    }));
  }, []);

  const handleFileUpload = useCallback((files: RcFile[], onFileKeyChange?: (key: string) => void) => {
    if (!files || files.length === 0) {
      return;
    }

    const selectedFile = files[0];
    const fileKey = selectedFile.name.split('.')[0];

    onFileKeyChange?.(fileKey);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (result) {
          const json = JSON.parse(result as string);
          setFileState({
            existingFileUrl: '',
            isLoading: false,
            uploadFile: selectedFile,
            animationData: json,
          });
        }
      } catch (error) {
        console.error('JSON 파싱 오류:', error);
        message.error('업로드한 파일이 유효한 JSON 형식인지 확인해주세요.');
      }
    };
    reader.readAsText(selectedFile);
  }, []);

  const resetToExisting = useCallback(() => {
    setFileState((prev) => ({
      ...prev,
      uploadFile: undefined,
      animationData: undefined,
    }));
  }, []);

  const removeFile = useCallback(() => {
    setFileState({
      existingFileUrl: '',
      isLoading: false,
    });
  }, []);

  const resetFile = useCallback(() => {
    setFileState({
      existingFileUrl: '',
      isLoading: false,
    });
  }, []);

  return {
    fileState,
    loadExistingAnimation,
    handleFileUpload,
    resetToExisting,
    removeFile,
    resetFile,
  };
};
