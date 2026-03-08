import { removeProfile, removeSpace, searchSpaces, type SearchSpacesParams } from '@/client/space';
import { Space, SpaceType } from '@/client/types';
import FormGroup from '@/components/shared/form/ui/form-group';
import FormSection from '@/components/shared/form/ui/form-section';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { CalendarClock, ChevronLeft, ChevronRight, Heart, Search, Sparkles, Star, Users } from 'lucide-react';
import { toast } from 'sonner';
import CoinForm from './CoinForm';

function SpaceSearch() {
  const [searchParams, setSearchParams] = useState({
    spaceId: '',
    name: '',
    username: '',
    nickname: '',
    type: undefined as SpaceType | undefined,
    locale: undefined as string | undefined,
    dateRange: {
      start: null as dayjs.Dayjs | null,
      end: null as dayjs.Dayjs | null,
    },
  });
  const [submittedSearchParams, setSubmittedSearchParams] = useState<SearchSpacesParams | null>(null);

  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isOpenCoin, setOpenCoin] = useState(false);
  const [focused, setFocused] = useState<Space | undefined>(undefined);

  const [deleteTarget, setDeleteTarget] = useState<Space | null>(null);
  const [deleteProfileTarget, setDeleteProfileTarget] = useState<{
    profileId: string;
    nickname: string;
  } | null>(null);

  const getSearchParams = (page: number): SearchSpacesParams | null => {
    const spaceId = searchParams.spaceId.trim();
    const name = searchParams.name.trim();
    const username = searchParams.username.trim();
    const nickname = searchParams.nickname.trim();

    if (!spaceId && !name && !username && !nickname) {
      return null;
    }

    return {
      page,
      spaceId: spaceId || undefined,
      name: name || undefined,
      username: username || undefined,
      nickname: nickname || undefined,
      type: searchParams.type,
      locale: searchParams.locale,
      startDate: searchParams.dateRange.start?.format('YYYY-MM-DD'),
      endDate: searchParams.dateRange.end?.format('YYYY-MM-DD'),
    };
  };

  const { data, refetch, isLoading, isFetched } = useQuery({
    queryKey: ['space-search', submittedSearchParams],
    queryFn: async () => {
      if (!submittedSearchParams) {
        throw new Error('검색어를 입력해주세요.');
      }

      return searchSpaces(submittedSearchParams);
    },
    enabled: !!submittedSearchParams,
  });
  const items = data?.items ?? [];
  const currentPage = submittedSearchParams?.page ?? 1;
  const totalCount = data?.totalCount ?? 0;

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`${id} 복사`);
  };

  const handleSearch = () => {
    const params = getSearchParams(1);

    if (!params) {
      toast.warning('공간 ID, 공간 이름, 사용자명, 닉네임 중 하나를 입력해주세요.');
      return;
    }

    setSubmittedSearchParams(params);
  };

  const handleResetFilters = () => {
    setSearchParams({
      spaceId: '',
      name: '',
      username: '',
      nickname: '',
      type: undefined,
      locale: undefined,
      dateRange: {
        start: null,
        end: null,
      },
    });
    setSubmittedSearchParams(null);
  };

  const handleChangePage = (page: number) => {
    if (!submittedSearchParams) return;
    setSubmittedSearchParams({ ...submittedSearchParams, page });
  };

  const handleRemoveSpace = (space: Space) => {
    setDeleteTarget(space);
  };

  const confirmRemoveSpace = async () => {
    if (!deleteTarget) return;
    try {
      await removeSpace(deleteTarget.id);
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
          <span className='max-w-[120px] truncate'>{row.original.id}</span>
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
      accessorFn: (row) => row.pet?.exp,
      id: 'petExp',
      header: '펫 EXP',
      size: 120,
      cell: ({ row }) => (
        <div className='flex gap-1 items-center whitespace-nowrap'>
          <Badge variant='info'>EXP {row.original.pet?.exp ?? 0}</Badge>
          <Badge variant='secondary'>Lv.{row.original.pet?.level ?? 0}</Badge>
        </div>
      ),
    },
    {
      accessorKey: 'createdAt',
      id: 'createdAt',
      header: '생성일',
      size: 100,
      cell: ({ row }) => {
        const day = dayjs(row.original.createdAt);
        const diffFromNow = Math.max(dayjs().diff(day, 'day'), 0);
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
        <TableRowActions
          items={[
            {
              label: '코인 관리',
              onClick: () => {
                setOpenCoin(true);
                setFocused(row.original);
              },
            },
            {
              label: '삭제',
              onClick: () => handleRemoveSpace(row.original),
              destructive: true,
            },
          ]}
        />
      ),
    },
  ];

  const renderCardItem = (space: Space) => {
    const { coin, coinPaid, dueRemovedAt, cardOrder } = space;
    const { type, name, locale, petName, ownerId } = space.spaceInfo;
    const level = space.pet?.level ?? 0;
    const exp = space.pet?.exp ?? 0;
    const ownerProfile = space.profiles.find((profile) => profile.userId === ownerId);

    const created = dayjs(space.createdAt);
    const diffFromNow = Math.max(dayjs().diff(created, 'day'), 0);
    const formattedExp = Number.isInteger(exp) ? exp.toLocaleString() : exp.toFixed(1);

    return (
      <Card key={space.id} className='overflow-hidden border-border/70 bg-white shadow-sm transition-shadow hover:shadow-md'>
        <CardHeader className='gap-3 border-b border-border/70 bg-white px-4 py-3'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='secondary' className='rounded-full px-2.5 py-0.5'>
                  {type}
                </Badge>
                <Badge variant='muted' className='rounded-full px-2.5 py-0.5 uppercase'>
                  {locale}
                </Badge>
                <Badge variant='outline' className='rounded-full px-2.5 py-0.5'>
                  D+{diffFromNow}
                </Badge>
                {dueRemovedAt && (
                  <Badge variant='destructive' className='rounded-full px-2.5 py-0.5'>
                    삭제 예정 {dayjs(dueRemovedAt).format('MM.DD HH:mm')}
                  </Badge>
                )}
              </div>

              <div className='space-y-1'>
                <CardTitle className='text-lg font-semibold tracking-tight text-foreground'>{name}</CardTitle>
                <div className='flex flex-wrap items-center gap-2 text-xs text-muted-foreground'>
                  <Button
                    type='button'
                    variant='link'
                    size='sm'
                    className='h-auto p-0 font-mono text-[11px] text-muted-foreground'
                    onClick={() => copyId(space.id)}
                  >
                    {space.id}
                  </Button>
                  <span className='hidden sm:inline'>•</span>
                  <span>{created.format('YYYY.MM.DD HH:mm')}</span>
                  {ownerProfile && (
                    <>
                      <span className='hidden sm:inline'>•</span>
                      <span>오너 {ownerProfile.nickname}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className='flex items-center gap-2 self-start'>
              <Button
                size='sm'
                variant='outline'
                className='h-8 rounded-full px-3'
                onClick={() => {
                  setOpenCoin(true);
                  setFocused(space);
                }}
              >
                코인 관리
              </Button>
              <TableRowActions
                items={[
                  {
                    label: 'ID 복사',
                    onClick: () => copyId(space.id),
                  },
                  {
                    label: '삭제',
                    onClick: () => handleRemoveSpace(space),
                    destructive: true,
                  },
                ]}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className='px-4 py-4'>
          <div className='grid gap-4 xl:grid-cols-[minmax(0,1fr)_280px]'>
            <div className='space-y-3'>
              <div className='grid gap-3 sm:grid-cols-2 xl:grid-cols-4'>
                <div className='rounded-xl border border-border/70 bg-muted/15 px-3 py-3'>
                  <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                    <Heart className='h-3.5 w-3.5' />
                    하트 / 스타
                  </div>
                  <div className='mt-2 flex items-center gap-2 text-lg font-semibold text-foreground'>
                    <span>{coin.toLocaleString()}</span>
                    <span className='text-muted-foreground'>/</span>
                    <span>{coinPaid.toLocaleString()}</span>
                  </div>
                </div>

                <div className='rounded-xl border border-border/70 bg-muted/15 px-3 py-3'>
                  <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                    <Sparkles className='h-3.5 w-3.5' />
                    질문 카드
                  </div>
                  <div className='mt-2 text-lg font-semibold text-foreground'>{cardOrder}</div>
                </div>

                <div className='rounded-xl border border-border/70 bg-muted/15 px-3 py-3'>
                  <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                    <Users className='h-3.5 w-3.5' />
                    멤버
                  </div>
                  <div className='mt-2 text-lg font-semibold text-foreground'>{space.profiles.length}</div>
                </div>

                <div className='rounded-xl border border-border/70 bg-muted/15 px-3 py-3'>
                  <div className='flex items-center gap-2 text-[11px] font-medium uppercase tracking-[0.16em] text-muted-foreground'>
                    <Sparkles className='h-3.5 w-3.5' />
                    펫
                  </div>
                  <div className='mt-2 text-lg font-semibold text-foreground'>{formattedExp}</div>
                  <p className='text-xs text-muted-foreground'>EXP / Lv.{level}</p>
                </div>
              </div>

              <div className='grid gap-3 rounded-xl border border-border/70 bg-muted/[0.08] p-3 md:grid-cols-2 xl:grid-cols-4'>
                <div className='space-y-1'>
                  <p className='text-xs font-medium text-muted-foreground'>펫 이름</p>
                  <p className='text-sm text-foreground'>{petName}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs font-medium text-muted-foreground'>오너</p>
                  <p className='text-sm text-foreground'>{ownerProfile?.nickname ?? '미확인'}</p>
                </div>
                <div className='space-y-1'>
                  <div className='flex items-center gap-1.5 text-xs font-medium text-muted-foreground'>
                    <CalendarClock className='h-3.5 w-3.5' />
                    생성 시점
                  </div>
                  <p className='text-sm text-foreground'>{created.format('YYYY.MM.DD HH:mm')}</p>
                </div>
                <div className='space-y-1'>
                  <p className='text-xs font-medium text-muted-foreground'>삭제 상태</p>
                  <p className='text-sm text-foreground'>
                    {dueRemovedAt ? dayjs(dueRemovedAt).format('YYYY.MM.DD HH:mm') : '삭제 예약 없음'}
                  </p>
                </div>
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-muted/[0.08] p-3'>
              <div className='flex items-center justify-between gap-3'>
                <p className='text-sm font-medium text-foreground'>멤버</p>
                <Badge variant='outline' className='rounded-full px-2.5 py-0.5'>
                  {space.profiles.length}명
                </Badge>
              </div>

              <Separator className='my-3' />

              <div className='grid max-h-[260px] grid-cols-1 gap-2 overflow-y-auto pr-1'>
                {space.profiles.map((profile) => {
                  const { isPremium, isGoldClub, userId } = profile;
                  const isOwner = userId === ownerId;

                  return (
                    <div
                      key={profile.id}
                      className={cn(
                        'flex items-center gap-3 rounded-xl border border-border/70 bg-white px-3 py-2.5',
                        isOwner && 'border-primary/20 bg-primary/[0.04]',
                      )}
                    >
                      <Avatar className='h-9 w-9 border border-border/70 bg-background'>
                        <AvatarImage src={profile.img?.uri} alt={profile.nickname} className='object-cover' />
                        <AvatarFallback>{profile.nickname.slice(0, 1)}</AvatarFallback>
                      </Avatar>
                      <div className='min-w-0 flex-1'>
                        <div className='flex flex-wrap items-center gap-2'>
                          <span className='truncate text-sm font-medium text-foreground'>{profile.nickname}</span>
                          {isOwner && (
                            <Badge variant='default' className='rounded-full px-2 py-0.5'>
                              OWNER
                            </Badge>
                          )}
                          {isPremium && (
                            <Badge variant='success' className='rounded-full px-2 py-0.5'>
                              PREMIUM
                            </Badge>
                          )}
                          {isGoldClub && (
                            <Badge variant='warning' className='rounded-full px-2 py-0.5'>
                              STAR
                            </Badge>
                          )}
                        </div>
                        <div className='mt-0.5 flex items-center gap-3'>
                          <span className='truncate text-xs text-muted-foreground'>{profile.user.username}</span>
                        </div>
                      </div>
                      <TableRowActions
                        items={[
                          {
                            label: 'username 복사',
                            onClick: () => copyId(profile.user.username),
                          },
                          {
                            label: '프로필 삭제',
                            onClick: () =>
                              setDeleteProfileTarget({
                                profileId: profile.id,
                                nickname: profile.nickname,
                              }),
                            destructive: true,
                          },
                        ]}
                      />
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
        <FormSection title='공간 검색 및 필터' description='공간 ID, 공간 이름, 사용자명, 닉네임으로 조회하고 조건을 추가로 필터링합니다.'>
          <FormGroup title='공간 ID'>
            <Input
              placeholder='공간 ID'
              value={searchParams.spaceId}
              onChange={(e) => setSearchParams((prev) => ({ ...prev, spaceId: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </FormGroup>

          <FormGroup title='공간 이름'>
            <Input
              placeholder='공간 이름'
              value={searchParams.name}
              onChange={(e) => setSearchParams((prev) => ({ ...prev, name: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </FormGroup>

          <FormGroup title='사용자명'>
            <Input
              placeholder='사용자명'
              value={searchParams.username}
              onChange={(e) => setSearchParams((prev) => ({ ...prev, username: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </FormGroup>

          <FormGroup title='프로필 닉네임'>
            <Input
              placeholder='닉네임'
              value={searchParams.nickname}
              onChange={(e) => setSearchParams((prev) => ({ ...prev, nickname: e.target.value }))}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
          </FormGroup>

          <FormGroup title='공간 타입'>
            <Select
              value={searchParams.type || '__all__'}
              onValueChange={(v) =>
                setSearchParams((prev) => ({
                  ...prev,
                  type: (v === '__all__' ? undefined : v) as SpaceType | undefined,
                }))
              }
            >
              <SelectTrigger className='w-full sm:w-[220px]'>
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
          </FormGroup>

          <FormGroup title='언어'>
            <Select
              value={searchParams.locale || '__all__'}
              onValueChange={(v) =>
                setSearchParams((prev) => ({ ...prev, locale: v === '__all__' ? undefined : v }))
              }
            >
              <SelectTrigger className='w-full sm:w-[220px]'>
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
          </FormGroup>

          <FormGroup title='생성일 범위'>
            <div className='flex items-center gap-2'>
              <Input
                type='date'
                value={searchParams.dateRange.start?.format('YYYY-MM-DD') ?? ''}
                onChange={(e) => {
                  setSearchParams((prev) => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      start: e.target.value ? dayjs(e.target.value) : null,
                    },
                  }));
                }}
                className='w-full sm:w-[180px]'
              />
              <span className='text-sm text-muted-foreground'>~</span>
              <Input
                type='date'
                value={searchParams.dateRange.end?.format('YYYY-MM-DD') ?? ''}
                onChange={(e) => {
                  setSearchParams((prev) => ({
                    ...prev,
                    dateRange: {
                      ...prev.dateRange,
                      end: e.target.value ? dayjs(e.target.value) : null,
                    },
                  }));
                }}
                className='w-full sm:w-[180px]'
              />
            </div>
          </FormGroup>

          <div className='flex justify-end gap-2 pt-2'>
            <Button type='button' variant='outline' onClick={handleResetFilters} disabled={isLoading}>
              초기화
            </Button>
            <Button type='button' onClick={handleSearch} disabled={isLoading}>
              <Search className='w-4 h-4' />
              검색
            </Button>
          </div>
        </FormSection>

        {data && (
          <div className='flex justify-between items-center'>
            <div>총 {totalCount.toLocaleString()}개 검색됨</div>
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
              <DataTable
                columns={columns}
                data={items}
                countLabel={totalCount}
                loading={isLoading}
                pagination={{
                  total: totalCount,
                  page: currentPage,
                  pageSize: 10,
                  onChange: (page) => handleChangePage(page),
                }}
              />
            ) : (
              <div className='space-y-4'>
                {items.map((space) => renderCardItem(space))}
                {totalCount > 0 && (
                  <div className='flex items-center justify-between px-1'>
                    <div className='text-sm text-muted-foreground'>
                      총 {totalCount.toLocaleString()}건 중 {(currentPage - 1) * 10 + 1}-{Math.min(currentPage * 10, totalCount)}
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => handleChangePage(currentPage - 1)}
                        disabled={currentPage <= 1 || isLoading}
                      >
                        <ChevronLeft className='w-4 h-4' />
                        이전
                      </Button>
                      <span className='text-sm text-muted-foreground'>
                        {currentPage} / {Math.max(data.pageInfo.totalPage, 1)}
                      </span>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => handleChangePage(currentPage + 1)}
                        disabled={currentPage >= data.pageInfo.totalPage || isLoading}
                      >
                        다음
                        <ChevronRight className='w-4 h-4' />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {isFetched && !isLoading && totalCount === 0 && (
          <Card className='py-8 text-center bg-card'>
            <CardContent>
              <div className='text-muted-foreground'>
                <p>검색 결과가 없습니다.</p>
                <p className='mt-1 text-sm'>검색어 또는 필터 조건을 다시 확인해주세요.</p>
              </div>
            </CardContent>
          </Card>
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
        <AdminSideSheetContent title='코인 관리' size='md'>
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
        </AdminSideSheetContent>
      </Sheet>

      {/* 공간 삭제 확인 */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget && `(${deleteTarget.spaceInfo.name})을(를) 삭제하시겠습니까?`}
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
