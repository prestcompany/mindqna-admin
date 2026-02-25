import { User } from '@/client/types';
import { getUser, getUserByEmail, removeUser } from '@/client/user';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Copy, Loader2, Search, Ticket } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import TicketForm from './TicketForm';

function UserSearch() {
  const [id, setId] = useState('');
  const [isOpenTicket, setOpenTicket] = useState(false);
  const [focused, setFocused] = useState<string>('');
  const [email, setEmail] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  const { data, refetch, isLoading, isFetched } = useQuery({
    queryKey: ['user', id, email],
    queryFn: () => {
      if (id) {
        return getUser(id);
      } else if (email) {
        return getUserByEmail(email);
      }
    },
    enabled: false,
  });

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${text} 복사됨`);
  };

  const handleRemoveClick = (user: User) => {
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

  const renderUserCard = (user: User) => {
    const { id, username, locale, socialAccount, createdAt, _count, reserveUnregisterAt, spaceMaxCount } = user;
    const created = dayjs(createdAt);
    const diffFromNow = dayjs().diff(created, 'day');

    const providerMap: Record<string, { variant: 'destructive' | 'warning' | 'muted' | 'success'; text: string }> = {
      GOOGLE: { variant: 'destructive', text: 'Google' },
      KAKAO: { variant: 'warning', text: 'Kakao' },
      APPLE: { variant: 'muted', text: 'Apple' },
      LINE: { variant: 'success', text: 'Line' },
    };

    const providerConfig = providerMap[socialAccount.provider as string] || {
      variant: 'muted' as const,
      text: socialAccount.provider,
    };

    const isCompleted = _count.profiles > 0;

    return (
      <Card className='bg-white shadow-sm'>
        <CardHeader className='pb-3'>
          <div className='flex justify-between items-center'>
            <div className='flex gap-2 items-center'>
              <CardTitle className='text-base'>{username}</CardTitle>
              <Badge variant={isCompleted ? 'success' : 'warning'}>{isCompleted ? '완료' : '진행중'}</Badge>
            </div>
            <div className='flex items-center gap-2'>
              <Button
                size='sm'
                onClick={() => {
                  setOpenTicket(true);
                  setFocused(username);
                }}
              >
                <Ticket className='w-4 h-4' />
                티켓 지급
              </Button>
              <Button size='sm' variant='destructive' onClick={() => handleRemoveClick(user)}>
                삭제
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-3'>
          <div className='flex flex-wrap gap-2'>
            <Button variant='outline' size='sm' onClick={() => copyId(id)}>
              ID: {id.slice(0, 8)}...
              <Copy className='w-3 h-3' />
            </Button>
            <Badge variant={providerConfig.variant}>{providerConfig.text}</Badge>
            <Badge variant='secondary'>{locale?.toUpperCase()}</Badge>
          </div>

          <div className='flex gap-2 items-center'>
            <span className='text-sm text-gray-500'>이메일:</span>
            <span>{socialAccount.email}</span>
          </div>

          <div className='flex flex-wrap gap-2'>
            <Badge variant='info'>공간 {_count.profiles}개</Badge>
            <Badge variant={spaceMaxCount > 5 ? 'warning' : spaceMaxCount > 2 ? 'success' : 'muted'}>
              최대 {spaceMaxCount}개
            </Badge>
            <Badge variant={diffFromNow < 7 ? 'success' : diffFromNow < 30 ? 'warning' : 'muted'}>
              D+{diffFromNow}
            </Badge>
          </div>

          <div className='flex gap-2 items-center text-sm text-gray-500'>
            <span>가입일:</span>
            <span>{created.format('YYYY-MM-DD HH:mm')}</span>
          </div>

          {reserveUnregisterAt && (
            <div className='flex gap-2 items-center'>
              <Badge variant='destructive'>탈퇴 예정</Badge>
              <span className='text-sm text-red-600'>{reserveUnregisterAt}</span>
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <div className='space-y-4'>
      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base flex items-center gap-2'>
            <Search className='w-4 h-4' />
            사용자 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-2'>
            <Input
              placeholder='유저코드를 입력하세요...'
              value={id}
              onChange={(e) => setId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refetch()}
              className='h-10'
            />
            <Button onClick={() => refetch()} disabled={isLoading || !id.trim()} className='h-10'>
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Search className='w-4 h-4' />}
              유저코드 검색
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className='pb-3'>
          <CardTitle className='text-base flex items-center gap-2'>
            <Search className='w-4 h-4' />
            이메일 검색
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className='flex gap-2'>
            <Input
              placeholder='이메일을 입력하세요...'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && refetch()}
              className='h-10'
            />
            <Button onClick={() => refetch()} disabled={isLoading || !email.trim()} className='h-10'>
              {isLoading ? <Loader2 className='w-4 h-4 animate-spin' /> : <Search className='w-4 h-4' />}
              이메일 검색
            </Button>
          </div>
        </CardContent>
      </Card>

      {data && renderUserCard(data)}

      {!data && !isLoading && isFetched && (
        <Card className='py-8 text-center'>
          <CardContent>
            <div className='text-gray-400'>
              <p>검색 결과가 없습니다</p>
              <p className='mt-1 text-sm'>{id.trim() ? `유저코드: ${id}` : `이메일: ${email}`}</p>
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
        <SheetContent side='right' className='w-[600px] sm:max-w-none overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>티켓 지급</SheetTitle>
          </SheetHeader>
          <TicketForm
            reload={refetch}
            close={() => {
              setOpenTicket(false);
              setFocused('');
            }}
            username={focused}
          />
        </SheetContent>
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
