import type { AdminPushStatus } from '@/client/push';

export type PushAction = 'view' | 'edit' | 'cancel' | 'abort' | 'duplicate' | 'delete';

type PushStatusVariant = 'dotInfo' | 'dotWarning' | 'dotSuccess' | 'dotDanger' | 'dotNeutral';

/**
 * Dot variants throughout: DESIGN.md reserves soft variants for categories and
 * gives status a coloured dot beside neutral text.
 */
export const PUSH_STATUS_META: Record<AdminPushStatus, { label: string; variant: PushStatusVariant }> = {
  SCHEDULED: { label: '예약됨', variant: 'dotInfo' },
  SENDING: { label: '발송 중', variant: 'dotWarning' },
  SENT: { label: '발송 완료', variant: 'dotSuccess' },
  FAILED: { label: '실패', variant: 'dotDanger' },
  CANCELED: { label: '취소됨', variant: 'dotNeutral' },
  ABORTED: { label: '중단됨', variant: 'dotNeutral' },
};

/**
 * Deletion turns on delivery rather than status: one delivered message makes the row a
 * record, and a row that reached nobody is just a mistake worth clearing.
 */
export function allowedActions(status: AdminPushStatus, sentCount: number): PushAction[] {
  const deletable: PushAction[] = sentCount === 0 ? ['delete'] : [];

  switch (status) {
    case 'SCHEDULED':
      return ['edit', 'cancel', ...deletable];
    case 'SENDING':
      return ['view', 'abort'];
    case 'SENT':
    case 'ABORTED':
      return ['view', ...deletable];
    case 'FAILED':
    case 'CANCELED':
      return ['view', 'duplicate', ...deletable];
  }
}
