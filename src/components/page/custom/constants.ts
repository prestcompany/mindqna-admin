import type { PetType, PetTypeForCustom } from '@/client/types';
import { PET_TYPE_LABELS, PET_TYPE_OPTIONS } from '@/components/shared/form/constants/pet-options';
import { z } from 'zod';

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
  ...PET_TYPE_OPTIONS.filter(({ value }) => value !== 'deer' && value !== 'pig'),
];

export const customPetTypeSchema = z.custom<PetTypeForCustom>(
  (value) => petTypeOptions.some((option) => option.value === value),
  { message: '전체 또는 진화 가능한 펫 타입을 선택해주세요.' },
);

export function toCustomFormPetType(type: PetType | null): PetTypeForCustom {
  return type ?? 'null';
}

export function toCustomApiPetType(type: PetTypeForCustom): PetType | null {
  return type === 'null' ? null : type;
}

export function getCustomPetTypeLabel(type: PetType | null): string {
  return type === null ? '전체' : PET_TYPE_LABELS[type];
}
