export const ROUTE_LABELS: Record<string, string> = {
  dashboard: '대시보드',
  analytics: '분석',
  user: '유저',
  list: '목록',
  new: '신규',
  space: '공간',
  template: '템플릿',
  card: '카드',
  interior: '가구',
  room: '방',
  custom: '펫 커스텀',
  bubble: '펫 말풍선',
  exp: '펫 경험치',
  snack: '펫 간식',
  product: '상품',
  purchase: '결제 내역',
  'iap-product': '인앱 상품',
  coupon: '쿠폰',
  game: '게임',
  ranking: '랭킹',
  reward: '보상',
  'reward-policy': '보상 정책',
  marketing: '마케팅',
  banner: '배너',
  push: '푸시',
  resource: '리소스',
  assets: '이미지',
  locales: '다국어',
  'square-library': '라이브러리',
  info: '소식',
  article: '아티클',
};

const COMPOSITE_LAST_SEGMENTS = new Set(['list', 'new']);

export const getRouteLabel = (segment: string) => {
  return ROUTE_LABELS[segment] || segment;
};

export const resolveRouteTitle = (pathname: string) => {
  const segments = pathname.split('/').filter(Boolean);

  if (segments.length === 0) {
    return getRouteLabel('dashboard');
  }

  const lastSegment = segments[segments.length - 1];

  if (COMPOSITE_LAST_SEGMENTS.has(lastSegment) && segments.length > 1) {
    const parent = segments[segments.length - 2];
    return `${getRouteLabel(parent)} ${getRouteLabel(lastSegment)}`;
  }

  return getRouteLabel(lastSegment);
};

export const resolveRouteHeader = (pathname: string) => {
  return {
    title: resolveRouteTitle(pathname),
  };
};
