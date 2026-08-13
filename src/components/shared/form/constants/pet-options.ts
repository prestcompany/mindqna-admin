import type { PetType } from '@/client/types';

/**
 * Pet levels run 1..MAX_PET_LEVEL. 0 is a sentinel meaning "applies to every level".
 *
 * 16 matches the ceiling the pet custom form already enforces. Levels are ultimately
 * data-driven by the exp rules, so raise this if that table grows — both the bubble form
 * and the bubble list filter read it, and they must not drift apart again: the form used
 * to stop at 12 and the filter at 10, which made levels 13+ unauthorable and 11+
 * unfilterable.
 */
export const MAX_PET_LEVEL = 16;

/** 1..MAX, for filters that have their own separate "all" entry. */
export const PET_LEVEL_VALUES = Array.from({ length: MAX_PET_LEVEL }, (_, index) => index + 1);

/**
 * The single list of animals, in the server enum's order. Four screens each kept their
 * own copy and all four had drifted — every one of them was missing 사슴 and 돼지, so
 * those two could not be picked anywhere in the admin.
 */
export const PET_TYPE_LABELS: Record<PetType, string> = {
  dog: '강아지',
  cat: '고양이',
  rebbit: '토끼',
  squirrel: '다람쥐',
  bear: '곰',
  hamster: '햄스터',
  chick: '병아리',
  penguin: '펭귄',
  deer: '사슴',
  pig: '돼지',
};

export const PET_TYPE_OPTIONS: { label: string; value: PetType }[] = (Object.keys(PET_TYPE_LABELS) as PetType[]).map(
  (value) => ({ label: PET_TYPE_LABELS[value], value }),
);
