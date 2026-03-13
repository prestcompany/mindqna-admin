import dayjs from 'dayjs';

export function getSpaceTypeConfig(type?: string | null) {
  const typeMap = {
    alone: { text: '혼자', variant: 'info' as const },
    couple: { text: '커플', variant: 'destructive' as const },
    family: { text: '가족', variant: 'success' as const },
    friends: { text: '친구', variant: 'warning' as const },
  };

  return typeMap[type as keyof typeof typeMap] ?? { text: type ?? '-', variant: 'muted' as const };
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
