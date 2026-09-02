import { removeLocale } from '@/client/locale';
import { LocaleWord } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LOCALE_OPTIONS } from '@/components/shared/form/constants/locale-options';
import { Sheet } from '@/components/ui/sheet';
import useLocales from '@/hooks/useLocales';
import { ColumnDef } from '@tanstack/react-table';
import { Search, RotateCcw } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { useResetOnChange } from '@/hooks/useResetOnChange';
import { toast } from 'sonner';
import LocaleForm from './LocaleForm';

function LocaleList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const { locales, totalPage, isLoading, refetch } = useLocales({ page: currentPage, locale: filter.locale, key: searchKey, value: searchValue });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<LocaleWord | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<LocaleWord | undefined>(undefined);

  const handleEdit = (value: LocaleWord) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleSearch = () => {
    setSearchKey(key);
    setSearchValue(value);
    setCurrentPage(1);
  };

  const handleResetFilters = () => {
    setFilter({});
    setKey('');
    setValue('');
    setSearchKey('');
    setSearchValue('');
    setCurrentPage(1);
  };

  useResetOnChange([filter.locale], () => setCurrentPage(1));

  const handleRemove = (value: LocaleWord) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeLocale(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns: ColumnDef<LocaleWord>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'key',
      header: '다국어 키',
    },
    {
      accessorKey: 'value',
      header: '텍스트',
    },
    {
      accessorKey: 'locale',
      header: '언어',
    },
    {
      id: 'actions',
      header: '관리',
      cell: ({ row }) => (
        <TableRowActions
          items={[
            {
              label: '수정',
              onClick: () => handleEdit(row.original),
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
            <AlertDialogTitle>삭제 ({confirmTarget?.key} - {confirmTarget?.value})</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <FilterBar>
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
        <div className='relative min-w-[220px]'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='다국어 키 검색'
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={`pl-9 ${FILTER_CONTROL_CLASS}`}
          />
        </div>
        <div className='relative min-w-[240px]'>
          <Search className='absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            placeholder='텍스트 검색'
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            className={`pl-9 ${FILTER_CONTROL_CLASS}`}
          />
        </div>
        <Button
          variant='outline'
          onClick={handleResetFilters}
          className={`${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}
        >
          <RotateCcw className='h-3.5 w-3.5' />
          초기화
        </Button>
        <Button variant='outline' onClick={handleSearch} className={`${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}>
          <Search className='h-3.5 w-3.5' />
          검색
        </Button>
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
        data={locales}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />
      <Sheet open={isOpenCreate} onOpenChange={setOpenCreate}>
        <AdminSideSheetContent title='다국어 추가' size='md'>
          <LocaleForm reload={refetch} close={() => setOpenCreate(false)} />
        </AdminSideSheetContent>
      </Sheet>

      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='다국어 수정' size='md'>
          <LocaleForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default LocaleList;
