import { getUser } from '@/client/user';
import { UserDetail, UserSummary } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import UserDetailContent from './UserDetailContent';
import UserProfilesTab from './tabs/UserProfilesTab';
import UserPurchasesTab from './tabs/UserPurchasesTab';
import UserEntitlementsTab from './tabs/UserEntitlementsTab';
import UserAccessTab from './tabs/UserAccessTab';
import UserPushesTab from './tabs/UserPushesTab';

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
  const [tab, setTab] = useState('overview');
  useEffect(() => {
    setTab('overview');
  }, [username]);
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
        description='사용자 상세 정보와 결제/구독/접속/푸시 탭을 확인합니다.'
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
          <Tabs value={tab} onValueChange={setTab} className='w-full'>
            <div className='mb-4 overflow-x-auto pb-1'>
              <TabsList className='whitespace-nowrap'>
                <TabsTrigger value='overview'>개요</TabsTrigger>
                <TabsTrigger value='profiles'>참여 공간</TabsTrigger>
                <TabsTrigger value='purchases'>결제 내역</TabsTrigger>
                <TabsTrigger value='entitlements'>구독/권한</TabsTrigger>
                <TabsTrigger value='access'>접속 기록</TabsTrigger>
                <TabsTrigger value='pushes'>푸시 이력</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value='overview'>
              <UserDetailContent user={data} copyId={copyId} onOpenTicket={onOpenTicket} onRemove={onRemove} />
            </TabsContent>
            <TabsContent value='profiles'>
              <UserProfilesTab username={data.username} active={tab === 'profiles'} />
            </TabsContent>
            <TabsContent value='purchases'>
              <UserPurchasesTab username={data.username} active={tab === 'purchases'} />
            </TabsContent>
            <TabsContent value='entitlements'>
              <UserEntitlementsTab username={data.username} active={tab === 'entitlements'} />
            </TabsContent>
            <TabsContent value='access'>
              <UserAccessTab username={data.username} active={tab === 'access'} />
            </TabsContent>
            <TabsContent value='pushes'>
              <UserPushesTab username={data.username} active={tab === 'pushes'} />
            </TabsContent>
          </Tabs>
        )}
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default UserDetailSheet;
