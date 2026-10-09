import type { PushTargetFilter } from '@/client/push';
import type { SpaceType } from '@/client/types';

/** One label per space type, shared by the filter chips and every summary of a filter. */
export const SPACE_TYPE_LABEL: Record<SpaceType, string> = {
  alone: '혼자',
  couple: '커플',
  family: '가족',
  friends: '친구',
};

/**
 * A FILTER push's conditions on one line, e.g. "친구 · ko · 질문 10~41 · 펫 5+".
 *
 * Locales stay as codes, the same way the list already shows a broadcast's locale. A zero
 * bound is printed — it is a real condition, and dropping it would misdescribe who was sent.
 */
export function summarizePushFilter(filter: PushTargetFilter): string {
  const parts: string[] = [];
  if (filter.spaceTypes?.length) parts.push(filter.spaceTypes.map((t) => SPACE_TYPE_LABEL[t] ?? t).join('/'));
  if (filter.spaceLocales?.length) parts.push(filter.spaceLocales.join('/'));
  const { minCardCount: min, maxCardCount: max } = filter;
  if (min != null && max != null) parts.push(`질문 ${min}~${max}`);
  else if (min != null) parts.push(`질문 ${min}+`);
  else if (max != null) parts.push(`질문 ~${max}`);
  if (filter.minPetLevel != null) parts.push(`펫 ${filter.minPetLevel}+`);
  return parts.join(' · ');
}
