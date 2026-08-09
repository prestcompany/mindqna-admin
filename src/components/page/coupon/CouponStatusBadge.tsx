import type { CouponStatus } from '@/client/coupon';
import { Badge } from '@/components/ui/badge';

const STATUS_MAP: Record<CouponStatus, { label: string; variant: 'dotInfo' | 'dotSuccess' | 'dotWarning' | 'dotNeutral' }> = {
  SCHEDULED: { label: '예정', variant: 'dotInfo' },
  ACTIVE: { label: '진행중', variant: 'dotSuccess' },
  EXHAUSTED: { label: '소진', variant: 'dotWarning' },
  EXPIRED: { label: '만료', variant: 'dotNeutral' },
};

function CouponStatusBadge({ status }: { status: CouponStatus }) {
  const entry = STATUS_MAP[status];
  if (!entry) return null;

  return <Badge variant={entry.variant}>{entry.label}</Badge>;
}

export default CouponStatusBadge;
