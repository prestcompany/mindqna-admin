import type { PdfExportStatus } from '@/client/types';
import { Badge } from '@/components/ui/badge';

const STATUS_META: Record<PdfExportStatus, { label: string; variant: 'dotSuccess' | 'dotNeutral' | 'dotWarning' }> = {
  available: { label: '다운로드 가능', variant: 'dotSuccess' },
  expired_period: { label: '기간 만료', variant: 'dotNeutral' },
  expired_count: { label: '횟수 소진', variant: 'dotWarning' },
};

function PdfExportStatusBadge({ status }: { status: PdfExportStatus }) {
  const meta = STATUS_META[status];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export default PdfExportStatusBadge;
