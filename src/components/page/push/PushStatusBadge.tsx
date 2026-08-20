import type { AdminPushStatus } from '@/client/push';
import { Badge } from '@/components/ui/badge';
import { PUSH_STATUS_META } from './services/push-status';

type Props = {
  status: AdminPushStatus;
  failedCount: number;
};

function PushStatusBadge({ status, failedCount }: Props) {
  const meta = PUSH_STATUS_META[status];

  return (
    <div className='space-y-0.5'>
      <Badge variant={meta.variant}>{meta.label}</Badge>
      {/* Text, not colour alone: DESIGN.md forbids signalling by colour. */}
      {failedCount > 0 && (
        <div className='text-xs text-slate-600 tabular-nums'>실패 {failedCount.toLocaleString()}건</div>
      )}
    </div>
  );
}

export default PushStatusBadge;
