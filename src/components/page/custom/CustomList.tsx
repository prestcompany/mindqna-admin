import { removeCustomTemplate } from '@/client/custom';
import { ImgItem, PetCustomTemplate } from '@/client/types';
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
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import useCustoms from '@/hooks/useCustoms';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import CustomFormModal from './CustomFormModal';
import LottieCDNPlayer from './LottieCDNPlayer';
import { PetCustomTypeOptions, petTypeOptions } from './constant';

function CustomList() {
  const [currentPage, setCurrentPage] = useState(1);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<PetCustomTemplate | undefined>(undefined);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<PetCustomTemplate | undefined>(undefined);

  const { templates, totalPage, isLoading, refetch } = useCustoms({ page: currentPage });

  const handleEdit = (value: PetCustomTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: PetCustomTemplate) => {
    setConfirmTarget(value);
    setConfirmOpen(true);
  };

  const handleConfirmRemove = async () => {
    if (!confirmTarget) return;
    try {
      await removeCustomTemplate(confirmTarget.id);
      await refetch();
    } catch (err) {
      toast.error(`${err}`);
    }
    setConfirmOpen(false);
    setConfirmTarget(undefined);
  };

  const columns: ColumnDef<PetCustomTemplate>[] = [
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'name',
      header: '이름',
    },
    {
      accessorKey: 'order',
      header: '순서',
    },
    {
      accessorKey: 'fileKey',
      header: '키 값',
      cell: ({ row }) => {
        return <p className='font-bold'>{row.original.fileKey}</p>;
      },
    },
    {
      accessorKey: 'type',
      header: '타입',
      cell: ({ row }) => {
        const label = PetCustomTypeOptions.find((item) => item.value === row.original.type)?.label;
        return <Badge variant='info'>{label}</Badge>;
      },
    },
    {
      accessorKey: 'petType',
      header: '펫 타입',
      cell: ({ row }) => {
        const label = petTypeOptions.find((item) => item.value === row.original.petType)?.label;
        return <Badge variant='info'>{label}</Badge>;
      },
    },
    {
      accessorKey: 'petLevel',
      header: '펫 레벨',
      cell: ({ row }) => {
        return <Badge variant='secondary'>{row.original.petLevel}</Badge>;
      },
    },
    {
      accessorKey: 'isPaid',
      header: '스타/하트',
      cell: ({ row }) => {
        const value = row.original.isPaid;
        return <Badge variant={value ? 'warning' : 'destructive'}>{value ? '스타' : '하트'}</Badge>;
      },
    },
    {
      accessorKey: 'price',
      header: '가격',
      cell: ({ row }) => {
        return <Badge variant='success'>{row.original.price}</Badge>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'success' : 'destructive'}>{value ? '활성' : '비활성'}</Badge>;
      },
    },
    {
      accessorKey: 'img',
      header: '썸네일',
      cell: ({ row }) => {
        const value = row.original.img as ImgItem;
        return <img width={60} height={60} src={value?.uri ?? ''} alt='img' className='object-contain' />;
      },
    },
    {
      accessorKey: 'fileUrl',
      header: '로티 파일',
      cell: ({ row }) => {
        return <LottieCDNPlayer fileUrl={row.original.fileUrl} width={150} height={150} />;
      },
    },
    {
      id: 'actions',
      header: 'Action',
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
            <AlertDialogTitle>삭제 {confirmTarget?.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DefaultTableBtn className='justify-between'>
        <div className='flex items-center gap-2 py-4'></div>
        <div className='flex items-center gap-4'>
          <Button
            onClick={() => {
              setFocused(undefined);
              setOpenCreate(true);
            }}
            size='lg'
          >
            펫 커스텀 추가
          </Button>
        </div>
      </DefaultTableBtn>
      <DataTable
        columns={columns}
        data={templates ?? []}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
      />

      {isOpenCreate && <CustomFormModal isOpen={isOpenCreate} reload={refetch} close={() => setOpenCreate(false)} />}
      {isOpenEdit && (
        <CustomFormModal isOpen={isOpenEdit} reload={refetch} close={() => setOpenEdit(false)} init={focused} />
      )}
    </>
  );
}

export default CustomList;
