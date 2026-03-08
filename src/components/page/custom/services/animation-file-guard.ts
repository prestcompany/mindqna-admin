export interface CustomAnimationFileGuardParams {
  isEditMode: boolean;
  isReplacePending: boolean;
  hasUploadedFile: boolean;
}

export function getCustomAnimationFileError({
  isEditMode,
  isReplacePending,
  hasUploadedFile,
}: CustomAnimationFileGuardParams): string | null {
  if (!isEditMode && !hasUploadedFile) {
    return '로티 파일을 업로드해주세요.';
  }

  if (isEditMode && isReplacePending && !hasUploadedFile) {
    return '교체할 로티 파일을 선택해주세요.';
  }

  return null;
}
