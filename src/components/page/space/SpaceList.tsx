import { giveCoinBulk } from '@/client/premium';
import { removeProfile, removeSpace } from '@/client/space';
import useSpaces from '@/hooks/useSpaces';
import { Drawer, Input, InputNumber, Modal, Radio, Spin, Table, message } from 'antd';
import { useState } from 'react';
import CoinForm from './CoinForm';
import SpaceSearch from './SpaceSearch';
import { createSpaceTableColumns } from './SpaceTableColumns';
import SpaceFilterBar from './components/SpaceFilterBar';
import SpaceProfileModal from './components/SpaceProfileModal';
import { useSpaceFilters } from './hooks/useSpaceFilters';
import { useSpaceModals } from './hooks/useSpaceModals';

function SpaceList() {
  const [isFetching, setFetching] = useState(false);

  // 커스텀 훅들
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

  // 데이터 페칭
  const { items, totalPage, refetch, isLoading } = useSpaces({
    page: currentPage,
    type: filter.type,
    locale: filter.locale,
    orderBy: filter.orderBy as any,
  });

  // 유틸리티 함수들
  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    message.success(`${id} 복사`);
  };

  // 액션 핸들러들
  const handleRemove = (space: any) => {
    Modal.confirm({
      title: `삭제 (${space.id}) ${space.spaceInfo.name}`,
      onOk: async () => {
        try {
          await removeSpace(space.id);
          await refetch();
          message.success('공간이 삭제되었습니다');
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const handleRemoveProfile = async (profileId: string, nickname: string) => {
    Modal.confirm({
      title: `삭제 (${nickname})`,
      onOk: async () => {
        try {
          await removeProfile(profileId);
          await refetch();
          message.success('프로필이 삭제되었습니다');
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const handleBulkCoin = () => {
    let spaceIds: string[] = [];
    let amount = 0;
    let meta = '';
    let isStar = false;
    let operation: 'give' | 'take' = 'give';

    Modal.confirm({
      title: '단체 코인 지급/회수',
      width: 500,
      content: (
        <div className='space-y-4'>
          <div>
            <label className='block mb-1 font-medium'>작업 유형</label>
            <Radio.Group
              defaultValue='give'
              onChange={(e) => (operation = e.target.value)}
              options={[
                { label: '지급', value: 'give' },
                { label: '회수', value: 'take' },
              ]}
              optionType='button'
              buttonStyle='solid'
            />
          </div>

          <div>
            <label className='block mb-1 font-medium'>공간 ID 목록 (콤마로 구분)</label>
            <Input.TextArea
              placeholder='abcd,1234,xyz'
              rows={3}
              onChange={(e) =>
                (spaceIds = e.target.value
                  .split(',')
                  .map((id) => id.trim())
                  .filter(Boolean))
              }
            />
          </div>

          <div>
            <label className='block mb-1 font-medium'>코인 타입</label>
            <Radio.Group
              defaultValue={false}
              onChange={(e) => (isStar = e.target.value)}
              options={[
                { label: '하트', value: false },
                { label: '스타', value: true },
              ]}
              optionType='button'
              buttonStyle='solid'
            />
          </div>

          <div>
            <label className='block mb-1 font-medium'>수량</label>
            <InputNumber onChange={(e) => (amount = e || 0)} min={1} style={{ width: '100%' }} />
          </div>

          <div>
            <label className='block mb-1 font-medium'>메시지</label>
            <Input onChange={(e) => (meta = e.target.value)} placeholder='메시지 내용' />
          </div>
        </div>
      ),
      okText: '실행',
      okType: 'primary',
      onOk: async () => {
        if (!spaceIds.length) {
          message.error('공간 ID를 입력해주세요');
          return;
        }

        if (!amount) {
          message.error('수량을 입력해주세요');
          return;
        }

        try {
          setFetching(true);
          const finalAmount = operation === 'take' ? -amount : amount;

          const result = await giveCoinBulk({
            spaceIds,
            isStar,
            amount: finalAmount,
            message: meta || `단체 ${operation === 'give' ? '지급' : '회수'}: ${amount}개`,
          });

          message.success({
            content: (
              <div className='space-y-2'>
                <div className='font-semibold'>단체 {operation === 'give' ? '지급' : '회수'} 완료</div>
                <div className='text-sm'>
                  처리된 공간: {spaceIds.length}개<br />
                  {isStar ? '스타' : '하트'} {amount}개 {operation === 'give' ? '지급' : '회수'}
                </div>
                <div className='flex-auto gap-2 py-4 item-center'>
                  <label>단체 지급 결과</label>
                  <p>{JSON.stringify(result)}</p>
                </div>
              </div>
            ),
            duration: 5,
          });

          await refetch();
        } catch (err) {
          message.error(`실패: ${err}`);
        } finally {
          setFetching(false);
        }
      },
    });
  };

  // 테이블 컬럼 생성
  const tableColumns = createSpaceTableColumns({
    onViewProfiles: openProfile,
    onOpenCoin: openCoin,
    onRemove: handleRemove,
    copyId,
  });

  return (
    <>
      <Spin spinning={isFetching} tip='처리 중...'>
        {/* 필터 바 */}
        <SpaceFilterBar
          filter={filter}
          onFilterChange={updateFilter}
          onOpenSearch={openSearch}
          onOpenBulkCoin={handleBulkCoin}
          loading={isLoading}
        />

        {/* 메인 테이블 */}
        <Table
          dataSource={items}
          columns={tableColumns}
          rowKey='id'
          scroll={{ x: 1200 }}
          pagination={{
            total: totalPage * 10,
            current: currentPage,
            onChange: setCurrentPage,
            showSizeChanger: false,
          }}
          loading={isLoading}
        />
      </Spin>

      {/* 검색 드로어 */}
      <Drawer open={isOpenSearch} onClose={closeSearch} width={1200} title='공간 검색'>
        <SpaceSearch />
      </Drawer>

      {/* 코인 관리 드로어 */}
      <Drawer open={isOpenCoin} onClose={closeCoin} width={600} title='코인 관리'>
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
      </Drawer>

      {/* 프로필 모달 */}
      <SpaceProfileModal
        open={isOpenProfile}
        space={focused || null}
        onClose={closeProfile}
        onRefresh={refetch}
        onRemoveProfile={handleRemoveProfile}
        copyId={copyId}
      />
    </>
  );
}

export default SpaceList;
