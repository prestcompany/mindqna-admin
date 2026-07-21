import { getBannerLocations } from '@/client/banner';
import { useQuery } from '@tanstack/react-query';

export type BannerLocationOption = { value: string; label: string };

// Fallback used when GET /admin/banner/locations is unavailable or returns nothing
// (e.g. a backend without the location registry deployed). Keeps the dropdown/labels
// working; the backend response takes precedence whenever it returns a non-empty list.
const FALLBACK_BANNER_LOCATIONS: BannerLocationOption[] = [
  { value: 'main_bottom', label: '홈-우체통-하단' },
  { value: 'main_right_small', label: '홈-네비게이터-하단' },
  { value: 'push_top', label: '알림-헤더-하단' },
  { value: 'wallet_charge_top', label: '지갑-무료충전소-상단' },
  { value: 'wallet_charge', label: '지갑-무료충전소-하단' },
  { value: 'main_popup', label: '홈-메인-팝업' },
  { value: 'square_library_top', label: '광장-라이브러리-상단' },
  { value: 'partner_charge', label: '제휴 충전소' },
  { value: 'space_settings', label: '공간 설정 화면' },
];

// Shared source for the banner "노출 위치" dropdown/labels (form + list).
// Driven by GET /admin/banner/locations so new backend locations need no frontend change,
// with a static fallback so the UI still works when that endpoint is empty/unavailable.
// React Query dedupes by key, so multiple consumers share one request.
export function useBannerLocations(): BannerLocationOption[] {
  const { data } = useQuery({ queryKey: ['banner-locations'], queryFn: getBannerLocations });
  if (!Array.isArray(data) || data.length === 0) return FALLBACK_BANNER_LOCATIONS;

  return data.map((location) => ({ value: location.key, label: location.label }));
}
