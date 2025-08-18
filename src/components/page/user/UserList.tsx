import { User } from '@/client/types';
import { removeUser } from '@/client/user';
import useUsers from '@/hooks/useUsers';
import { Drawer, Modal, Spin, Table, message } from 'antd';
import TicketForm from './TicketForm';
import UserSearch from './UserSearch';
import { createUserTableColumns } from './UserTableColumns';
import UserFilterBar from './components/UserFilterBar';
import UserMigrationModal from './components/UserMigrationModal';
import { useUserFilters } from './hooks/useUserFilters';
import { useUserModals } from './hooks/useUserModals';

function UserList() {
  const [modal, holder] = Modal.useModal();

  // 커스텀 훅들
  const { filter, currentPage, setCurrentPage, updateFilter } = useUserFilters();
  const {
    isOpenSearch,
    isOpenTicket,
    isOpenMigration,
    focusedUser,
    focusedUsername,
    openSearch,
    closeSearch,
    openTicket,
    closeTicket,
    openMigration,
    closeMigration,
  } = useUserModals();

  // 데이터 페칭
  const { items, totalPage, isLoading, refetch } = useUsers({
    page: currentPage,
    locale: filter.locale,
  });

  // 유틸리티 함수들
  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    message.success(`${id} 복사됨`);
  };

  // 액션 핸들러들
  const handleRemove = (user: User) => {
    modal.confirm({
      title: `사용자 삭제`,
      content: (
        <div className='space-y-3'>
          <div>
            <p>
              <strong>{user.username}</strong> 사용자를 삭제하시겠습니까?
            </p>
            <div className='mt-2 text-sm text-gray-600'>
              <p>• 이메일: {user.socialAccount.email}</p>
              <p>• 가입일: {new Date(user.createdAt).toLocaleDateString()}</p>
              <p>• 공간 수: {user._count.profiles}개</p>
            </div>
          </div>
          <div className='p-3 bg-red-50 rounded'>
            <p className='font-medium text-red-600'>이 작업은 되돌릴 수 없습니다</p>
            <p className='mt-1 text-sm text-red-500'>사용자와 관련된 모든 데이터가 영구적으로 삭제됩니다.</p>
          </div>
        </div>
      ),
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      width: 450,
      onOk: async () => {
        try {
          await removeUser(user.id);
          await refetch();
          message.success(`${user.username} 사용자가 삭제되었습니다`);
        } catch (err) {
          message.error(`삭제 실패: ${err}`);
        }
      },
    });
  };

  const handleMigrationSuccess = async () => {
    await refetch();
    message.success('로그인 수단 교체가 완료되었습니다');
  };

  // 테이블 컬럼 생성
  const tableColumns = createUserTableColumns({
    onOpenTicket: openTicket,
    onRemove: handleRemove,
    copyId,
  });

  return (
    <>
      <Spin spinning={isLoading} tip='데이터 로딩 중...'>
        {holder}

        {/* 필터 바 */}
        <UserFilterBar
          filter={filter}
          onFilterChange={updateFilter}
          onOpenSearch={openSearch}
          onOpenMigration={openMigration}
          loading={isLoading}
        />

        {/* 메인 테이블 */}
        <Table
          dataSource={items}
          columns={tableColumns}
          rowKey='id'
          scroll={{ x: 1000 }}
          pagination={{
            total: totalPage * 10,
            current: currentPage,
            onChange: setCurrentPage,
            showSizeChanger: false,
          }}
          loading={isLoading}
          className='bg-white rounded-lg shadow-sm'
        />
      </Spin>

      {/* 검색 드로어 */}
      <Drawer open={isOpenSearch} onClose={closeSearch} width={1200} title='사용자 검색'>
        <UserSearch />
      </Drawer>

      {/* 티켓 지급 드로어 */}
      <Drawer open={isOpenTicket} onClose={closeTicket} width={600} title='티켓 지급'>
        <TicketForm reload={refetch} close={closeTicket} username={focusedUsername} />
      </Drawer>

      {/* 로그인 수단 교체 모달 */}
      <UserMigrationModal open={isOpenMigration} onClose={closeMigration} onSuccess={handleMigrationSuccess} />
    </>
  );
}

export default UserList;
