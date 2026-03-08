import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { AnimationFileState } from '../types';

export const useAnimationFile = () => {
  const [fileState, setFileState] = useState<AnimationFileState>({
    existingFileUrl: '',
    isLoading: false,
    isReplacePending: false,
  });

  const loadExistingAnimation = useCallback(async (fileUrl: string) => {
    setFileState((prev) => ({
      ...prev,
      existingFileUrl: fileUrl,
      animationData: undefined,
      uploadFile: undefined,
      isReplacePending: false,
    }));
  }, []);

  const handleFileUpload = useCallback((files: File[], onFileKeyChange?: (key: string) => void) => {
    console.log('handleFileUpload 호출됨:', files);

    if (!files || files.length === 0) {
      console.log('파일이 없음');
      return;
    }

    const selectedFile = files[0];
    console.log('선택된 파일:', selectedFile.name, selectedFile.type);

    if (!selectedFile.name.endsWith('.json')) {
      toast.error('JSON 파일만 업로드할 수 있습니다.');
      return;
    }

    const fileKey = selectedFile.name.split('.')[0];
    console.log('파일 키:', fileKey);

    onFileKeyChange?.(fileKey);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result;
        if (result) {
          console.log('파일 읽기 성공');
          const json = JSON.parse(result as string);
          console.log('JSON 파싱 성공:', json);
          setFileState({
            existingFileUrl: '',
            isLoading: false,
            uploadFile: selectedFile,
            animationData: json,
            isReplacePending: false,
          });
          console.log('파일 상태 업데이트 완료');
        }
      } catch (error) {
        console.error('JSON 파싱 오류:', error);
        toast.error('업로드한 파일이 유효한 JSON 형식인지 확인해주세요.');
      }
    };

    reader.onerror = (error) => {
      console.error('파일 읽기 오류:', error);
      toast.error('파일을 읽는 중 오류가 발생했습니다.');
    };

    reader.readAsText(selectedFile);
  }, []);

  const startReplace = useCallback(() => {
    setFileState((prev) => ({
      ...prev,
      isReplacePending: true,
    }));
  }, []);

  const resetToExisting = useCallback(() => {
    setFileState((prev) => ({
      ...prev,
      uploadFile: undefined,
      animationData: undefined,
      isReplacePending: false,
    }));
  }, []);

  const removeFile = useCallback(() => {
    setFileState({
      existingFileUrl: '',
      isLoading: false,
      isReplacePending: false,
    });
  }, []);

  const resetFile = useCallback(() => {
    setFileState({
      existingFileUrl: '',
      isLoading: false,
      isReplacePending: false,
    });
  }, []);

  return {
    fileState,
    loadExistingAnimation,
    handleFileUpload,
    startReplace,
    resetToExisting,
    removeFile,
    resetFile,
  };
};
