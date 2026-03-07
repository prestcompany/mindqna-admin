import { giveCoinBulk } from '@/client/premium';
import { removeProfile, removeSpace } from '@/client/space';
import { Space } from '@/client/types';
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
import SpaceFilterBar from './components/SpaceFilterBar';
import SpaceProfileModal from './components/SpaceProfileModal';
import { useSpaceFilters } from './hooks/useSpaceFilters';
import { useSpaceModals } from './hooks/useSpaceModals';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

function SpaceList() {
  const [isFetching, setFetching] = useState(false);

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
  const [bulkAmount, setBulkAmount] = useState(0);
  const [bulkMeta, setBulkMeta] = useState('');
  const [bulkIsStar, setBulkIsStar] = useState(false);
  const [bulkOperation, setBulkOperation] = useState<'give' | 'take'>('give');

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
    setBulkAmount(0);
    setBulkMeta('');
    setBulkIsStar(false);
    setBulkOperation('give');
    setIsBulkCoinOpen(true);
  };

  const confirmBulkCoin = async () => {
    const spaceIds = bulkSpaceIds
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean);

    if (!spaceIds.length) {
      toast.error('공간 ID를 입력해주세요');
      return;
    }
    if (!bulkAmount) {
      toast.error('수량을 입력해주세요');
      return;
    }

    try {
      setFetching(true);
      const finalAmount = bulkOperation === 'take' ? -bulkAmount : bulkAmount;

      const result = await giveCoinBulk({
        spaceIds,
        isStar: bulkIsStar,
        amount: finalAmount,
        message: bulkMeta || `단체 ${bulkOperation === 'give' ? '지급' : '회수'}: ${bulkAmount}개`,
      });

      toast.success(
        `단체 ${bulkOperation === 'give' ? '지급' : '회수'} 완료 - ${spaceIds.length}개 공간, ${bulkIsStar ? '스타' : '하트'} ${bulkAmount}개`,
      );

      await refetch();
    } catch (err) {
      toast.error(`실패: ${err}`);
    } finally {
      setFetching(false);
      setIsBulkCoinOpen(false);
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

      {/* 단체 코인 지급 다이얼로그 */}
      <AlertDialog open={isBulkCoinOpen} onOpenChange={setIsBulkCoinOpen}>
        <AlertDialogContent className='max-w-[500px]'>
          <AlertDialogHeader>
            <AlertDialogTitle>단체 코인 지급/회수</AlertDialogTitle>
          </AlertDialogHeader>
          <div className='space-y-4'>
            <div>
              <label className='block mb-1 font-medium'>작업 유형</label>
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

            <div>
              <label className='block mb-1 font-medium'>공간 ID 목록 (콤마로 구분)</label>
              <Textarea
                placeholder='abcd,1234,xyz'
                rows={3}
                value={bulkSpaceIds}
                onChange={(e) => setBulkSpaceIds(e.target.value)}
              />
            </div>

            <div>
              <label className='block mb-1 font-medium'>코인 타입</label>
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

            <div>
              <label className='block mb-1 font-medium'>수량</label>
              <Input
                type='number'
                value={bulkAmount}
                onChange={(e) => setBulkAmount(Number(e.target.value) || 0)}
                min={1}
              />
            </div>

            <div>
              <label className='block mb-1 font-medium'>메시지</label>
              <Input value={bulkMeta} onChange={(e) => setBulkMeta(e.target.value)} placeholder='메시지 내용' />
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmBulkCoin}>실행</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default SpaceList;
