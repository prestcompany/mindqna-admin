import dayjs from 'dayjs';

// 가입 상태: 공간(프로필) 생성 여부로 완료/진행중 구분
export function getJoinStatusConfig(isCompleted: boolean) {
  return isCompleted
    ? { text: '완료', variant: 'softSuccess' as const }
    : { text: '진행중', variant: 'softWarning' as const };
}

// 로그인 수단: 브랜드 색을 soft 톤으로 매핑
export function getProviderConfig(provider?: string | null) {
  const map = {
    GOOGLE: { text: 'Google', variant: 'softDanger' },
    KAKAO: { text: 'Kakao', variant: 'softWarning' },
    APPLE: { text: 'Apple', variant: 'softNeutral' },
    LINE: { text: 'Line', variant: 'softSuccess' },
  } as const;
  return map[provider as keyof typeof map] ?? { text: provider ?? '-', variant: 'softNeutral' as const };
}

export function getLocaleLabel(locale?: string | null) {
  const map: Record<string, string> = { ko: 'KO', en: 'EN', ja: 'JA', zh: 'ZH', zhTw: 'TW', es: 'ES', id: 'ID' };
  return map[locale ?? ''] ?? locale?.toUpperCase() ?? '-';
}

// 생성 경과일에 따른 신선도 색 (최근=초록, 중간=호박, 오래=중립)
export function getRecencyVariant(diffDays: number) {
  if (diffDays < 7) return 'softSuccess' as const;
  if (diffDays < 30) return 'softWarning' as const;
  return 'softNeutral' as const;
}

// 0/빈 값은 중립색으로 (의미색은 양수 신호에만)
export function getMetricAccent(value: number | null | undefined, activeClass: string) {
  return value && value > 0 ? activeClass : 'text-slate-500';
}

export function getDaysSince(value?: string | null) {
  return value ? Math.max(dayjs().diff(dayjs(value), 'day'), 0) : 0;
}

export function formatDate(value?: string | null, fmt = 'YYYY.MM.DD HH:mm:ss') {
  return value ? dayjs(value).format(fmt) : '-';
}

export function formatRelativeAccess(value?: string | null) {
  if (!value) {
    return { label: '기록 없음', description: '' };
  }
  const day = dayjs(value);
  const diffMinutes = Math.max(dayjs().diff(day, 'minute'), 0);
  const diffHours = Math.max(dayjs().diff(day, 'hour'), 0);
  const diffDays = Math.max(dayjs().diff(day, 'day'), 0);
  const label = diffMinutes < 60 ? `${diffMinutes}분 전` : diffHours < 24 ? `${diffHours}시간 전` : `${diffDays}일 전`;
  return { label, description: day.format('YYYY.MM.DD HH:mm:ss') };
}

export function formatReserveUnregister(createdAt: string, value?: string | null) {
  if (!value) {
    return null;
  }
  const day = dayjs(value);
  const diff = day.add(-48, 'hour').diff(createdAt, 'minute');
  const gap = diff > 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;
  return { label: `${gap}만에 삭제`, dateText: day.format('YYYY.MM.DD HH:mm:ss'), isUrgent: diff < 60 };
}
