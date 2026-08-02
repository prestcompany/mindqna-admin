import { LibraryData, LibrarySubType, LibraryType } from '@/client/square-library';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import { Button } from '@/components/ui/button';
import { Sheet } from '@/components/ui/sheet';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import useLibrary from '@/hooks/useLibrary';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import { toast } from 'sonner';
import { deleteSquareLibrary } from '@/client/square-library';
import { createColumns } from './columns';
import { subCategoryOptions } from './constants';
import LibraryForm from './LibraryForm';
import { useLibraryFilter } from './useLibraryFilter';

type Props = {
  type: LibraryType;
};

function LibraryList({ type }: Props) {
  const [currentPage, setCurrentPage] = useState(1);
  const { filter, updateFilter } = useLibraryFilter();
  const { items, isLoading, refetch, totalPage } = useLibrary({ category: type, page: currentPage, ...filter });
  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<LibraryData | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<LibraryData | undefined>(undefined);

  const handleEdit = (value: LibraryData) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: LibraryData) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget?.id) return;
    try {
      await deleteSquareLibrary(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns = createColumns({
    currentPage,
    onEdit: handleEdit,
    onRemove: handleRemove,
  });
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
        <Select
          value={filter.subCategory ?? ''}
          onValueChange={(v: string) => {
            updateFilter({ subCategory: (v || undefined) as LibrarySubType | undefined });
          }}
        >
          <SelectTrigger className={`w-[180px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='타입' />
          </SelectTrigger>
          <SelectContent>
            {subCategoryOptions[type]?.map((opt) => (
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
        <AdminSideSheetContent title='라이브러리 추가' size='md'>
          <LibraryForm reload={refetch} close={() => setOpenCreate(false)} type={type} />
        </AdminSideSheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={setOpenEdit}>
        <AdminSideSheetContent title='라이브러리 수정' size='md'>
          <LibraryForm init={focused} reload={refetch} close={() => setOpenEdit(false)} type={type} />
        </AdminSideSheetContent>
      </Sheet>
    </>
  );
}

export default LibraryList;
