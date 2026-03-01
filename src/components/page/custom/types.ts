import { ImgItem, PetCustomTemplate, PetCustomTemplateType, PetTypeForCustom } from '@/client/types';


export interface CustomFormData {
  name: string;
  type: PetCustomTemplateType;
  petType: PetTypeForCustom;
  petLevel: number;
  fileKey: string;
  isActive: boolean;
  isPremium: boolean;
  price: number;
  image?: ImgItem;
}

export interface LocaleTexts {
  ko: string;
  en: string;
  es: string;
  ja: string;
  zh: string;
  zhTw: string;
  id: string;
}

export interface AnimationFileState {
  uploadFile?: File;
  animationData?: any;
  existingFileUrl: string;
  isLoading: boolean;
}

export interface CustomFormProps {
  isOpen: boolean;
  init?: PetCustomTemplate;
  reload: () => Promise<any>;
  close: () => void;
}
