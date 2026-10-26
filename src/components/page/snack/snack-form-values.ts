import type { PetType } from '@/client/types';
import { PET_TYPE_OPTIONS } from '@/components/shared/form/constants/pet-options';
import { z } from 'zod';

export const COMMON_SNACK_TYPE = 'common';
export const DEFAULT_SNACK_EXP = 0.5;

export const EVOLUTION_SNACK_TYPE_OPTIONS = PET_TYPE_OPTIONS.filter(
  ({ value }) => value !== 'deer' && value !== 'pig',
);

type SnackFormType = PetType | typeof COMMON_SNACK_TYPE;

export const snackTypeSchema = z.custom<SnackFormType>(
  (value) =>
    value === COMMON_SNACK_TYPE ||
    EVOLUTION_SNACK_TYPE_OPTIONS.some((option) => option.value === value),
  { message: '공통 또는 진화 가능한 펫 타입을 다시 선택해주세요.' },
);

export function toSnackFormType(type: PetType | null): SnackFormType {
  return type ?? COMMON_SNACK_TYPE;
}

export function toSnackApiType(type: SnackFormType): PetType | null {
  return type === COMMON_SNACK_TYPE ? null : type;
}
