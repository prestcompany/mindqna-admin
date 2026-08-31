import { giveCoinBulk } from '@/client/premium';
import { getSpace, removeProfile, removeSpace } from '@/client/space';
import { GiveCoinBulkFailure, Space } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
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
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import useSpaces from '@/hooks/useSpaces';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import DataTable from '@/components/shared/ui/data-table';
import { useEffect, useRef, useState, type MouseEvent } from 'react';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import CoinForm from './CoinForm';
import SpaceSearch from './SpaceSearch';
import { createSpaceTableColumns } from './SpaceTableColumns';
import BulkMessageKeywords from './components/BulkMessageKeywords';
import SpaceDetailSheet from './components/SpaceDetailSheet';
import SpaceFilterBar from './components/SpaceFilterBar';
import { useSpaceFilters } from './hooks/useSpaceFilters';
import { useSpaceModals } from './hooks/useSpaceModals';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

type BulkCoinResultState =
  | {
      status: 'partial';
      failedSpaces: GiveCoinBulkFailure[];
      successCount: number;
      totalCount: number;
    }
  | {
      status: 'error';
      message: string;
    }
  | null;

function getBulkFailureReasonLabel(reason: GiveCoinBulkFailure['reason']) {
  if (reason === 'not_found') {
    return '공간 없음';
  }
  return '처리 실패';
}

