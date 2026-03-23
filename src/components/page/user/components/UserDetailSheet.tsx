import { getUser } from '@/client/user';
import { UserDetail, UserSummary } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import UserDetailContent from './UserDetailContent';

interface UserDetailSheetProps {
  open: boolean;
  user: UserSummary | null;
  onClose: () => void;
  copyId: (value: string) => void;
  onOpenTicket: (user: UserSummary) => void;
  onRemove: (user: UserSummary) => void;
}

function UserDetailSheet({ open, user, onClose, copyId, onOpenTicket, onRemove }: UserDetailSheetProps) {
  const username = user?.username;
  const { data, isLoading, isError } = useQuery<UserDetail>({
    queryKey: ['user-detail', username],
    queryFn: () => getUser(username as string),
    enabled: open && !!username,
  });

  if (!user) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminSideSheetContent
        title={data?.username ?? user.username}
        description='목록에서 숨긴 접속 기록과 티켓 현황을 포함한 사용자 상세 정보입니다.'
        size='xl'
      >
        {isLoading ? (
          <div className='flex min-h-[320px] items-center justify-center'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : isError || !data ? (
          <div className='flex min-h-[320px] items-center justify-center text-sm text-muted-foreground'>
            사용자 상세 정보를 불러오지 못했습니다.
          </div>
        ) : (
          <UserDetailContent
            user={data}
            copyId={copyId}
            onOpenTicket={onOpenTicket}
            onRemove={onRemove}
          />
        )}
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default UserDetailSheet;
