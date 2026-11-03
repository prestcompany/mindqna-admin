import { getFeatureFlags, updateFeatureFlag } from '@/client/feature-flags';
import type { FeatureFlagItem } from '@/client/types';
import DataTable from '@/components/shared/ui/data-table';
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
import { Switch } from '@/components/ui/switch';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { toast } from 'sonner';
import FeatureFlagEditDialog from './FeatureFlagEditDialog';
import {
  APP_DEFAULT_LABEL,
  busyFlagKeys,
  displayEnabled,
  FEATURE_FLAG_PUT_KEY,
  type FeatureFlagPutVariables,
  summarizeConditions,
  toErrorMessage,
  toToggleParams,
} from './services/feature-flag-form';

const QUERY_KEY = ['feature-flags'];

type PendingToggle = { item: FeatureFlagItem; next: boolean };
type ToggleVariables = PendingToggle & FeatureFlagPutVariables;

function FeatureFlagsManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error } = useQuery({ queryKey: QUERY_KEY, queryFn: getFeatureFlags });
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);
  const [editing, setEditing] = useState<FeatureFlagItem | null>(null);

  const toggle = useMutation({
    mutationKey: FEATURE_FLAG_PUT_KEY,
    mutationFn: ({ item, next }: ToggleVariables) => updateFeatureFlag(item.key, toToggleParams(item, next)),
    onSuccess: async (_, { item, next }) => {
      toast.success(`${item.key} 을(를) ${next ? '켰' : '껐'}습니다.`);
      await queryClient.invalidateQueries({ queryKey: QUERY_KEY });
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  // 한 mutation 인스턴스는 마지막 호출만 기억하므로, 진행 중인 PUT 전부를 mutation 캐시에서 모은다.
  const busyKeys = busyFlagKeys(
    useMutationState({
      filters: { mutationKey: FEATURE_FLAG_PUT_KEY, status: 'pending' },
      select: (mutation) => mutation.state.variables,
    }),
  );

  const columns: ColumnDef<FeatureFlagItem>[] = [
    {
      id: 'key',
      header: '키',
      cell: ({ row: { original: item } }) => (
        <div className='min-w-0 space-y-0.5'>
          <div className='font-mono text-sm text-foreground'>{item.key}</div>
          <div className='text-xs text-muted-foreground'>{item.label}</div>
          {item.row?.description ? <div className='text-xs text-foreground'>{item.row.description}</div> : null}
        </div>
      ),
    },
    {
      id: 'enabled',
      header: '상태',
      size: 200,
      cell: ({ row: { original: item } }) => {
        // 빌드 설정 키는 서버가 실제 상태를 모른다. 꺼짐으로 그리면 운영(켬)과 다르게 보여서 편집에서 만들게 한다.
        const envWithoutRow = !item.row && item.appDefault === 'env';
        const control = (
          <Switch
            aria-label={`${item.key} 켬/끔`}
            checked={displayEnabled(item)}
            disabled={busyKeys.has(item.key) || envWithoutRow}
            onCheckedChange={(next) => setPendingToggle({ item, next })}
          />
        );
        return (
          <div className='flex items-center gap-2'>
            {envWithoutRow ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span tabIndex={0}>{control}</span>
                </TooltipTrigger>
                <TooltipContent>편집에서 켬/끔을 골라 만드세요</TooltipContent>
              </Tooltip>
            ) : (
              control
            )}
            {item.row ? null : <Badge variant='softNeutral'>앱 기본값: {APP_DEFAULT_LABEL[item.appDefault]}</Badge>}
          </div>
        );
      },
    },
    {
      id: 'conditions',
      header: '조건',
      cell: ({ row: { original: item } }) => (
        <span className='text-sm text-foreground'>{item.row ? summarizeConditions(item.row) : '-'}</span>
      ),
    },
    {
      id: 'updatedAt',
      header: '수정 시각',
      size: 150,
      cell: ({ row: { original: item } }) => (
        <span className='text-sm tabular-nums text-muted-foreground'>
          {item.row ? dayjs(item.row.updatedAt).format('YYYY-MM-DD HH:mm') : '-'}
        </span>
      ),
    },
    {
      id: 'actions',
      header: '',
      size: 80,
      cell: ({ row: { original: item } }) => (
        <Button size='sm' variant='outline' disabled={busyKeys.has(item.key)} onClick={() => setEditing(item)}>
          편집
        </Button>
      ),
    },
  ];

  const confirmToggle = () => {
    if (pendingToggle) toggle.mutate({ ...pendingToggle, key: pendingToggle.item.key });
    setPendingToggle(null);
  };

  return (
    <TooltipProvider>
      <div className='space-y-3'>
        <p className='rounded-lg border border-border bg-canvas px-4 py-3 text-sm text-muted-foreground'>
          저장하면 운영 앱에 최대 30초 안에 반영됩니다. 이 화면은 접속한 리전 서버(운영/중국)의 값만 바꿉니다.
        </p>
        {isError ? (
          <p className='rounded-lg border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive'>
            기능 토글을 불러오지 못했습니다: {toErrorMessage(error)}
          </p>
        ) : (
          <DataTable columns={columns} data={data?.items ?? []} loading={isLoading} rowKey='key' />
        )}
      </div>

      <AlertDialog open={!!pendingToggle} onOpenChange={(open) => !open && setPendingToggle(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingToggle?.item.key} 을(를) {pendingToggle?.next ? '켬으로' : '끔으로'} 바꿀까요?
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-1 text-sm text-muted-foreground'>
                <p>
                  {pendingToggle?.item.row
                    ? `조건: ${summarizeConditions(pendingToggle.item.row)}`
                    : '행이 없어 조건 없이 새로 만듭니다.'}
                </p>
                <p>저장 즉시 운영 앱에 반영됩니다(최대 30초).</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle}>{pendingToggle?.next ? '켜기' : '끄기'}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <FeatureFlagEditDialog
        item={editing}
        busy={!!editing && busyKeys.has(editing.key)}
        onOpenChange={(open) => !open && setEditing(null)}
        onSaved={(key) => setEditing((current) => (current?.key === key ? null : current))}
      />
    </TooltipProvider>
  );
}

export default FeatureFlagsManager;