function SpaceList() {
  const router = useRouter();
  const [isFetching, setFetching] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Space | null>(null);
  // Set alongside detailTarget so the member-list row action can land the detail sheet on
  // its 멤버 tab directly, instead of the deleted SpaceProfileModal.
  const [detailInitialTab, setDetailInitialTab] = useState<string | undefined>(undefined);

  const deepLinkSpaceId = typeof router.query.spaceId === 'string' ? router.query.spaceId : undefined;
  const consumedDeepLinkRef = useRef<string | null>(null);

  const { data: deepLinkSpace } = useQuery({
    queryKey: ['space-deeplink', deepLinkSpaceId],
    queryFn: () => getSpace(deepLinkSpaceId as string),
    enabled: !!deepLinkSpaceId,
    retry: false,
  });

  useEffect(() => {
    if (!deepLinkSpace || !deepLinkSpaceId) return;
    if (consumedDeepLinkRef.current === deepLinkSpaceId) return;
    consumedDeepLinkRef.current = deepLinkSpaceId;
    if (!detailTarget) {
      setDetailTarget(deepLinkSpace as Space);
    }
  }, [deepLinkSpace, deepLinkSpaceId, detailTarget]);

  useEffect(() => {
    if (!deepLinkSpaceId) consumedDeepLinkRef.current = null;
  }, [deepLinkSpaceId]);

  const closeDetail = () => {
    setDetailTarget(null);
    setDetailInitialTab(undefined);
    if (deepLinkSpaceId) {
      router.replace({ pathname: router.pathname }, undefined, { shallow: true });
    }
  };

  const openDetail = (space: Space) => {
    setDetailTarget(space);
    setDetailInitialTab(undefined);
  };

  const handleViewMembers = (space: Space) => {
    setDetailTarget(space);
    setDetailInitialTab('members');
  };

  const { filter, currentPage, setCurrentPage, updateFilter } = useSpaceFilters();
  const { isOpenSearch, isOpenCoin, focused, openSearch, closeSearch, openCoin, closeCoin } = useSpaceModals();

  const { items, totalPage, refetch, isLoading } = useSpaces({
    page: currentPage,
    type: filter.type,
    locale: filter.locale,
    orderBy: filter.orderBy,
  });

  // AlertDialog states
  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<{ id: string; nickname: string } | null>(null);
  const [isBulkCoinOpen, setIsBulkCoinOpen] = useState(false);

  // Bulk coin form state
  const [bulkSpaceIds, setBulkSpaceIds] = useState('');
  const [bulkAmountInput, setBulkAmountInput] = useState('');
  const [bulkMeta, setBulkMeta] = useState('');
  const [bulkIsStar, setBulkIsStar] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<'give' | 'take'>('give');
  const [bulkResult, setBulkResult] = useState<BulkCoinResultState>(null);
  // Holds the parsed, about-to-execute values while the confirm AlertDialog is open — a bulk
  // write across many spaces used to fire straight from 실행 with nothing in front of it, and
  // the confirm needs to name the exact operation/coin type/amount/space count it is about
  // to run, not whatever the inputs happen to say by the time the request settles.
  const [pendingBulkCoin, setPendingBulkCoin] = useState<{
    operation: 'give' | 'take';
    isStar: boolean;
    amount: number;
    spaceIds: string[];
  } | null>(null);

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`${id} 복사`);
  };

  const handleRemove = (space: Space) => {
    setDeleteTarget(space);
  };

  const confirmRemove = async () => {
    if (!deleteTarget) return;
    try {
      await removeSpace(deleteTarget.id);
      await refetch();
      toast.success('공간이 삭제되었습니다');
    } catch (err) {
      toast.error(`${err}`);
    }
    setDeleteTarget(null);
  };

  const handleRemoveProfile = async (profileId: string, nickname: string) => {
    setDeleteProfileTarget({ id: profileId, nickname });
  };

  const confirmRemoveProfile = async () => {
    if (!deleteProfileTarget) return;
    try {
      await removeProfile(deleteProfileTarget.id);
      await refetch();
      toast.success('프로필이 삭제되었습니다');
    } catch (err) {
      toast.error(`${err}`);
    }
    setDeleteProfileTarget(null);
  };

  const handleBulkCoin = () => {
    setBulkSpaceIds('');
    setBulkAmountInput('');
    setBulkMeta('');
    setBulkIsStar(false);
    setBulkOperation('give');
    setBulkResult(null);
    setIsBulkCoinOpen(true);
  };

  const handleCloseBulkCoin = () => {
    if (isFetching) return;
    setIsBulkCoinOpen(false);
    setBulkResult(null);
    setPendingBulkCoin(null);
  };

  // Bound to 실행: parses and validates the inputs, then hands the parsed facts to the
  // confirm AlertDialog instead of calling the API directly.
  const handleBulkCoinSubmit = () => {
    const parsedBulkAmount = bulkAmountInput ? Number(bulkAmountInput) : 0;
    // Deduped before it ever reaches the confirm: an operator retrying a partial failure
    // pastes the failed IDs back onto the end of the original list, and without this the
    // confirm's 공간 N곳 count (and the payload) would double-count every retried ID.
    const spaceIds = Array.from(
      new Set(
        bulkSpaceIds
          .split(',')
          .map((id) => id.trim())
          .filter(Boolean),
      ),
    );

    if (!spaceIds.length) {
      toast.error('공간 ID를 입력해주세요');
      return;
    }
    if (!parsedBulkAmount) {
      toast.error('수량을 입력해주세요');
      return;
    }

    setPendingBulkCoin({ operation: bulkOperation, isStar: bulkIsStar, amount: parsedBulkAmount, spaceIds });
  };

  const executeBulkCoin = async (payload: NonNullable<typeof pendingBulkCoin>) => {
    try {
      setFetching(true);
      setBulkResult(null);
      const finalAmount = payload.operation === 'take' ? -payload.amount : payload.amount;

      const result = await giveCoinBulk({
        spaceIds: payload.spaceIds,
        isStar: payload.isStar,
        amount: finalAmount,
        message: bulkMeta || `단체 ${payload.operation === 'give' ? '지급' : '회수'}: ${payload.amount}개`,
      });

      if (Array.isArray(result) && result.length > 0) {
        setBulkResult({
          status: 'partial',
          failedSpaces: result,
          successCount: payload.spaceIds.length - result.length,
          totalCount: payload.spaceIds.length,
        });
        toast.warning(`일부 공간 처리 실패 - ${result.length}개 공간을 확인해주세요.`);
        await refetch();
        return;
      }

      if (!Array.isArray(result) && result.success === false) {
        setBulkResult({
          status: 'error',
          message: '단체 지급 처리 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.',
        });
        toast.error('단체 지급 처리에 실패했습니다.');
        return;
      }

      toast.success(
        `단체 ${payload.operation === 'give' ? '지급' : '회수'} 완료 - ${payload.spaceIds.length}개 공간, ${payload.isStar ? '스타' : '하트'} ${payload.amount}개`,
      );

      await refetch();
      handleCloseBulkCoin();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setBulkResult({
        status: 'error',
        message,
      });
      toast.error(`실패: ${message}`);
    } finally {
      setFetching(false);
      setPendingBulkCoin(null);
    }
  };

  // AlertDialogAction renders Radix's DialogPrimitive.Close, which closes the dialog right
  // after this handler unless the default is prevented — same fix as the user-migration
  // confirm: without it the confirm surface would vanish before the bulk write settles.
  const handleConfirmBulkCoin = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    if (!pendingBulkCoin) return;
    executeBulkCoin(pendingBulkCoin);
  };

  const baseColumns = createSpaceTableColumns({
    onViewProfiles: handleViewMembers,
    onOpenCoin: openCoin,
    onRemove: handleRemove,
    copyId,
  });

  return (
    <>
      <div className={isFetching ? 'opacity-50 pointer-events-none' : ''}>
        <SpaceFilterBar
          filter={filter}
          onFilterChange={updateFilter}
          onOpenSearch={openSearch}
          onOpenBulkCoin={handleBulkCoin}
          loading={isLoading}
        />

        <DataTable
          columns={baseColumns}
          data={items || []}
          pagination={{
            total: totalPage * 10,
            page: currentPage,
            pageSize: 10,
            onChange: (page) => setCurrentPage(page),
          }}
          loading={isLoading}
          onRow={(space) => ({
            onClick: () => openDetail(space),
          })}
        />
      </div>

      {/* 검색 시트 */}
      <Sheet open={isOpenSearch} onOpenChange={(open) => !open && closeSearch()}>
        <AdminSideSheetContent title='공간 검색' size='xl'>
          <SpaceSearch />
        </AdminSideSheetContent>
      </Sheet>

      {/* 코인 관리 시트 */}
      <Sheet open={isOpenCoin} onOpenChange={(open) => !open && closeCoin()}>
        <AdminSideSheetContent title='코인 관리' size='lg'>
          <CoinForm
            reload={refetch}
            close={closeCoin}
            spaceId={focused?.id ?? ''}
            currentCoins={
              focused
                ? {
                    hearts: focused.coin,
                    stars: focused.coinPaid,
                  }
                : undefined
            }
          />
        </AdminSideSheetContent>
      </Sheet>

      <SpaceDetailSheet
        open={!!detailTarget}
        space={detailTarget}
        onClose={closeDetail}
        copyId={copyId}
        initialTab={detailInitialTab}
        onRemoveProfile={handleRemoveProfile}
      />

      {/* 공간 삭제 확인 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `(${deleteTarget.id}) ${deleteTarget.spaceInfo.name}을(를) 삭제하시겠습니까?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemove}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* 프로필 삭제 확인 */}
      <AlertDialog open={!!deleteProfileTarget} onOpenChange={(open) => !open && setDeleteProfileTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteProfileTarget && `(${deleteProfileTarget.nickname})을(를) 삭제하시겠습니까?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveProfile}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isBulkCoinOpen} onOpenChange={(open) => !open && handleCloseBulkCoin()}>
        <AdminSideSheetContent
          title='단체 코인 지급/회수'
          description='처리 실패한 공간이 있으면 이 시트 안에서 바로 확인할 수 있습니다.'
          size='md'
        >
          <div className='-mx-6'>
            <DefinitionRow label='작업 유형'>
              <RadioGroup
                value={bulkOperation}
                onValueChange={(v) => setBulkOperation(v as 'give' | 'take')}
                className='flex gap-0'
              >
                <div className='flex items-center'>
                  <RadioGroupItem value='give' id='bulk-op-give' className='peer sr-only' />
                  <Label
                    htmlFor='bulk-op-give'
                    className='cursor-pointer rounded-l-md border px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
                  >
                    지급
                  </Label>
                </div>
                <div className='flex items-center'>
                  <RadioGroupItem value='take' id='bulk-op-take' className='peer sr-only' />
                  <Label
                    htmlFor='bulk-op-take'
                    className='cursor-pointer rounded-r-md border border-l-0 px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
                  >
                    회수
                  </Label>
                </div>
              </RadioGroup>
            </DefinitionRow>

            <DefinitionRow label='공간 ID 목록' hint='콤마(,) 기준으로 여러 공간 ID를 입력합니다.'>
              <Textarea
                placeholder='abcd,1234,xyz'
                rows={4}
                value={bulkSpaceIds}
                onChange={(e) => setBulkSpaceIds(e.target.value)}
              />
            </DefinitionRow>

            <DefinitionRow label='코인 타입'>
              <RadioGroup
                value={String(bulkIsStar)}
                onValueChange={(v) => setBulkIsStar(v === 'true')}
                className='flex gap-0'
              >
                <div className='flex items-center'>
                  <RadioGroupItem value='false' id='bulk-coin-heart' className='peer sr-only' />
                  <Label
                    htmlFor='bulk-coin-heart'
                    className='cursor-pointer rounded-l-md border px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
                  >
                    하트
                  </Label>
                </div>
                <div className='flex items-center'>
                  <RadioGroupItem value='true' id='bulk-coin-star' className='peer sr-only' />
                  <Label
                    htmlFor='bulk-coin-star'
                    className='cursor-pointer rounded-r-md border border-l-0 px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
                  >
                    스타
                  </Label>
                </div>
              </RadioGroup>
            </DefinitionRow>

            <DefinitionRow label='수량'>
              <Input
                type='text'
                inputMode='numeric'
                autoComplete='off'
                placeholder='예: 100'
                value={bulkAmountInput}
                onChange={(e) => setBulkAmountInput(e.target.value.replace(/[^\d]/g, ''))}
              />
            </DefinitionRow>

            <DefinitionRow label='메시지'>
              <Input value={bulkMeta} onChange={(e) => setBulkMeta(e.target.value)} placeholder='메시지 내용' />
              <BulkMessageKeywords
                onPick={(keyword) => setBulkMeta((prev) => (prev.trim() ? `${prev} ${keyword}` : keyword))}
              />
            </DefinitionRow>
          </div>

          {bulkResult?.status === 'partial' ? (
            <div className='mt-4 rounded-lg border border-warning/35 bg-warning/15 p-4'>
              <div className='flex items-start justify-between gap-3'>
                <div className='space-y-1'>
                  <p className='text-sm font-semibold text-warning-foreground'>부분 실패</p>
                  <p className='text-sm text-warning-foreground'>
                    총 {bulkResult.totalCount}개 중 {bulkResult.successCount}개 성공, {bulkResult.failedSpaces.length}개
                    실패
                  </p>
                </div>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    navigator.clipboard.writeText(bulkResult.failedSpaces.map((item) => item.spaceId).join(','));
                    toast.success('실패한 공간 ID를 복사했습니다.');
                  }}
                >
                  실패 ID 복사
                </Button>
              </div>

              <div className='mt-3 max-h-40 overflow-y-auto rounded-lg border border-warning/35 bg-white'>
                <div className='divide-y divide-border/60'>
                  {bulkResult.failedSpaces.map((item) => (
                    <div key={item.spaceId} className='flex items-center justify-between gap-3 px-3 py-2 text-sm'>
                      <span className='break-all font-medium text-foreground'>{item.spaceId}</span>
                      <span className='shrink-0 text-xs text-muted-foreground'>
                        {getBulkFailureReasonLabel(item.reason)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : null}

          {bulkResult?.status === 'error' ? (
            <div className='mt-4 rounded-lg border border-destructive/20 bg-destructive/10 p-4'>
              <p className='text-sm font-semibold text-destructive'>처리 실패</p>
              <p className='mt-1 break-words text-sm text-destructive/80'>{bulkResult.message}</p>
            </div>
          ) : null}

          <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
            <div className='flex justify-end gap-2'>
              <Button type='button' variant='outline' onClick={handleCloseBulkCoin} disabled={isFetching}>
                닫기
              </Button>
              <Button type='button' onClick={handleBulkCoinSubmit} disabled={isFetching}>
                실행
              </Button>
            </div>
          </div>
        </AdminSideSheetContent>
      </Sheet>

      {/* 단체 코인 지급/회수 실행 확인 — 실제 결제/회수를 수행하기 전 마지막 확인 지점 */}
      <AlertDialog open={!!pendingBulkCoin} onOpenChange={(open) => !open && !isFetching && setPendingBulkCoin(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              단체 코인 {pendingBulkCoin?.operation === 'give' ? '지급을' : '회수를'} 실행하시겠습니까?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {pendingBulkCoin && (
                <>
                  공간 <strong>{pendingBulkCoin.spaceIds.length}곳</strong>에{' '}
                  <strong>{pendingBulkCoin.isStar ? '스타' : '하트'}</strong>{' '}
                  <strong>{pendingBulkCoin.amount}개</strong>를{' '}
                  <strong>{pendingBulkCoin.operation === 'give' ? '지급' : '회수'}</strong>합니다. 이 작업은 되돌릴 수
                  없습니다.
                </>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isFetching}>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmBulkCoin} disabled={isFetching}>
              실행
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SpaceList;
