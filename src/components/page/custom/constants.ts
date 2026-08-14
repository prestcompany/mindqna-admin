import { PetTypeForCustom } from '@/client/types';
import { PET_TYPE_OPTIONS } from '@/components/shared/form/constants/pet-options';

export const PetCustomTypeOptions = [
  { label: '효과', value: 'effect' },
  { label: '짝궁', value: 'buddy' },
  { label: '옷장', value: 'closet' },
];

export const premiumOptions = [
  { label: '스타', value: true },
  { label: '하트', value: false },
];

export const petTypeOptions: { label: string; value: PetTypeForCustom }[] = [
  { label: '전체', value: 'null' },
  ...PET_TYPE_OPTIONS,
];
