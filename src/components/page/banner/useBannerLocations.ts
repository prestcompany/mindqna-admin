import { getBannerLocations } from '@/client/banner';
import { useQuery } from '@tanstack/react-query';

export type BannerLocationOption = { value: string; label: string };

// Shared source for the banner "노출 위치" dropdown/labels (form + list).
// Driven by GET /admin/banner/locations so new backend locations need no frontend change.
// React Query dedupes by key, so multiple consumers share one request.
export function useBannerLocations(): BannerLocationOption[] {
  const { data } = useQuery({ queryKey: ['banner-locations'], queryFn: getBannerLocations });

  return (data ?? []).map((location) => ({ value: location.key, label: location.label }));
}
