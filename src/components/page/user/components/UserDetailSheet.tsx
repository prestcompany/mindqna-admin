import { getUser } from '@/client/user';
import { User } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import UserDetailContent from './UserDetailContent';

interface UserDetailSheetProps {
  open: boolean;
  user: User | null;
  onClose: () => void;
  copyId: (value: string) => void;
  onOpenTicket: (user: User) => void;
  onRemove: (user: User) => void;
}

function UserDetailSheet({ open, user, onClose, copyId, onOpenTicket, onRemove }: UserDetailSheetProps) {
  const username = user?.username;
  const { data, isLoading } = useQuery({
    queryKey: ['user-detail', username],
    queryFn: () => getUser(username as string),
    enabled: open && !!username,
  });

  const detail = data ?? user;

  if (!detail) {
    return null;
  }

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminSideSheetContent
        title={detail.username}
        description='목록에서 숨긴 접속 기록과 티켓 현황을 포함한 사용자 상세 정보입니다.'
        size='xl'
      >
        {isLoading && !data ? (
          <div className='flex min-h-[320px] items-center justify-center'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <UserDetailContent
            user={detail}
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
