import type { PdfExportStatus } from '@/client/types';

const STATUS_META: Record<PdfExportStatus, { label: string; className: string }> = {
  available: { label: '다운로드 가능', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  expired_period: { label: '기간 만료', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  expired_count: { label: '횟수 소진', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
};

function PdfExportStatusBadge({ status }: { status: PdfExportStatus }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}
    >
      {meta.label}
    </span>
  );
}

export default PdfExportStatusBadge;
