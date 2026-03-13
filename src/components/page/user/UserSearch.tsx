import { User } from '@/client/types';
import { SearchUserParams, removeUser, searchUser } from '@/client/user';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import TableRowActions from '@/components/shared/ui/table-row-actions';
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
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import dayjs from 'dayjs';
import { Loader2, Search, Ticket } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import TicketForm from './TicketForm';

function formatRelativeAccess(value?: string | null) {
  if (!value) {
    return { label: '기록 없음', description: '' };
  }

  const day = dayjs(value);
  const diffMinutes = Math.max(dayjs().diff(day, 'minute'), 0);
  const diffHours = Math.max(dayjs().diff(day, 'hour'), 0);
  const diffDays = Math.max(dayjs().diff(day, 'day'), 0);
  const label =
    diffMinutes < 60 ? `${diffMinutes}분 전` : diffHours < 24 ? `${diffHours}시간 전` : `${diffDays}일 전`;

  return {
    label,
    description: day.format('YYYY.MM.DD HH:mm:ss'),
  };
}

function formatReserveUnregister(createdAt: string, value?: string | null) {
  if (!value) {
    return null;
  }

  const day = dayjs(value);
  const diff = day.add(-48, 'hour').diff(createdAt, 'minute');
  const gap = diff > 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;

  return {
    label: `${gap}만에 삭제`,
    dateText: day.format('YYYY.MM.DD HH:mm:ss'),
    isUrgent: diff < 60,
  };
}

