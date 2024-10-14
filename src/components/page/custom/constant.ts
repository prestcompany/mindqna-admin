import { PetType } from '@/client/types';

export const PetCustomTypeOptions = [
  { label: '효과', value: 'effect' },
  { label: '옷장', value: 'closet' },
  { label: '짝궁', value: 'buddy' },
];

export const premiumOptions = [
  { label: '스타', value: true },
  { label: '하트', value: false },
];

export const petTypeOptions: { label: string; value: PetType }[] = [
  { label: '곰', value: 'bear' },
  { label: '고양이', value: 'cat' },
  { label: '강아지', value: 'dog' },
  { label: '펭귄', value: 'penguin' },
  { label: '병아리', value: 'chick' },
  { label: '토끼', value: 'rebbit' },
  { label: '햄스터', value: 'hamster' },
  { label: '다람쥐', value: 'squirrel' },
];
