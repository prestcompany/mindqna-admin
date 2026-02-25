import { removeLocale } from '@/client/locale';
import { LocaleWord } from '@/client/types';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
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
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import useLocales from '@/hooks/useLocales';
import { ColumnDef } from '@tanstack/react-table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
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
    refetch();
  };

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
      header: '액션',
      cell: ({ row }) => (
        <div className='flex gap-4'>
          <Button variant='outline' onClick={() => handleEdit(row.original)}>수정</Button>
          <Button variant='outline' onClick={() => handleRemove(row.original)}>삭제</Button>
        </div>
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
      <DefaultTableBtn className='justify-between'>
        <div className='flex items-center gap-2 py-6 '>
          <Select
            value={(filter.locale ?? [])?.[0] ?? ''}
            onValueChange={(v: string) => {
              setFilter((prev) => ({ ...prev, locale: v ? [v] : undefined }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='언어' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='ko'>ko</SelectItem>
              <SelectItem value='en'>en</SelectItem>
              <SelectItem value='ja'>ja</SelectItem>
              <SelectItem value='zh'>zh</SelectItem>
              <SelectItem value='zhTw'>zhTw</SelectItem>
              <SelectItem value='es'>es</SelectItem>
              <SelectItem value='id'>id</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder='키 값'
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
            }}
          />
          <Input
            placeholder='텍스트'
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
          <Button variant='outline' onClick={handleSearch}>검색</Button>
        </div>
        <Button
          onClick={() => {
            setFocused(undefined);
            setOpenCreate(true);
          }}
          size='lg'
        >
          추가
        </Button>
      </DefaultTableBtn>

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
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>다국어 추가</SheetTitle>
          </SheetHeader>
          <LocaleForm reload={refetch} close={() => setOpenCreate(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <SheetContent side='right' className='w-[600px] sm:max-w-[600px] overflow-y-auto'>
          <SheetHeader>
            <SheetTitle>다국어 수정</SheetTitle>
          </SheetHeader>
          <LocaleForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </SheetContent>
      </Sheet>
    </>
  );
}

export default LocaleList;
