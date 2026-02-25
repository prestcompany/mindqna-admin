import { removeProfile, removeSpace, searchSpaces } from '@/client/space';
import { Space, SpaceType } from '@/client/types';
import DataTable from '@/components/shared/ui/data-table';
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
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useState } from 'react';
import { toast } from 'sonner';
import CoinForm from './CoinForm';

dayjs.extend(isBetween);

function SpaceSearch() {
  const [searchParams, setSearchParams] = useState({
    id: '',
    username: '',
    type: undefined as SpaceType | undefined,
    locale: undefined as string | undefined,
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isOpenCoin, setOpenCoin] = useState(false);
  const [focused, setFocused] = useState<Space | undefined>(undefined);

  // AlertDialog states
  const [deleteTarget, setDeleteTarget] = useState<{ space: Space; type: 'space' } | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<{
    profileId: string;
    nickname: string;
    refetch: () => void;
  } | null>(null);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['space-search', searchParams],
    queryFn: () =>
      searchSpaces({
        spaceId: searchParams.id || '',
        username: searchParams.username || '',
      }),
    enabled: false,
  });

  const filteredData =
    data?.filter((space) => {
      if (searchParams.type && space.spaceInfo.type !== searchParams.type) return false;
      if (searchParams.locale && space.spaceInfo.locale !== searchParams.locale) return false;
      if (searchParams.dateRange) {
        const created = dayjs(space.spaceInfo.createdAt);
        if (!created.isBetween(searchParams.dateRange[0], searchParams.dateRange[1], 'day', '[]')) return false;
      }
      return true;
    }) || [];

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`${id} 복사`);
  };

  const handleSearch = () => {
    if (!searchParams.id && !searchParams.username) {
      toast.warning('검색어를 입력해주세요');
      return;
    }
    refetch();
  };

  const handleRemoveSpace = (space: Space) => {
    setDeleteTarget({ space, type: 'space' });
  };

  const confirmRemoveSpace = async () => {
    if (!deleteTarget) return;
    try {
      await removeSpace(deleteTarget.space.id);
      await refetch();
      toast.success('공간이 삭제되었습니다');
    } catch (err) {
      toast.error(`${err}`);
    }
    setDeleteTarget(null);
  };

  const confirmRemoveProfile = async () => {
    if (!deleteProfileTarget) return;
    try {
      await removeProfile(deleteProfileTarget.profileId);
      await refetch();
      toast.success('프로필이 삭제되었습니다');
    } catch (err) {
      toast.error(`${err}`);
    }
    setDeleteProfileTarget(null);
  };

  const columns: ColumnDef<Space>[] = [
    {
      accessorKey: 'id',
      header: 'ID',
      size: 120,
      cell: ({ row }) => (
        <Button size='sm' variant='outline' onClick={() => copyId(row.original.id)}>
          {row.original.id}
        </Button>
      ),
    },
    {
      accessorFn: (row) => row.spaceInfo?.name,
      id: 'name',
      header: '이름',
      size: 150,
    },
    {
      accessorFn: (row) => row.spaceInfo?.type,
      id: 'type',
      header: '타입',
      size: 80,
      cell: ({ row }) => <Badge variant='secondary'>{row.original.spaceInfo?.type}</Badge>,
    },
    {
      accessorFn: (row) => row.spaceInfo?.locale,
      id: 'locale',
      header: '언어',
      size: 60,
      cell: ({ row }) => <Badge variant='secondary'>{row.original.spaceInfo?.locale}</Badge>,
    },
    {
      accessorFn: (row) => row.profiles?.length,
      id: 'members',
      header: '멤버',
      size: 60,
    },
    {
      id: 'coins',
      header: '하트/스타',
      size: 120,
      cell: ({ row }) => (
        <div className='flex gap-1'>
          <Badge variant='destructive'>{row.original.coin}</Badge>
          <Badge variant='warning'>{row.original.coinPaid}</Badge>
        </div>
      ),
    },
    {
      accessorFn: (row) => row.pet?.level,
      id: 'level',
      header: '펫 LV',
      size: 60,
    },
    {
      accessorFn: (row) => row.spaceInfo?.createdAt,
      id: 'createdAt',
      header: '생성일',
      size: 100,
      cell: ({ row }) => {
        const day = dayjs(row.original.spaceInfo?.createdAt);
        const diffFromNow = dayjs().diff(day, 'day');
        return (
          <div>
            <Badge variant='secondary'>D+{diffFromNow}</Badge>
            <div className='text-xs'>{day.format('MM.DD')}</div>
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '작업',
      size: 120,
      cell: ({ row }) => (
        <div className='flex gap-1'>
          <Button
            size='sm'
            onClick={() => {
              setOpenCoin(true);
              setFocused(row.original);
            }}
          >
            코인
          </Button>
          <Button size='sm' variant='destructive' onClick={() => handleRemoveSpace(row.original)}>
            삭제
          </Button>
        </div>
      ),
    },
  ];

  const renderCardItem = (space: Space) => {
    const { coin, coinPaid, dueRemovedAt, rooms, cardOrder } = space;
    const { type, name, locale, petName, ownerId, createdAt } = space.spaceInfo;
    const { level } = space.pet;

    const created = dayjs(createdAt);
    const diffFromNow = dayjs().diff(created, 'day');

    return (
      <Card key={space.id} className='mb-4'>
        <CardHeader className='p-4 pb-2'>
          <div className='flex justify-between items-center'>
            <CardTitle className='text-base'>{name}</CardTitle>
            <div className='flex gap-2'>
              <Button size='sm' variant='outline' onClick={() => copyId(space.id)}>
                ID 복사
              </Button>
              <Button
                size='sm'
                onClick={() => {
                  setOpenCoin(true);
                  setFocused(space);
                }}
              >
                코인 지급
              </Button>
              <Button size='sm' variant='destructive' onClick={() => handleRemoveSpace(space)}>
                삭제
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className='p-4 pt-0'>
          <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
            <div className='space-y-2'>
              <div className='flex gap-2 items-center'>
                <Badge variant='secondary'>{type}</Badge>
                <Badge variant='secondary'>언어 {locale}</Badge>
                <Badge variant='secondary'>질문 {cardOrder}개</Badge>
              </div>

              <div className='flex gap-2 items-center'>
                <Badge variant='destructive'>하트 {coin}</Badge>
                <Badge variant='warning'>스타 {coinPaid}</Badge>
              </div>

              <div className='flex gap-2 items-center'>
                <Badge variant='secondary'>펫이름: {petName}</Badge>
                <Badge variant='secondary'>LV. {level}</Badge>
              </div>

              <div className='flex gap-2 items-center'>
                <Badge variant='secondary'>생성일: D+{diffFromNow}</Badge>
                <span className='text-sm text-gray-500'>{created.format('YY.MM.DD HH:mm')}</span>
              </div>

              {dueRemovedAt && <Badge variant='destructive'>삭제 예정일 {dueRemovedAt}</Badge>}
            </div>

            <div>
              <div className='mb-2 font-semibold'>멤버 {space.profiles.length}명</div>
              <div className='grid overflow-y-auto grid-cols-1 gap-2 max-h-48'>
                {space.profiles.map((profile) => {
                  const { isPremium, isGoldClub, userId } = profile;
                  const isOwner = userId === ownerId;

                  return (
                    <div key={profile.id} className='flex gap-2 items-center p-2 bg-gray-50 rounded'>
                      <img
                        src={profile.img?.uri}
                        alt={profile.nickname}
                        width={32}
                        height={32}
                        className='object-cover rounded'
                      />
                      <div className='flex-1'>
                        <div className='flex gap-1 items-center'>
                          <span className='text-sm font-medium'>{profile.nickname}</span>
                          {isOwner && <Badge variant='default'>OWNER</Badge>}
                          {isPremium && <Badge variant='success'>PREMIUM</Badge>}
                          {isGoldClub && <Badge variant='warning'>STAR</Badge>}
                        </div>
                        <div className='flex gap-1 mt-1'>
                          <Button
                            size='sm'
                            variant='link'
                            className='p-0 h-auto'
                            onClick={() => copyId(profile.user.username)}
                          >
                            {profile.user.username}
                          </Button>
                          <Button
                            size='sm'
                            variant='link'
                            className='p-0 h-auto text-destructive'
                            onClick={() =>
                              setDeleteProfileTarget({
                                profileId: profile.id,
                                nickname: profile.nickname,
                                refetch: () => refetch(),
                              })
                            }
                          >
                            삭제
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <>
      <div className='space-y-4'>
        <details open className='bg-white rounded-lg border'>
          <summary className='px-4 py-3 font-medium cursor-pointer'>검색 및 필터</summary>
          <div className='px-4 pb-4'>
            <div className='grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-4'>
              <div>
                <label className='block mb-1 text-sm font-medium'>공간 ID</label>
                <Input
                  placeholder='공간 ID'
                  value={searchParams.id}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, id: e.target.value }))}
                />
              </div>

              <div>
                <label className='block mb-1 text-sm font-medium'>사용자명</label>
                <Input
                  placeholder='사용자명'
                  value={searchParams.username}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, username: e.target.value }))}
                />
              </div>

              <div>
                <label className='block mb-1 text-sm font-medium'>공간 타입</label>
                <Select
                  value={searchParams.type || '__all__'}
                  onValueChange={(v) =>
                    setSearchParams((prev) => ({
                      ...prev,
                      type: (v === '__all__' ? undefined : v) as SpaceType | undefined,
                    }))
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='공간 타입' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__all__'>전체</SelectItem>
                    <SelectItem value='alone'>혼자</SelectItem>
                    <SelectItem value='couple'>커플</SelectItem>
                    <SelectItem value='family'>가족</SelectItem>
                    <SelectItem value='friends'>친구</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className='block mb-1 text-sm font-medium'>언어</label>
                <Select
                  value={searchParams.locale || '__all__'}
                  onValueChange={(v) =>
                    setSearchParams((prev) => ({ ...prev, locale: v === '__all__' ? undefined : v }))
                  }
                >
                  <SelectTrigger className='w-full'>
                    <SelectValue placeholder='언어' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='__all__'>전체</SelectItem>
                    <SelectItem value='ko'>KO</SelectItem>
                    <SelectItem value='en'>EN</SelectItem>
                    <SelectItem value='ja'>JA</SelectItem>
                    <SelectItem value='zh'>ZH</SelectItem>
                    <SelectItem value='zhTw'>ZH-TW</SelectItem>
                    <SelectItem value='es'>ES</SelectItem>
                    <SelectItem value='id'>ID</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 mb-4 md:grid-cols-2'>
              <div>
                <label className='block mb-1 text-sm font-medium'>생성일 범위</label>
                <div className='flex gap-2 items-center'>
                  <Input
                    type='date'
                    value={searchParams.dateRange?.[0]?.format('YYYY-MM-DD') ?? ''}
                    onChange={(e) => {
                      const start = e.target.value ? dayjs(e.target.value) : null;
                      const end = searchParams.dateRange?.[1] ?? null;
                      setSearchParams((prev) => ({
                        ...prev,
                        dateRange: start && end ? [start, end] : start ? [start, dayjs()] : null,
                      }));
                    }}
                  />
                  <span>~</span>
                  <Input
                    type='date'
                    value={searchParams.dateRange?.[1]?.format('YYYY-MM-DD') ?? ''}
                    onChange={(e) => {
                      const end = e.target.value ? dayjs(e.target.value) : null;
                      const start = searchParams.dateRange?.[0] ?? null;
                      setSearchParams((prev) => ({
                        ...prev,
                        dateRange: start && end ? [start, end] : end ? [dayjs(), end] : null,
                      }));
                    }}
                  />
                </div>
              </div>
            </div>

            <Button onClick={handleSearch} disabled={isLoading}>
              검색
            </Button>
          </div>
        </details>

        {data && (
          <div className='flex justify-between items-center'>
            <div>총 {filteredData.length}개 검색됨</div>
            <RadioGroup
              value={viewMode}
              onValueChange={(v) => setViewMode(v as 'card' | 'table')}
              className='flex gap-0'
            >
              <div className='flex items-center'>
                <RadioGroupItem value='card' id='view-card' className='sr-only peer' />
                <Label
                  htmlFor='view-card'
                  className='cursor-pointer rounded-l-md border px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
                >
                  카드 뷰
                </Label>
              </div>
              <div className='flex items-center'>
                <RadioGroupItem value='table' id='view-table' className='sr-only peer' />
                <Label
                  htmlFor='view-table'
                  className='cursor-pointer rounded-r-md border border-l-0 px-3 py-1.5 text-sm peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
                >
                  테이블 뷰
                </Label>
              </div>
            </RadioGroup>
          </div>
        )}

        {data && (
          <>
            {viewMode === 'table' ? (
              <DataTable columns={columns} data={filteredData} countLabel={filteredData.length} loading={isLoading} />
            ) : (
              <div className='space-y-4'>{filteredData.map((space) => renderCardItem(space))}</div>
            )}
          </>
        )}
      </div>

      <Sheet
        open={isOpenCoin}
        onOpenChange={(open) => {
          if (!open) {
            setOpenCoin(false);
            setFocused(undefined);
          }
        }}
      >
        <SheetContent side='right' className='w-[600px] sm:max-w-none overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>코인 관리</SheetTitle>
          </SheetHeader>
          <CoinForm
            reload={refetch}
            close={() => {
              setOpenCoin(false);
              setFocused(undefined);
            }}
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
        </SheetContent>
      </Sheet>

      {/* 공간 삭제 확인 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `(${deleteTarget.space.spaceInfo.name})을(를) 삭제하시겠습니까?`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmRemoveSpace}>삭제</AlertDialogAction>
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
    </>
  );
}

export default SpaceSearch;