function UserSearch() {
  const [userId, setUserId] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [isOpenTicket, setOpenTicket] = useState(false);
  const [focused, setFocused] = useState<string>('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

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

  const { data, refetch, isLoading, isFetched, error } = useQuery({
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

  const renderUserCard = (user: User) => {
    const {
      id,
      username,
      locale,
      socialAccount,
      createdAt,
      _count,
      reserveUnregisterAt,
      spaceMaxCount,
      representativeNickname,
      latestAccessAt,
      ticketSummary,
    } = user;
    const created = dayjs(createdAt);
    const diffFromNow = dayjs().diff(created, 'day');
    const accessMeta = formatRelativeAccess(latestAccessAt);
    const summary = ticketSummary ?? { owned: 0, used: 0, expired: 0 };
    const reserveMeta = formatReserveUnregister(createdAt, reserveUnregisterAt);

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
      <Card className='overflow-hidden border-border/70 bg-white shadow-sm'>
        <CardHeader className='gap-3 border-b border-border/70 bg-muted/[0.08] px-4 py-4'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
            <div className='flex min-w-0 items-start gap-3'>
              <Avatar className='h-11 w-11 border border-border/70 bg-background'>
                <AvatarFallback className='text-sm font-semibold uppercase'>
                  {username.slice(0, 2)}
                </AvatarFallback>
              </Avatar>
              <div className='min-w-0 space-y-1.5'>
                <div className='flex flex-wrap items-center gap-2'>
                  <CardTitle className='text-lg font-semibold tracking-tight text-foreground'>{username}</CardTitle>
                  <Badge variant={isCompleted ? 'success' : 'warning'} className='rounded-full px-2.5 py-0.5'>
                    {isCompleted ? '완료' : '진행중'}
                  </Badge>
                  <Badge variant={providerConfig.variant} className='rounded-full px-2.5 py-0.5'>
                    {providerConfig.text}
                  </Badge>
                  <Badge variant='muted' className='rounded-full px-2.5 py-0.5 uppercase'>
                    {locale?.toUpperCase()}
                  </Badge>
                </div>
                <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  <Button
                    type='button'
                    variant='link'
                    size='sm'
                    className='h-auto p-0 font-mono text-[11px] text-muted-foreground'
                    onClick={() => copyId(id)}
                  >
                    {id}
                  </Button>
                  <span className='hidden sm:inline'>•</span>
                  <span className='truncate'>{socialAccount.email || '이메일 없음'}</span>
                </div>
              </div>
            </div>

            <div className='flex items-center gap-1.5 self-start'>
              <Button
                size='sm'
                variant='ghost'
                className='h-8 rounded-full px-2.5 text-muted-foreground hover:text-foreground'
                onClick={() => {
                  setOpenTicket(true);
                  setFocused(username);
                }}
              >
                <Ticket className='w-4 h-4' />
                티켓 지급
              </Button>
              <TableRowActions
                items={[
                  {
                    label: 'ID 복사',
                    onClick: () => copyId(id),
                  },
                  {
                    label: '사용자 삭제',
                    onClick: () => handleRemoveClick(user),
                    destructive: true,
                  },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className='space-y-4 px-4 py-4'>
          <div className='grid gap-3 md:grid-cols-2 xl:grid-cols-3'>
            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>유저 ID</p>
              <Button
                type='button'
                variant='link'
                size='sm'
                className='mt-2 h-auto p-0 text-left font-mono text-xs text-foreground'
                onClick={() => copyId(id)}
              >
                {id}
              </Button>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>유저코드</p>
              <Button
                type='button'
                variant='link'
                size='sm'
                className='mt-2 h-auto p-0 text-left text-sm font-semibold text-foreground'
                onClick={() => copyId(username)}
              >
                {username}
              </Button>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>닉네임</p>
              <p className='mt-2 truncate text-sm font-semibold text-foreground'>{representativeNickname?.trim() || '-'}</p>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>가입상태</p>
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <Badge variant={isCompleted ? 'success' : 'warning'}>{isCompleted ? '완료' : '진행중'}</Badge>
                <span className='text-xs text-muted-foreground'>{isCompleted ? '공간 생성 완료' : '온보딩 진행 중'}</span>
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>로그인 / 언어</p>
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <Badge variant={providerConfig.variant}>{providerConfig.text}</Badge>
                <Badge variant='secondary'>{locale?.toUpperCase() || '-'}</Badge>
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>이메일</p>
              <p className='mt-2 break-all text-sm font-medium text-foreground'>{socialAccount.email || '미등록'}</p>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>공간 / 최대</p>
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <Badge variant='info'>공간 {_count.profiles || 0}</Badge>
                <Badge variant={spaceMaxCount > 5 ? 'warning' : spaceMaxCount > 2 ? 'success' : 'muted'}>
                  최대 {spaceMaxCount}
                </Badge>
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>가입일</p>
              <div className='mt-2 flex flex-wrap items-center gap-2'>
                <Badge variant={diffFromNow < 7 ? 'success' : diffFromNow < 30 ? 'warning' : 'muted'}>D+{diffFromNow}</Badge>
                <span className='text-sm font-medium text-foreground'>{created.format('YYYY.MM.DD HH:mm:ss')}</span>
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>마지막 접속</p>
              <p className='mt-2 text-sm font-semibold text-foreground'>{accessMeta.label}</p>
              {accessMeta.description ? <p className='mt-1 text-xs text-muted-foreground'>{accessMeta.description}</p> : null}
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>티켓</p>
              <p className='mt-2 text-sm font-semibold text-foreground'>보유 {summary.owned}</p>
              <p className='mt-1 text-xs text-muted-foreground'>사용 {summary.used} · 만료 {summary.expired}</p>
            </div>

            <div className='rounded-xl border border-border/70 bg-white px-3 py-3 md:col-span-2 xl:col-span-3'>
              <p className='text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>탈퇴예정일</p>
              {reserveMeta ? (
                <div className='mt-2 flex flex-wrap items-center gap-2'>
                  <Badge variant={reserveMeta.isUrgent ? 'destructive' : 'warning'}>{reserveMeta.label}</Badge>
                  <span className='text-sm font-medium text-foreground'>{reserveMeta.dateText}</span>
                </div>
              ) : (
                <p className='mt-2 text-sm text-muted-foreground'>예정 없음</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
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

      {data && renderUserCard(data)}

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
        <AdminSideSheetContent title='티켓 지급' size='md'>
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
