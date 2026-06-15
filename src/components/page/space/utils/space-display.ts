import dayjs from 'dayjs';

export function getSpaceTypeConfig(type?: string | null) {
  const typeTextMap: Record<string, string> = {
    alone: '혼자',
    couple: '커플',
    family: '가족',
    friends: '친구',
  };

  // 카테고리(타입)는 의미색(빨강/초록 등) 대신 중립 톤으로 표기한다.
  return {
    text: typeTextMap[type ?? ''] ?? type ?? '-',
    variant: 'softNeutral' as const,
  };
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
  return value && value > 0 ? activeClass : 'text-slate-400';
}
