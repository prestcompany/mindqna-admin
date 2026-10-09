import type { AdminPushItem, PushTargetFilter } from '@/client/push';
import { SPACE_TYPE_LABEL } from './push-filter-summary';

/** LEGACY is a filtered campaign saved before target FILTER existed, folded from its rows. */
export type PushTargetKind = 'ALL' | 'FILTER' | 'USER' | 'LEGACY';

export type PushTargetCard = {
  title: string;
  rows: { label: string; value: string }[];
  footnote: string | null;
};

export type PushTargetDisplay = {
  kind: PushTargetKind;
  badge: string;
  /** The one line beside the badge: locale and headcount, whichever are known. */
  summary: string;
  /** What the badge reveals on hover; null when there is nothing beyond the summary. */
  card: PushTargetCard | null;
};

/** A per-user send can name hundreds; the card lists enough to recognise it, not all of them. */
const MAX_NAMES = 10;

const count = (n: number) => `${n.toLocaleString('ko-KR')}명`;

/**
 * The list's 대상 cell, split into a short line and a hover card.
 *
 * The line has to fit one row of a dense table, so it carries only what tells sends apart at
 * a glance: kind, locale, headcount. Everything that explains WHO — a filter's conditions, the
 * names typed in — lives in the card, where it can be read whole instead of wrapping the row.
 */
export function describePushTarget(item: AdminPushItem, parts = 1): PushTargetDisplay {
  const line = (...bits: (string | null)[]) => bits.filter(Boolean).join(' · ');

  if (item.target === 'FILTER') {
    const n = item.targetCount ?? 0;
    return {
      kind: 'FILTER',
      badge: '조건',
      summary: line(item.locale, count(n)),
      card: { title: '조건 발송', rows: filterRows(item.filter ?? {}), footnote: `대상 ${count(n)} · 저장할 때 확정` },
    };
  }

  if (item.target === 'ALL') {
    // A broadcast is counted only once the sender claims it, and then approximately.
    return {
      kind: 'ALL',
      badge: '전체',
      summary: line(item.locale, item.targetCount == null ? null : `약 ${count(item.targetCount)}`),
      card: null,
    };
  }

  // A folded campaign's own userNames are its first chunk's; the audience is the summed count.
  if (parts > 1) {
    return {
      kind: 'LEGACY',
      badge: '조건',
      summary: count(item.targetCount ?? 0),
      card: { title: '조건 발송', rows: [{ label: '저장 방식', value: `이전 방식 · ${parts}개로 나뉨` }], footnote: null },
    };
  }

  const names = item.userNames ?? [];
  const shown = names.slice(0, MAX_NAMES).join(', ');
  const rest = names.length - MAX_NAMES;
  return {
    kind: 'USER',
    badge: '개인',
    summary: count(names.length),
    card:
      names.length > 0
        ? { title: '개인 발송', rows: [{ label: '받는 사람', value: rest > 0 ? `${shown} 외 ${rest}명` : shown }], footnote: null }
        : null,
  };
}

/** One row per condition that was set. A zero bound is a real condition and is shown. */
function filterRows(filter: PushTargetFilter): PushTargetCard['rows'] {
  const rows: PushTargetCard['rows'] = [];
  if (filter.spaceTypes?.length) {
    rows.push({ label: '공간 유형', value: filter.spaceTypes.map((t) => SPACE_TYPE_LABEL[t] ?? t).join(', ') });
  }
  if (filter.spaceLocales?.length) rows.push({ label: '공간 언어', value: filter.spaceLocales.join(', ') });
  const { minCardCount: min, maxCardCount: max } = filter;
  if (min != null && max != null) rows.push({ label: '질문 수', value: `${min}~${max}개` });
  else if (min != null) rows.push({ label: '질문 수', value: `${min}개 이상` });
  else if (max != null) rows.push({ label: '질문 수', value: `${max}개 이하` });
  if (filter.minPetLevel != null) rows.push({ label: '펫 레벨', value: `${filter.minPetLevel} 이상` });
  return rows;
}
