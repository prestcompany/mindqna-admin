import { uploadSingleFile } from '@/client/assets';
import { createCustomTemplate, updateCustomTemplate } from '@/client/custom';
import { createLocale } from '@/client/locale';
import { Locale } from '@/client/types';
import { AnimationFileState, CustomFormData, LocaleTexts } from '../types';

export interface SaveCustomParams {
  formData: CustomFormData;
  locale: LocaleTexts;
  fileState: AnimationFileState;
  focusedId?: number;
}

export const saveCustomTemplate = async ({
  formData,
  locale,
  fileState,
  focusedId,
}: SaveCustomParams): Promise<void> => {
  if (!formData.image) {
    throw new Error('썸네일 이미지가 필요합니다.');
  }

  // 새 항목 생성시에는 파일 필수
  if (!focusedId && !fileState.uploadFile) {
    throw new Error('로티 파일이 필요합니다.');
  }

  let fileUrl = fileState.existingFileUrl;

  // 새 파일이 업로드된 경우에만 파일 업로드
  if (fileState.uploadFile) {
    fileUrl = await uploadSingleFile(fileState.uploadFile);
  }

  const templateData = {
    imgId: formData.image.id,
    name: formData.name,
    fileKey: formData.fileKey,
    fileUrl,
    petLevel: formData.petLevel,
    petType: formData.petType === 'null' ? null : formData.petType,
    isActive: formData.isActive,
    isPaid: formData.isPremium,
    price: formData.price,
    type: formData.type,
    order: 0,
  };

  if (focusedId) {
    // 업데이트
    await updateCustomTemplate({
      id: focusedId,
      ...templateData,
    });
  } else {
    // 생성
    await createCustomTemplate(templateData);

    // 새 항목일 때만 다국어 생성
    await createLocaleEntries(formData.fileKey, locale);
  }
};

const createLocaleEntries = async (fileKey: string, localeTexts: LocaleTexts): Promise<void> => {
  const localePromises = Object.entries(localeTexts).map(([localeKey, value]) =>
    createLocale({
      key: fileKey,
      locale: localeKey as Locale,
      value,
    }),
  );

  await Promise.all(localePromises);
};
