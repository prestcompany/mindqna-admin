import { ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import React from 'react';

const pathNameMap: Record<string, string> = {
  dashboard: '대시보드',
  analytics: '분석',
  user: '유저',
  list: '목록',
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

const Breadcrumb = () => {
  const router = useRouter();
  const segments = router.pathname.split('/').filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className='flex gap-1 items-center text-sm'>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const href = '/' + segments.slice(0, index + 1).join('/');
        const label = pathNameMap[segment] || segment;

        return (
          <React.Fragment key={href}>
            {index > 0 && <ChevronRight className='w-3.5 h-3.5 text-muted-foreground' />}
            {isLast ? (
              <span className='font-medium text-foreground'>{label}</span>
            ) : (
              <Link href={href} className='transition-colors text-muted-foreground hover:text-foreground'>
                {label}
              </Link>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default React.memo(Breadcrumb);
