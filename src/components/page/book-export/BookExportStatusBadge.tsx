import type { BookOrderLevel } from '@/client/types';
import { Badge } from '@/components/ui/badge';

const LEVEL_META: Record<BookOrderLevel, { label: string; variant: 'dotSuccess' | 'dotWarning' | 'dotDanger' }> = {
  ok: { label: '정상', variant: 'dotSuccess' },
  warning: { label: '확인 필요', variant: 'dotWarning' },
  error: { label: '추출 불가', variant: 'dotDanger' },
};

export const BOOK_ORDER_LEVEL_LABEL: Record<BookOrderLevel, string> = {
  ok: LEVEL_META.ok.label,
  warning: LEVEL_META.warning.label,
  error: LEVEL_META.error.label,
};

function BookExportStatusBadge({ level }: { level: BookOrderLevel }) {
  const meta = LEVEL_META[level];
  return <Badge variant={meta.variant}>{meta.label}</Badge>;
}

export default BookExportStatusBadge;
