import dayjs from 'dayjs';
import type { Room } from '@/client/types';

export function getPetTypeLabel(type?: string | null) {
  const map: Record<string, string> = {
    dog: '강아지',
    cat: '고양이',
    rebbit: '토끼',
    squirrel: '다람쥐',
    bear: '곰',
    hamster: '햄스터',
    chick: '병아리',
    penguin: '펭귄',
  };
  return type ? map[type] ?? type : null;
}

export function buildRoomCategorySummary(rooms?: Room[]) {
  if (!rooms?.length) return null;
  const labelMap: Record<string, string> = { rooftop: '옥상', inner: '실내', outer: '실외' };
  const counts = rooms.reduce<Record<string, number>>((acc, room) => {
    acc[room.category] = (acc[room.category] ?? 0) + 1;
    return acc;
  }, {});
  return (['rooftop', 'inner', 'outer'] as const)
    .filter((category) => counts[category])
    .map((category) => `${labelMap[category]} ${counts[category]}`)
    .join(' · ');
}

export function getSpaceTypeConfig(type?: string | null) {
  // 타입은 soft 톤으로 서로 구분되게 색을 부여한다 (alarming한 solid 색은 지양).
  const map = {
    alone: { text: '혼자', variant: 'softInfo' },
    couple: { text: '커플', variant: 'tonePink' },
    family: { text: '가족', variant: 'softSuccess' },
    friends: { text: '친구', variant: 'softWarning' },
  } as const;
  return map[type as keyof typeof map] ?? { text: type ?? '-', variant: 'softNeutral' as const };
}

// 생성 경과일에 따른 신선도 색 (최근=초록, 중간=호박, 오래=중립)
export function getRecencyVariant(diffDays: number) {
  if (diffDays < 7) return 'softSuccess' as const;
  if (diffDays < 30) return 'softWarning' as const;
  return 'softNeutral' as const;
}

export function formatDate(value?: string | null, format = 'YY.MM.DD HH:mm:ss') {
  if (!value) return '-';
  return dayjs(value).format(format);
}

export function formatSpaceAge(value: string) {
  const day = dayjs(value);
  const diffFromNow = Math.max(dayjs().diff(day, 'day'), 0);

  return {
    diffLabel: `D+${diffFromNow}`,
    dateText: day.format('YY.MM.DD HH:mm:ss'),
    variant: diffFromNow < 7 ? 'success' : diffFromNow < 30 ? 'warning' : 'muted',
  } as const;
}

export function formatDueRemovedAt(value: string | null | undefined, createdAt: string, hasPremiumMember: boolean) {
  if (!value) {
    return null;
  }

  const day = dayjs(value);
  let diff = day.add(hasPremiumMember ? -60 : -30, 'day').diff(createdAt, 'minute');

  if (diff < 0) {
    diff = day.subtract(2, 'day').diff(createdAt, 'minute');
  }

  const gap = diff > 60 ? `${Math.floor(diff / 60)}h ${diff % 60}m` : `${diff}m`;

  return {
    gapLabel: `${gap}만에 삭제`,
    dateText: day.format('YY.MM.DD HH:mm:ss'),
    variant: diff < 60 ? 'destructive' : 'warning',
  } as const;
}

/**
 * 지표 값에 적용할 색을 결정한다. 0(또는 falsy)이면 회색으로 떨어뜨려
 * "값 없음"이 경고색으로 잘못 강조되는 것을 막는다.
 */
export function getMetricAccent(value: number | null | undefined, activeClass: string) {
  return value && value > 0 ? activeClass : 'text-slate-500';
}
