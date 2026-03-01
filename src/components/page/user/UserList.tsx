import { User } from '@/client/types';
import { removeUser } from '@/client/user';
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
import DataTable from '@/components/shared/ui/data-table';
import useUsers from '@/hooks/useUsers';
import { useState } from 'react';
import { toast } from 'sonner';
import TicketForm from './TicketForm';
import UserSearch from './UserSearch';
import { createUserTableColumns } from './UserTableColumns';
import UserFilterBar from './components/UserFilterBar';
import UserMigrationModal from './components/UserMigrationModal';
import { useUserFilters } from './hooks/useUserFilters';
import { useUserModals } from './hooks/useUserModals';

function UserList() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

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

  const { items, totalPage, isLoading, refetch } = useUsers({
    page: currentPage,
    locale: filter.locale,
  });

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`${id} 복사됨`);
  };

  const handleRemoveClick = (user: User) => {
    setConfirmTarget(user);
    setConfirmOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!confirmTarget) return;
    try {
      await removeUser(confirmTarget.id);
      await refetch();
      toast.success(`${confirmTarget.username} 사용자가 삭제되었습니다`);
    } catch (err) {
      toast.error(`삭제 실패: ${err}`);
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const handleMigrationSuccess = async () => {
    await refetch();
    toast.success('로그인 수단 교체가 완료되었습니다');
  };

  const tableColumns = createUserTableColumns({
    onOpenTicket: openTicket,
    onRemove: handleRemoveClick,
    copyId,
  });

  return (
    <>
      <UserFilterBar
        filter={filter}
        onFilterChange={updateFilter}
        onOpenSearch={openSearch}
        onOpenMigration={openMigration}
        loading={isLoading}
      />

      <DataTable
        columns={tableColumns}
        data={items || []}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
        loading={isLoading}
      />

      <Sheet open={isOpenSearch} onOpenChange={(open) => !open && closeSearch()}>
        <AdminSideSheetContent title='사용자 검색' size='xl'>
          <UserSearch />
        </AdminSideSheetContent>
      </Sheet>

      <Sheet open={isOpenTicket} onOpenChange={(open) => !open && closeTicket()}>
        <AdminSideSheetContent title='티켓 지급' size='md'>
          <TicketForm reload={refetch} close={closeTicket} username={focusedUsername} />
        </AdminSideSheetContent>
      </Sheet>

      <UserMigrationModal open={isOpenMigration} onClose={closeMigration} onSuccess={handleMigrationSuccess} />

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-3'>
                <div>
                  <p>
                    <strong>{confirmTarget?.username}</strong> 사용자를 삭제하시겠습니까?
                  </p>
                  <div className='mt-2 text-sm text-gray-600'>
                    <p>• 이메일: {confirmTarget?.socialAccount.email}</p>
                    <p>• 가입일: {confirmTarget ? new Date(confirmTarget.createdAt).toLocaleDateString() : ''}</p>
                    <p>• 공간 수: {confirmTarget?._count.profiles}개</p>
                  </div>
                </div>
                <div className='p-3 bg-red-50 rounded'>
                  <p className='font-medium text-red-600'>이 작업은 되돌릴 수 없습니다</p>
                  <p className='mt-1 text-sm text-red-500'>사용자와 관련된 모든 데이터가 영구적으로 삭제됩니다.</p>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleRemoveConfirm}
              className='bg-destructive text-destructive-foreground hover:bg-destructive/90'
            >
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

export default UserList;
