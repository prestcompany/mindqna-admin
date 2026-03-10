import { giveCoinBulk } from '@/client/premium';
import { removeProfile, removeSpace } from '@/client/space';
import { GiveCoinBulkFailure, Space } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
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
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Sheet } from '@/components/ui/sheet';
import useSpaces from '@/hooks/useSpaces';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import DataTable from '@/components/shared/ui/data-table';
import { useState } from 'react';
import { toast } from 'sonner';
import CoinForm from './CoinForm';
import SpaceSearch from './SpaceSearch';
import { createSpaceTableColumns } from './SpaceTableColumns';
import SpaceDetailSheet from './components/SpaceDetailSheet';
import SpaceFilterBar from './components/SpaceFilterBar';
import SpaceProfileModal from './components/SpaceProfileModal';
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
  return '잔액 부족';
}

function SpaceList() {
  const [isFetching, setFetching] = useState(false);
  const [detailTarget, setDetailTarget] = useState<Space | null>(null);

  const { filter, currentPage, setCurrentPage, updateFilter } = useSpaceFilters();
  const {
    isOpenSearch,
    isOpenCoin,
    isOpenProfile,
    focused,
    openSearch,
    closeSearch,
    openCoin,
    closeCoin,
    openProfile,
    closeProfile,
  } = useSpaceModals();

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
  };

  const confirmBulkCoin = async () => {
    const parsedBulkAmount = bulkAmountInput ? Number(bulkAmountInput) : 0;
    const spaceIds = bulkSpaceIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!spaceIds.length) {
      toast.error('공간 ID를 입력해주세요');
      return;
    }
    if (!parsedBulkAmount) {
      toast.error('수량을 입력해주세요');
      return;
    }

    try {
      setFetching(true);
      setBulkResult(null);
      const finalAmount = bulkOperation === 'take' ? -parsedBulkAmount : parsedBulkAmount;

      const result = await giveCoinBulk({
        spaceIds,
        isStar: bulkIsStar,
        amount: finalAmount,
        message: bulkMeta || `단체 ${bulkOperation === 'give' ? '지급' : '회수'}: ${parsedBulkAmount}개`,
      });

      if (Array.isArray(result) && result.length > 0) {
        setBulkResult({
          status: 'partial',
          failedSpaces: result,
          successCount: spaceIds.length - result.length,
          totalCount: spaceIds.length,
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
        `단체 ${bulkOperation === 'give' ? '지급' : '회수'} 완료 - ${spaceIds.length}개 공간, ${bulkIsStar ? '스타' : '하트'} ${parsedBulkAmount}개`,
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
    }
  };

  const baseColumns = createSpaceTableColumns({
    onViewProfiles: openProfile,
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
            onClick: () => setDetailTarget(space),
            className: 'cursor-pointer',
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
        <AdminSideSheetContent title='코인 관리' size='md'>
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

      {/* 프로필 모달 */}
      <SpaceProfileModal
        open={isOpenProfile}
        space={focused || null}
        onClose={closeProfile}
        onRefresh={refetch}
        onRemoveProfile={handleRemoveProfile}
        copyId={copyId}
      />

      <SpaceDetailSheet open={!!detailTarget} space={detailTarget} onClose={() => setDetailTarget(null)} copyId={copyId} />

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

      <Dialog open={isBulkCoinOpen} onOpenChange={(open) => !open && handleCloseBulkCoin()}>
        <DialogContent className='max-w-[560px] border-border/70 bg-background/98 p-0'>
          <DialogHeader className='border-b border-border/70 px-6 py-5'>
            <DialogTitle>단체 코인 지급/회수</DialogTitle>
            <DialogDescription>
              처리 실패한 공간이 있으면 이 팝업 안에서 바로 확인할 수 있습니다.
            </DialogDescription>
          </DialogHeader>

          <div className='space-y-5 px-6 py-5'>
            <div className='space-y-2'>
              <label className='block text-sm font-medium text-foreground'>작업 유형</label>
              <RadioGroup value={bulkOperation} onValueChange={(v) => setBulkOperation(v as 'give' | 'take')} className='flex gap-0'>
                <div className='flex items-center'>
                  <RadioGroupItem value='give' id='bulk-op-give' className='peer sr-only' />
                  <Label htmlFor='bulk-op-give' className='cursor-pointer rounded-l-md border px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'>지급</Label>
                </div>
                <div className='flex items-center'>
                  <RadioGroupItem value='take' id='bulk-op-take' className='peer sr-only' />
                  <Label htmlFor='bulk-op-take' className='cursor-pointer rounded-r-md border border-l-0 px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'>회수</Label>
                </div>
              </RadioGroup>
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-foreground'>공간 ID 목록</label>
              <Textarea
                placeholder='abcd,1234,xyz'
                rows={4}
                value={bulkSpaceIds}
                onChange={(e) => setBulkSpaceIds(e.target.value)}
              />
              <p className='text-xs text-muted-foreground'>콤마(,) 기준으로 여러 공간 ID를 입력합니다.</p>
            </div>

            <div className='grid gap-4 sm:grid-cols-2'>
              <div className='space-y-2'>
                <label className='block text-sm font-medium text-foreground'>코인 타입</label>
                <RadioGroup value={String(bulkIsStar)} onValueChange={(v) => setBulkIsStar(v === 'true')} className='flex gap-0'>
                  <div className='flex items-center'>
                    <RadioGroupItem value='false' id='bulk-coin-heart' className='peer sr-only' />
                    <Label htmlFor='bulk-coin-heart' className='cursor-pointer rounded-l-md border px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'>하트</Label>
                  </div>
                  <div className='flex items-center'>
                    <RadioGroupItem value='true' id='bulk-coin-star' className='peer sr-only' />
                    <Label htmlFor='bulk-coin-star' className='cursor-pointer rounded-r-md border border-l-0 px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'>스타</Label>
                  </div>
                </RadioGroup>
              </div>

              <div className='space-y-2'>
                <label className='block text-sm font-medium text-foreground'>수량</label>
                <Input
                  type='text'
                  inputMode='numeric'
                  autoComplete='off'
                  placeholder='예: 100'
                  value={bulkAmountInput}
                  onChange={(e) => setBulkAmountInput(e.target.value.replace(/[^\d]/g, ''))}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <label className='block text-sm font-medium text-foreground'>메시지</label>
              <Input value={bulkMeta} onChange={(e) => setBulkMeta(e.target.value)} placeholder='메시지 내용' />
            </div>

            {bulkResult?.status === 'partial' ? (
              <div className='rounded-xl border border-amber-200 bg-amber-50/80 p-4'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='space-y-1'>
                    <p className='text-sm font-semibold text-amber-900'>부분 실패</p>
                    <p className='text-sm text-amber-800'>
                      총 {bulkResult.totalCount}개 중 {bulkResult.successCount}개 성공, {bulkResult.failedSpaces.length}개 실패
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

                <div className='mt-3 max-h-40 overflow-y-auto rounded-lg border border-amber-200 bg-background/80'>
                  <div className='divide-y divide-border/60'>
                    {bulkResult.failedSpaces.map((item) => (
                      <div key={item.spaceId} className='flex items-center justify-between gap-3 px-3 py-2 text-sm'>
                        <span className='break-all font-medium text-foreground'>{item.spaceId}</span>
                        <span className='shrink-0 text-xs text-muted-foreground'>{getBulkFailureReasonLabel(item.reason)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {bulkResult?.status === 'error' ? (
              <div className='rounded-xl border border-destructive/20 bg-destructive/5 p-4'>
                <p className='text-sm font-semibold text-destructive'>처리 실패</p>
                <p className='mt-1 break-words text-sm text-destructive/80'>{bulkResult.message}</p>
              </div>
            ) : null}
          </div>

          <DialogFooter className='border-t border-border/70 px-6 py-4'>
            <Button type='button' variant='outline' onClick={handleCloseBulkCoin} disabled={isFetching}>
              닫기
            </Button>
            <Button type='button' onClick={confirmBulkCoin} disabled={isFetching}>
              실행
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export default SpaceList;
