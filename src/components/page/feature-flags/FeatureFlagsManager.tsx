import { getAppVersionPolicies } from '@/client/app-version';
import { getFeatureFlags, updateFeatureFlag } from '@/client/feature-flags';
import type { FeatureFlagItem } from '@/client/types';
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
import { useMutation, useMutationState, useQuery, useQueryClient } from '@tanstack/react-query';
import { SlidersHorizontal } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import AppVersionOverview from './AppVersionOverview';
import FeatureFlagEditDialog from './FeatureFlagEditDialog';
import { type VersionOption, versionOptions } from './services/app-versions';
import {
  busyFlagKeys,
  describeAudience,
  effectiveSettings,
  FEATURE_FLAG_PUT_KEY,
  type FeatureFlagPutVariables,
  groupFlags,
  splitLabel,
  toErrorMessage,
  toToggleParams,
} from './services/feature-flag-form';

const QUERY_KEY = ['feature-flags'];

type PendingToggle = { item: FeatureFlagItem; next: boolean };
type ToggleVariables = PendingToggle & FeatureFlagPutVariables;

type FlagRowProps = {
  item: FeatureFlagItem;
  versions: VersionOption[];
  busy: boolean;
  onToggle: (next: boolean) => void;
  onEdit: () => void;
};

function FlagRow({ item, versions, busy, onToggle, onEdit }: FlagRowProps) {
  const { name, hint } = splitLabel(item.label);
  const settings = effectiveSettings(item);
  const audience = describeAudience(settings, versions);
  const enabled = settings.enabled;
  const switchId = `flag-${item.key}`;

  return (
    <li className='flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:flex-nowrap'>
      <div className='min-w-0 flex-1'>
        <label htmlFor={switchId} className='block cursor-pointer text-sm font-medium text-foreground'>
          {name}
        </label>
        {hint ? <p className='text-xs text-muted-foreground'>{hint}</p> : null}
        {settings.description ? <p className='text-xs text-muted-foreground'>메모: {settings.description}</p> : null}
      </div>
      <div className='flex shrink-0 items-center gap-3'>
        {audience ? <Badge variant='softNeutral'>{audience}</Badge> : null}
        <Button size='sm' variant='ghost' disabled={busy} onClick={onEdit}>
          <SlidersHorizontal className='h-4 w-4' aria-hidden='true' />
          대상
          <span className='sr-only'> 설정: {name}</span>
        </Button>
        <div className='flex items-center gap-2'>
          <span aria-hidden='true' className='w-8 text-right text-sm text-muted-foreground'>
            {enabled ? '켜짐' : '꺼짐'}
          </span>
          <Switch id={switchId} checked={enabled} disabled={busy} onCheckedChange={onToggle} />
        </div>
      </div>
    </li>
  );
}

function ListSkeleton() {
  return (
    <div className='space-y-6' aria-busy='true' aria-label='불러오는 중'>
      {[3, 2].map((rows, i) => (
        <div key={i} className='space-y-2'>
          <div className='h-4 w-16 animate-pulse rounded bg-muted' />
          <div className='divide-y divide-border rounded-xl border border-border bg-card'>
            {Array.from({ length: rows }, (_, j) => (
              <div key={j} className='flex items-center justify-between px-4 py-4'>
                <div className='h-4 w-40 animate-pulse rounded bg-muted' />
                <div className='h-5 w-9 animate-pulse rounded-full bg-muted' />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function FeatureFlagsManager() {
  const queryClient = useQueryClient();
  const { data, isLoading, isError, error, refetch } = useQuery({ queryKey: QUERY_KEY, queryFn: getFeatureFlags });
  // 앱 버전 화면과 같은 키를 써서 캐시를 나눠 쓴다. 실패해도 최소 지원 버전만 빠진다.
  const { data: policies } = useQuery({ queryKey: ['app-version'], queryFn: getAppVersionPolicies });
  const usage = data?.versions ?? [];
  const versions = versionOptions(usage);
  // 닫히는 동안 문구가 비지 않게, 열림 여부와 내용을 따로 둔다.
  const [pendingToggle, setPendingToggle] = useState<PendingToggle | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [editing, setEditing] = useState<FeatureFlagItem | null>(null);
  const [editOpen, setEditOpen] = useState(false);

  const toggle = useMutation({
    mutationKey: FEATURE_FLAG_PUT_KEY,
    mutationFn: ({ item, next }: ToggleVariables) => updateFeatureFlag(item.key, toToggleParams(item, next)),
    onSuccess: async (_, { item, next }) => {
      toast.success(`${splitLabel(item.label).name}을(를) ${next ? '켰' : '껐'}습니다. 30초 안에 앱에 반영됩니다.`);
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

  const askToggle = (item: FeatureFlagItem, next: boolean) => {
    setPendingToggle({ item, next });
    setConfirmOpen(true);
  };

  const confirmToggle = () => {
    if (pendingToggle) toggle.mutate({ ...pendingToggle, key: pendingToggle.item.key });
    setConfirmOpen(false);
  };

  const pendingName = pendingToggle ? splitLabel(pendingToggle.item.label).name : '';
  const pendingAudience = pendingToggle ? describeAudience(effectiveSettings(pendingToggle.item), versions) : null;

  return (
    <>
      {isError ? (
        <div
          role='alert'
          className='flex items-center justify-between gap-4 rounded-xl border border-destructive/25 bg-destructive/10 px-4 py-3 text-sm text-destructive'
        >
          <span>목록을 불러오지 못했습니다. {toErrorMessage(error)}</span>
          <Button size='sm' variant='outline' onClick={() => refetch()}>
            다시 시도
          </Button>
        </div>
      ) : isLoading ? (
        <ListSkeleton />
      ) : (
        <div className='space-y-6'>
          <AppVersionOverview versions={usage} policies={policies} />
          {groupFlags(data?.items ?? []).map((group) => (
            <section key={group.id} aria-labelledby={`flag-group-${group.id}`} className='space-y-2'>
              <h2 id={`flag-group-${group.id}`} className='px-1 text-sm font-semibold text-foreground'>
                {group.title}
              </h2>
              <ul className='divide-y divide-border rounded-xl border border-border bg-card'>
                {group.items.map((item) => (
                  <FlagRow
                    key={item.key}
                    item={item}
                    versions={versions}
                    busy={busyKeys.has(item.key)}
                    onToggle={(next) => askToggle(item, next)}
                    onEdit={() => {
                      setEditing(item);
                      setEditOpen(true);
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {pendingName}을(를) {pendingToggle?.next ? '켤까요?' : '끌까요?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingAudience ? `대상: ${pendingAudience}. ` : ''}30초 안에 사용자 앱에 반영됩니다.
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
        versions={usage}
        open={editOpen}
        busy={!!editing && busyKeys.has(editing.key)}
        onOpenChange={setEditOpen}
        onSaved={(key) => editing?.key === key && setEditOpen(false)}
      />
    </>
  );
}

export default FeatureFlagsManager;
