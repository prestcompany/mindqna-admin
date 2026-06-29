import { forceCreateCard, getSpaceCardEligibility } from '@/client/space';
import type { CardEligibilityStatus, SpaceDetail } from '@/client/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Check, Loader2, X } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { toast } from 'sonner';

const FORCE_ISSUABLE_STATUSES = ['waitingSchedule', 'waitingParticipation', 'needsMembers'];

type StatusVariant = 'softSuccess' | 'softInfo' | 'softWarning' | 'softDanger';

const STATUS_META: Record<CardEligibilityStatus, { label: string; variant: StatusVariant; desc: string }> = {
  issuable: { label: '발급 가능', variant: 'softSuccess', desc: '모든 조건을 충족해 다음 주기에 발급됩니다.' },
  waitingSchedule: { label: '발급 대기', variant: 'softInfo', desc: '예정 시각이 되면 자동 발급됩니다. (정상 대기)' },
  waitingParticipation: {
    label: '참여 대기',
    variant: 'softWarning',
    desc: '직전 카드 참여가 부족해 멤버 답변을 기다리는 중입니다.',
  },
  inactive: { label: '비활성', variant: 'softWarning', desc: 'owner 첫 답변 전이라 공간이 비활성 상태입니다.' },
  needsMembers: { label: '멤버 부족', variant: 'softWarning', desc: '그룹 공간은 활성 멤버 2명 이상이어야 발급됩니다.' },
  noTemplate: { label: '템플릿 소진', variant: 'softDanger', desc: '발급할 다음 카드 템플릿이 없습니다. (조치 필요)' },
  scheduledRemoval: { label: '삭제 예정', variant: 'softDanger', desc: '삭제 예정 공간이라 발급되지 않습니다.' },
  error: { label: '공간 정보 없음', variant: 'softDanger', desc: '공간 정보가 없어 발급 판정이 불가합니다.' },
};

function Metric({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className='min-w-0'>
      <div className='text-xs text-slate-500'>{label}</div>
      <div className='mt-0.5 truncate text-sm font-medium tabular-nums text-slate-900'>{value}</div>
    </div>
  );
}

function SpaceCardEligibilityPanel({
  spaceId,
  active,
  detail,
}: {
  spaceId: string;
  active: boolean;
  detail: SpaceDetail;
}) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-card-eligibility', spaceId],
    queryFn: () => getSpaceCardEligibility(spaceId),
    enabled: active && !!spaceId,
  });

  const queryClient = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const mutation = useMutation({
    mutationFn: () => forceCreateCard(spaceId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['space-card-eligibility', spaceId] }),
        queryClient.invalidateQueries({ queryKey: ['space-detail', spaceId] }),
      ]);
      toast.success('카드를 강제 발급했습니다.');
      setConfirmOpen(false);
    },
    onError: (err) => toast.error((err as any)?.response?.data?.message ?? `${err}`),
  });

  if (isFetching && !data) {
    return (
      <div className='flex min-h-[120px] items-center justify-center rounded-xl border border-slate-200/80 bg-white shadow-sm'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;

  const meta = STATUS_META[data.status] ?? STATUS_META.error;
  const blockedReasons = data.checks.filter((c) => !c.passed);
  const latestText = detail.latestCardIssuedAt
    ? dayjs(detail.latestCardIssuedAt).format('YY.MM.DD HH:mm')
    : '발급 없음';
  const participationText = data.lastCard ? `${data.lastCard.replyCount}/${data.activeMembers} 답변` : '첫 카드';

  return (
    <section className='space-y-3'>
      <div className='flex items-start justify-between gap-3'>
        <div className='flex min-w-0 flex-1 flex-wrap items-center gap-x-3 gap-y-1'>
          <h3 className='text-base font-semibold text-slate-900'>카드 발급 상태</h3>
          <Badge variant={meta.variant}>{meta.label}</Badge>
          <span className='text-xs text-slate-500'>{meta.desc}</span>
        </div>
        {FORCE_ISSUABLE_STATUSES.includes(data.status) ? (
          <Button
            type='button'
            variant='outline'
            size='default'
            className='shrink-0'
            onClick={() => setConfirmOpen(true)}
            disabled={mutation.isPending}
          >
            {mutation.isPending ? <Loader2 className='mr-1 h-4 w-4 animate-spin' /> : null}
            강제 발급
          </Button>
        ) : null}
      </div>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>카드 강제 발급</AlertDialogTitle>
            <AlertDialogDescription>
              게이트(시간·참여·멤버)를 우회해 카드를 즉시 발급합니다. 멤버 전원에게 푸시 알림이 전송되며 이 작업은 되돌릴 수 없습니다.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={mutation.isPending}>취소</AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 text-white hover:bg-rose-700'
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
            >
              강제 발급
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <div className='grid gap-4 lg:grid-cols-2'>
        {/* 카드 현황 — 상세 정보에 흩어져 있던 카드 항목을 취합 */}
        <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
          <div className='mb-3 text-xs font-medium text-slate-500'>카드 현황</div>
          <div className='grid grid-cols-2 gap-x-4 gap-y-3'>
            <Metric label='현재 카드' value={`#${data.cardOrder}`} />
            <Metric label='활성 멤버' value={`${data.activeMembers}명`} />
            <Metric label='발급 시각' value={detail.spaceInfo?.noticeTime || '-'} />
            <Metric label='다음 생성 기준' value={data.nextGenAt ?? '-'} />
            <Metric label='최근 발급' value={latestText} />
            <Metric label='직전 카드 참여' value={participationText} />
          </div>
        </div>

        {/* 발급 조건 — 차단 사유 + 게이트 체크리스트 */}
        <div className='rounded-xl border border-slate-200/80 bg-white shadow-sm'>
          <div className='px-4 pt-3 text-xs font-medium text-slate-500'>발급 조건</div>
          {blockedReasons.length ? (
            <div className='mx-4 mt-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2'>
              <ul className='space-y-0.5'>
                {blockedReasons.map((c) => (
                  <li key={c.key} className='text-sm font-medium text-amber-800'>
                    {c.detail ?? c.label}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
          <div className='mt-1 divide-y divide-slate-100 px-4'>
            {data.checks.map((check) => (
              <div key={check.key} className='flex items-start gap-3 py-2.5'>
                <span
                  className={
                    check.passed
                      ? 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-emerald-600'
                      : 'mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-rose-50 text-rose-600'
                  }
                >
                  {check.passed ? <Check className='h-3 w-3' /> : <X className='h-3 w-3' />}
                </span>
                <div className='min-w-0'>
                  <div className='text-sm font-medium text-slate-900'>{check.label}</div>
                  {!check.passed && check.detail ? <div className='text-xs text-slate-500'>{check.detail}</div> : null}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

export default SpaceCardEligibilityPanel;
