import { getSpace, removeProfile, removeSpace, searchSpaces, type SearchSpacesParams } from '@/client/space';
import { Space, SpaceDetail, SpaceType } from '@/client/types';
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
import { Sheet } from '@/components/ui/sheet';
import { useQueries, useQuery } from '@tanstack/react-query';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useState } from 'react';
import { ChevronLeft, ChevronRight, Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import CoinForm from './CoinForm';
import SpaceDetailContent from './components/SpaceDetailContent';
import SpaceDetailSheet from './components/SpaceDetailSheet';

function SpaceSearch() {
  const [searchParams, setSearchParams] = useState({
    keyword: '',
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
    const keyword = searchParams.keyword.trim();

    if (!keyword) {
      return null;
    }

    return {
      page,
      keyword,
      type: searchParams.type,
      locale: searchParams.locale,
      startDate: searchParams.dateRange.start?.format('YYYY-MM-DD'),
      endDate: searchParams.dateRange.end?.format('YYYY-MM-DD'),
    };
  };

  const { data, refetch, isFetching, isFetched } = useQuery({
    queryKey: ['space-search', submittedSearchParams],
    queryFn: async () => {
      if (!submittedSearchParams) {
        throw new Error('검색어를 입력해주세요.');
      }

      return searchSpaces(submittedSearchParams);
    },
    enabled: !!submittedSearchParams,
  });
  const hasSubmittedSearch = !!submittedSearchParams;
  const isResultLoading = hasSubmittedSearch && isFetching;
  const isInitialResultLoading = isResultLoading && !data;
  const items = data?.items ?? [];
  const currentPage = submittedSearchParams?.page ?? 1;
  const totalCount = data?.totalCount ?? 0;
  const detailQueries = useQueries({
    queries: items.map((space) => ({
      queryKey: ['space-search-detail', space.id],
      queryFn: () => getSpace(space.id),
      enabled: !!submittedSearchParams && viewMode === 'card',
      staleTime: 30_000,
    })),
  });

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    toast.success(`${id} 복사`);
  };

  const openCoinForSpace = (space: Space) => {
    setFocused(space);
    setOpenCoin(true);
  };

  const handleSearch = () => {
    const params = getSearchParams(1);

    if (!params) {
      toast.warning('검색어를 입력해주세요.');
      return;
    }

    setViewMode('card');
    setSubmittedSearchParams(params);
  };

  const handleResetFilters = () => {
    setSearchParams({
      keyword: '',
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
                onClick: () => openCoinForSpace(row.original),
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

  const renderCardItem = (space: Space, index: number) => {
    const detailQuery = detailQueries[index];
    const detail = detailQuery?.data;
    const isDetailLoading = detailQuery?.isLoading && !detail;
    const isDetailError = detailQuery?.isError;

    return (
      <div key={space.id} className='rounded-2xl border border-border/70 bg-card p-4 shadow-sm'>
        {isDetailLoading ? (
          <div className='flex min-h-[320px] items-center justify-center'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : isDetailError || !detail ? (
          <Card className='shadow-none'>
            <CardHeader>
              <CardTitle className='text-base'>상세 정보를 불러오지 못했습니다.</CardTitle>
            </CardHeader>
            <CardContent className='flex items-center justify-between gap-3'>
              <div className='text-sm text-muted-foreground'>공간 `{space.id}` 의 상세 조회에 실패했습니다.</div>
              <div className='flex items-center gap-2'>
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    openCoinForSpace(space);
                  }}
                >
                  코인 관리
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => setDetailTarget(space)}>
                  별도 상세 열기
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className='space-y-4'>
            <div className='flex justify-end'>
              <Button type='button' variant='outline' size='sm' onClick={() => openCoinForSpace(space)}>
                코인 관리
              </Button>
            </div>
            <SpaceDetailContent detail={detail as SpaceDetail} copyId={copyId} />
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      <div className='space-y-4'>
        <FormSection
          title='공간 검색 및 필터'
          description='공간 ID, 공간 이름, 사용자명, 프로필 닉네임을 하나의 검색어로 조회하고 조건을 추가로 필터링합니다.'
        >
          <FormGroup title='통합 검색'>
            <Input
              placeholder='공간 ID / 공간 이름 / 사용자명 / 프로필 닉네임'
              value={searchParams.keyword}
              onChange={(e) => setSearchParams((prev) => ({ ...prev, keyword: e.target.value }))}
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
            <Button type='button' variant='outline' onClick={handleResetFilters} disabled={isResultLoading}>
              초기화
            </Button>
            <Button type='button' onClick={handleSearch} disabled={isResultLoading}>
              {isResultLoading ? <Loader2 className='h-4 w-4 animate-spin' /> : <Search className='w-4 h-4' />}
              {isResultLoading ? '검색 중' : '검색'}
            </Button>
          </div>
        </FormSection>

        {hasSubmittedSearch && (
          <div className='flex justify-between items-center'>
            <div className='flex items-center gap-2'>
              {isResultLoading ? <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' /> : null}
              <span>{data ? `총 ${totalCount.toLocaleString()}개 검색됨` : '검색 결과를 불러오는 중입니다.'}</span>
            </div>
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

        {isInitialResultLoading && (
          <Card className='bg-card'>
            <CardContent className='flex min-h-[220px] flex-col items-center justify-center gap-3 py-10 text-center'>
              <Loader2 className='h-6 w-6 animate-spin text-muted-foreground' />
              <div className='space-y-1'>
                <p className='font-medium text-foreground'>검색 중입니다.</p>
                <p className='text-sm text-muted-foreground'>공간 목록을 불러올 때까지 잠시만 기다려주세요.</p>
              </div>
            </CardContent>
          </Card>
        )}

        {data && (
          <>
            {viewMode === 'table' ? (
              <DataTable
                columns={columns}
                data={items}
                countLabel={totalCount}
                loading={isResultLoading}
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
                {items.map((space, index) => renderCardItem(space, index))}
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
                        disabled={currentPage <= 1 || isResultLoading}
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
                        disabled={currentPage >= data.pageInfo.totalPage || isResultLoading}
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

        {isFetched && !isResultLoading && totalCount === 0 && (
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
