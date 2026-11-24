import { Banner, removeBanner } from '@/client/banner';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import ClickableImagePreview from '@/components/shared/ui/clickable-image-preview';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet } from '@/components/ui/sheet';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import useBanners from '@/hooks/useBanners';
import { ColumnDef } from '@tanstack/react-table';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { useResetOnChange } from '@/hooks/useResetOnChange';
import { toast } from 'sonner';
import BannerForm from './BannerForm';
import BannerStatsSheet from './BannerStatsSheet';
import { BANNER_STATUS_LABEL, BannerStatus, bannerStatus, formatKstDateTime } from './services/banner-period';
import { useBannerLocations } from './useBannerLocations';

const STATUS_BADGE: Record<BannerStatus, 'dotNeutral' | 'dotInfo' | 'dotSuccess' | 'dotWarning'> = {
  inactive: 'dotNeutral',
  scheduled: 'dotInfo',
  live: 'dotSuccess',
  ended: 'dotWarning',
};

function BannerList() {
  const [currentPage, setCurrentPage] = useState(1);
  const locationOptions = useBannerLocations();
  const [filter, setFilter] = useState<{ location?: string[]; locale?: string[] }>({});
  const [searchInput, setSearchInput] = useState('');
  const debouncedSearch = useDebouncedValue(searchInput, 500);
  const trimmedSearch = debouncedSearch.trim();
  const effectiveSearch = trimmedSearch.length >= 2 ? trimmedSearch : undefined;
  const { items, isLoading, refetch, totalPage } = useBanners({
    page: currentPage,
    ...filter,
    search: effectiveSearch,
  });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Banner | undefined>(undefined);
  const [statsTarget, setStatsTarget] = useState<Banner | undefined>(undefined);
  const [isOpenStats, setOpenStats] = useState(false);
  const now = new Date();

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Banner | undefined>(undefined);

  const handleEdit = (value: Banner) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleStats = (value: Banner) => {
    setStatsTarget(value);
    setOpenStats(true);
  };

  const handleRemove = (value: Banner) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeBanner(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  useResetOnChange([filter.locale, filter.location, effectiveSearch], () => setCurrentPage(1));

  const columns: ColumnDef<Banner>[] = [
    {
      accessorKey: 'id',
      header: '번호',
      size: 72,
    },
    {
      accessorKey: 'imgUri',
      header: '이미지',
      size: 252,
      cell: ({ row }) => {
        const value = row.original.imgUri;
        return (
          <ClickableImagePreview
            src={value}
            alt={`${row.original.name} 배너 이미지`}
            triggerClassName='h-[120px] w-[220px]'
            imageClassName='h-full w-full object-contain'
          />
        );
      },
    },
    {
      accessorKey: 'name',
      header: '이름',
      size: 160,
      meta: {
        truncateMaxWidth: 140,
      },
    },
    {
      accessorKey: 'locale',
      header: '다국어',
      size: 88,
    },
    {
      accessorKey: 'orderIndex',
      header: '순서',
      size: 72,
      cell: ({ row }) => {
        const value = row.original.orderIndex;
        return <div className='text-center font-medium tabular-nums'>{value ?? '-'}</div>;
      },
    },
    {
      accessorKey: 'location',
      header: '위치',
      size: 120,
      cell: ({ row }) => {
        const value = row.original.location;
        const label = locationOptions.find((item) => item.value === value)?.label ?? value;
        return <Badge variant='softInfo'>{label}</Badge>;
      },
    },
    {
      accessorKey: 'viewCount',
      header: '조회수',
      size: 88,
    },
    {
      accessorKey: 'clickCount',
      header: '클릭수',
      size: 88,
    },
    {
      accessorKey: 'link',
      header: '링크',
      size: 260,
      meta: {
        truncateMaxWidth: 240,
      },
    },
    {
      id: 'period',
      header: '게시 기간',
      size: 168,
      cell: ({ row }) => {
        const { startAt, endAt } = row.original;
        if (!startAt && !endAt) return <span className='text-muted-foreground'>제한 없음</span>;
        return (
          <div className='flex flex-col tabular-nums'>
            <span>{startAt ? formatKstDateTime(startAt) : '제한 없음'} ~</span>
            <span>{endAt ? formatKstDateTime(endAt) : '제한 없음'}</span>
          </div>
        );
      },
    },
    {
      id: 'status',
      header: '상태',
      size: 96,
      cell: ({ row }) => {
        const status = bannerStatus(row.original, now);
        return <Badge variant={STATUS_BADGE[status]}>{BANNER_STATUS_LABEL[status]}</Badge>;
      },
    },
    {
      id: 'actions',
      header: '관리',
      size: 84,
      cell: ({ row }) => (
        <TableRowActions
          items={[
            {
              label: '수정',
              onClick: () => handleEdit(row.original),
            },
            {
              label: '통계',
              onClick: () => handleStats(row.original),
            },
            {
              label: '삭제',
              onClick: () => handleRemove(row.original),
              destructive: true,
            },
          ]}
        />
      ),
    },
  ];
  return (
    <>
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 ({confirmTarget?.name})</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <FilterBar>
        <div className='relative min-w-[260px]'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder='배너명 / 링크 / 문구 검색 (2자 이상)'
            className={`pl-9 ${FILTER_CONTROL_CLASS}`}
          />
        </div>
        <Select
          value={(filter.locale ?? [])?.[0] ?? '__all__'}
          onValueChange={(v: string) => {
            setFilter((prev) => ({ ...prev, locale: v === '__all__' ? undefined : [v] }));
          }}
        >
          <SelectTrigger className={`w-[120px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='언어' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>전체 언어</SelectItem>
            {LOCALE_OPTIONS.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={(filter.location ?? [])?.[0] ?? '__all__'}
          onValueChange={(v: string) => {
            setFilter((prev) => ({ ...prev, location: v === '__all__' ? undefined : [v] }));
          }}
        >
          <SelectTrigger className={`w-[180px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='위치' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>전체 위치</SelectItem>
            {locationOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className='flex-1' />
        <Button
          onClick={() => {
            setFocused(undefined);
            setOpenCreate(true);
          }}
          className={FILTER_CONTROL_CLASS}
        >
          추가
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={items}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />
      <Sheet open={isOpenCreate} onOpenChange={setOpenCreate}>
        <AdminSideSheetContent title='배너 추가' size='md'>
          <BannerForm reload={refetch} close={() => setOpenCreate(false)} />
        </AdminSideSheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='배너 수정' size='md'>
          <BannerForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </AdminSideSheetContent>
      </Sheet>
      <Sheet open={isOpenStats} onOpenChange={setOpenStats}>
        <AdminSideSheetContent
          title={statsTarget ? `배너 통계 (${statsTarget.name})` : '배너 통계'}
          description='날짜는 한국 시간 기준이에요.'
          size='lg'
        >
          {statsTarget ? <BannerStatsSheet key={statsTarget.id} banner={statsTarget} /> : null}
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default BannerList;
