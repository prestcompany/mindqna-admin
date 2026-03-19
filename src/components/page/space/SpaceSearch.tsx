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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Copy, Search } from 'lucide-react';
import { toast } from 'sonner';
import { formatDate, formatDueRemovedAt, formatSpaceAge, getSpaceTypeConfig } from './utils/space-display';
import CoinForm from './CoinForm';
import SpaceDetailSheet from './components/SpaceDetailSheet';

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
  const [detailTarget, setDetailTarget] = useState<Space | null>(null);

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
        <Button
          size='sm'
          variant='outline'
          onClick={(event) => {
            event.stopPropagation();
            copyId(row.original.id);
          }}
        >
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
        <div onClick={(event) => event.stopPropagation()}>
          <TableRowActions
            items={[
              {
                label: '상세 보기',
                onClick: () => setDetailTarget(row.original),
              },
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
        </div>
      ),
    },
  ];

  const renderCardItem = (space: Space) => {
    const { coin, coinPaid } = space;
    const { name, locale, ownerId } = space.spaceInfo;
    const hasPremiumMember = space.hasPremiumMember ?? space.profiles.some((profile) => profile.isPremium);
    const hasGoldClubMember = space.hasGoldClubMember ?? space.profiles.some((profile) => profile.isGoldClub);
    const typeConfig = getSpaceTypeConfig(space.spaceInfo?.type);
    const createdMeta = formatSpaceAge(space.createdAt);
    const dueRemovedMeta = formatDueRemovedAt(space.dueRemovedAt, space.createdAt, hasPremiumMember);

    return (
      <Card
        key={space.id}
        className='cursor-pointer overflow-hidden border-border/70 bg-white shadow-sm transition-shadow hover:shadow-md'
        onClick={() => setDetailTarget(space)}
      >
        <CardHeader className='gap-3 border-b border-border/70 bg-white px-4 py-3'>
          <div className='flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between'>
            <div className='space-y-2'>
              <div className='flex flex-wrap items-center gap-2'>
                <Badge variant='secondary'>{locale?.toUpperCase() ?? '-'}</Badge>
                <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
                {space.isActive ? <Badge variant='success'>ACTIVE</Badge> : <Badge variant='muted'>INACTIVE</Badge>}
                {hasPremiumMember ? <Badge variant='success'>PREMIUM 포함</Badge> : null}
                {hasGoldClubMember ? <Badge variant='warning'>GOLD CLUB 포함</Badge> : null}
              </div>

              <CardTitle className='text-lg font-semibold tracking-tight text-foreground'>{name ?? '공간 상세'}</CardTitle>
            </div>

            <div className='flex items-center gap-2 self-start'>
              <Button
                size='sm'
                variant='outline'
                className='h-8 rounded-full px-3'
                onClick={(event) => {
                  event.stopPropagation();
                  setOpenCoin(true);
                  setFocused(space);
                }}
              >
                코인 관리
              </Button>
              <Button
                type='button'
                size='icon'
                variant='outline'
                className='h-8 w-8'
                onClick={(event) => {
                  event.stopPropagation();
                  copyId(space.id);
                }}
              >
                <Copy className='h-4 w-4' />
              </Button>
              <div onClick={(event) => event.stopPropagation()}>
                <TableRowActions
                  items={[
                    {
                      label: '상세 보기',
                      onClick: () => setDetailTarget(space),
                    },
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
          </div>
        </CardHeader>
        <CardContent className='space-y-4 px-4 py-4'>
          <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
            <div className='rounded-xl border border-border/70 bg-white p-4'>
              <div className='mb-3 text-sm font-semibold text-foreground'>공간 기본 정보</div>
              <div className='space-y-3'>
                <div className='flex flex-col gap-3 rounded-lg border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
                  <div className='min-w-0 flex-1'>
                    <div className='text-xs text-muted-foreground'>공간 ID</div>
                    <div className='break-all font-mono text-sm'>{space.id}</div>
                  </div>
                  <Button type='button' variant='outline' size='icon' onClick={() => copyId(space.id)} className='h-8 w-8 shrink-0'>
                    <Copy className='h-4 w-4' />
                  </Button>
                </div>
                <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3'>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>공간 이름</div>
                    <div className='mt-1 break-words font-medium'>{space.spaceInfo?.name ?? '-'}</div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>타입</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>언어</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant='secondary'>{space.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>멤버</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant='info'>{space.spaceInfo?.members ?? space.profiles?.length ?? 0}</Badge>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>멤버 상태</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      {hasPremiumMember ? <Badge variant='success'>PREMIUM</Badge> : null}
                      {hasGoldClubMember ? <Badge variant='warning'>GOLD CLUB</Badge> : null}
                      {!hasPremiumMember && !hasGoldClubMember ? <span className='text-sm text-muted-foreground'>-</span> : null}
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>생성일</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant={createdMeta.variant}>{createdMeta.diffLabel}</Badge>
                      <span className='text-sm font-medium text-foreground'>{createdMeta.dateText}</span>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>카드 / 최근 발급</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant='default'>카드 {space.cardOrder ?? 0}</Badge>
                      <span className='text-sm font-medium text-foreground'>
                        {space.latestCardIssuedAt ? formatDate(space.latestCardIssuedAt, 'YY.MM.DD HH:mm') : '발급 기록 없음'}
                      </span>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>삭제예정일</div>
                    {dueRemovedMeta ? (
                      <div className='mt-1 flex flex-wrap gap-2'>
                        <Badge variant={dueRemovedMeta.variant}>{dueRemovedMeta.gapLabel}</Badge>
                        <span className='text-sm font-medium text-foreground'>{dueRemovedMeta.dateText}</span>
                      </div>
                    ) : (
                      <div className='mt-1 text-sm text-muted-foreground'>예정 없음</div>
                    )}
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2 sm:col-span-2 xl:col-span-3'>
                    <div className='text-xs text-muted-foreground'>다음 카드 생성 기준</div>
                    <div className='mt-1 break-all font-medium'>{space.cardGenDate ?? '-'}</div>
                  </div>
                </div>
              </div>
            </div>

            <div className='rounded-xl border border-border/70 bg-white p-4'>
              <div className='mb-3 text-sm font-semibold text-foreground'>운영 지표</div>
              <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3'>
                <div className='min-w-0 rounded-lg border px-3 py-2'>
                  <div className='text-xs text-muted-foreground'>하트 / 스타</div>
                  <div className='mt-1 flex flex-wrap gap-2'>
                    <Badge variant='destructive'>하트 {coin}</Badge>
                    <Badge variant='warning'>스타 {coinPaid}</Badge>
                  </div>
                </div>
                <div className='min-w-0 rounded-lg border px-3 py-2'>
                  <div className='text-xs text-muted-foreground'>펫 EXP</div>
                  <div className='mt-1 flex flex-wrap gap-2'>
                    <Badge variant='info'>EXP {space.pet?.exp?.toFixed(1) ?? '0.0'}</Badge>
                    <Badge variant='secondary'>Lv.{space.pet?.level ?? 0}</Badge>
                  </div>
                </div>
                <div className='min-w-0 rounded-lg border px-3 py-2'>
                  <div className='text-xs text-muted-foreground'>답변</div>
                  <div className='mt-1 flex flex-wrap gap-2'>
                    <Badge variant='info'>{space.spaceInfo?.replies ?? 0}</Badge>
                  </div>
                </div>
                <div className='min-w-0 rounded-lg border px-3 py-2'>
                  <div className='text-xs text-muted-foreground'>상태</div>
                  <div className='mt-1 flex flex-wrap gap-2'>
                    {space.isActive ? <Badge variant='success'>ACTIVE</Badge> : <Badge variant='muted'>INACTIVE</Badge>}
                  </div>
                </div>
                <div className='min-w-0 rounded-lg border px-3 py-2 xl:col-span-2'>
                  <div className='text-xs text-muted-foreground'>방 / 인테리어</div>
                  <div className='mt-1 flex flex-wrap gap-2'>
                    <Badge variant='default'>방 {space.rooms?.length ?? 0}</Badge>
                    <Badge variant='warning'>인테리어 {space.InteriorItem?.length ?? 0}</Badge>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className='rounded-xl border border-border/70 bg-white p-4'>
            <div className='mb-3 flex items-center justify-between gap-3'>
              <div className='text-sm font-semibold text-foreground'>멤버</div>
              <Badge variant='outline'>{space.profiles.length}명</Badge>
            </div>
            <div className='space-y-2'>
              {space.profiles.length ? (
                space.profiles.map((profile, index) => {
                  const isOwner = profile.userId === ownerId;

                  return (
                    <div key={profile.id}>
                      <div className='flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-start sm:justify-between'>
                        <div className='min-w-0 flex-1 space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='truncate font-medium'>{profile.nickname}</span>
                            {isOwner ? <Badge variant='default'>OWNER</Badge> : null}
                            {profile.isPremium ? <Badge variant='success'>PREMIUM</Badge> : null}
                            {profile.isGoldClub ? <Badge variant='warning'>GOLD CLUB</Badge> : null}
                          </div>
                          <div className='break-all text-sm text-muted-foreground'>{profile.user?.username ?? '-'}</div>
                        </div>
                        <div onClick={(event) => event.stopPropagation()}>
                          <TableRowActions
                            items={[
                              {
                                label: 'username 복사',
                                onClick: () => copyId(profile.user?.username ?? profile.id),
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
                      </div>
                      {index < space.profiles.length - 1 ? <Separator className='my-2' /> : null}
                    </div>
                  );
                })
              ) : (
                <div className='text-sm text-muted-foreground'>멤버 정보가 없습니다.</div>
              )}
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
                onRow={(space) => ({
                  onClick: () => setDetailTarget(space),
                  className: 'cursor-pointer',
                })}
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

      <SpaceDetailSheet open={!!detailTarget} space={detailTarget} onClose={() => setDetailTarget(null)} copyId={copyId} />

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
