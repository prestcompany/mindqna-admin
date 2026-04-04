import { UserDetail, UserSummary } from '@/client/types';
import { SearchUserParams, removeUser, searchUser } from '@/client/user';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
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
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import { Loader2, Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import TicketForm from './TicketForm';
import UserDetailContent from './components/UserDetailContent';

function UserSearch() {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isOpenTicket, setOpenTicket] = useState(false);
  const [focused, setFocused] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<UserSummary | null>(null);

  const getFilledFields = () =>
    [
      { key: 'id' as const, label: 'ID', value: userId.trim() },
      { key: 'username' as const, label: 'Username', value: username.trim() },
      { key: 'email' as const, label: 'Email', value: email.trim() },
    ].filter((field) => field.value.length > 0);

  const getSearchParams = (): SearchUserParams | null => {
    const filledFields = getFilledFields();

    if (filledFields.length !== 1) {
      return null;
    }

    const [field] = filledFields;

    return { [field.key]: field.value } as SearchUserParams;
  };

  const getSearchSummary = () => {
    const [field] = getFilledFields();

    return field ? `${field.label}: ${field.value}` : '';
  };

  const { data, refetch, isLoading, isFetched, error } = useQuery<UserDetail>({
    queryKey: ['user-search', userId, username, email],
    queryFn: () => {
      const params = getSearchParams();

      if (!params) {
        throw new Error('검색 조건이 올바르지 않습니다.');
      }

      return searchUser(params);
    },
    enabled: false,
  });

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${text} 복사됨`);
  };

  const getErrorMessage = () => {
    if (!error) {
      return getSearchSummary();
    }

    if (isAxiosError<{ message?: string }>(error)) {
      return error.response?.data?.message ?? error.message;
    }

    return error instanceof Error ? error.message : getSearchSummary();
  };

  const handleRemoveClick = (user: UserSummary) => {
    setConfirmTarget(user);
    setConfirmOpen(true);
  };

  const handleRemoveConfirm = async () => {
    if (!confirmTarget) return;
    try {
      await removeUser(confirmTarget.id);
      toast.success(`${confirmTarget.username} 사용자가 삭제되었습니다`);
      await refetch();
    } catch (err) {
      toast.error(`삭제 실패: ${err}`);
    } finally {
      setConfirmOpen(false);
      setConfirmTarget(null);
    }
  };

  const handleSearch = () => {
    const filledFields = getFilledFields();

    if (filledFields.length === 0) {
      toast.warning('ID, Username, Email 중 하나를 입력해주세요.');
      return;
    }

    if (filledFields.length > 1) {
      toast.warning('한 번에 한 필드만 검색해주세요.');
      return;
    }

    refetch();
  };

  const handleResetSearch = () => {
    setUserId('');
    setUsername('');
    setEmail('');
  };

  return (
    <div className='space-y-4'>
      <FormSection title='사용자 검색' description='userId / username / email로 계정을 정확하게 조회합니다.'>
        <FormGroup title='ID'>
          <Input
            placeholder='정확한 ID를 입력하세요...'
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className='h-10'
          />
        </FormGroup>

        <FormGroup title='Username'>
          <Input
            placeholder='정확한 Username을 입력하세요...'
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className='h-10'
          />
        </FormGroup>

        <FormGroup title='Email'>
          <Input
            placeholder='정확한 Email을 입력하세요...'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className='h-10'
          />
        </FormGroup>

        <div className='flex justify-end gap-2 pt-2'>
          <Button type='button' variant='outline' onClick={handleResetSearch} disabled={isLoading}>
            초기화
          </Button>
          <Button type='button' onClick={handleSearch} disabled={isLoading}>
            {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Search className='w-4 h-4' />}
            검색
          </Button>
        </div>
      </FormSection>

      {data ? (
        <UserDetailContent
          user={data}
          copyId={copyId}
          onOpenTicket={(user) => {
            setOpenTicket(true);
            setFocused(user.username);
          }}
          onRemove={handleRemoveClick}
        />
      ) : null}

      {!data && !isLoading && isFetched && (
        <Card className='py-8 text-center bg-card'>
          <CardContent>
            <div className='text-muted-foreground'>
              <p>{error ? '검색을 완료하지 못했습니다' : '검색 결과가 없습니다'}</p>
              <p className='mt-1 text-sm'>{getErrorMessage()}</p>
            </div>
          </CardContent>
        </Card>
      )}

      <Sheet
        open={isOpenTicket}
        onOpenChange={(open) => {
          if (!open) {
            setOpenTicket(false);
            setFocused('');
          }
        }}
      >
        <AdminSideSheetContent title='티켓 관리' size='md'>
          <TicketForm
            reload={refetch}
            close={() => {
              setOpenTicket(false);
              setFocused('');
            }}
            username={focused}
          />
        </AdminSideSheetContent>
      </Sheet>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>사용자 삭제</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className='space-y-2'>
                <p>
                  <strong>{confirmTarget?.username}</strong> 사용자를 삭제하시겠습니까?
                </p>
                <div className='text-sm text-gray-600'>
                  <p>• 이메일: {confirmTarget?.socialAccount.email}</p>
                  <p>• 가입일: {confirmTarget ? dayjs(confirmTarget.createdAt).format('YYYY-MM-DD') : ''}</p>
                  <p>• 공간 수: {confirmTarget?._count.profiles}개</p>
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
    </div>
  );
}

export default UserSearch;
