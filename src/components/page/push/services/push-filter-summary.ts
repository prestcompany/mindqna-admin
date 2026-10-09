import type { SpaceType } from '@/client/types';

/** One label per space type, shared by the filter chips and the description of a filter. */
export const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  alone: '혼자',
  couple: '커플',
  family: '가족',
  friends: '친구',
};
