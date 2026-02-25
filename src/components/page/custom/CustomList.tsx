import { removeCustomTemplate } from '@/client/custom';
import { ImgItem, PetCustomTemplate } from '@/client/types';
import ClickableImagePreview from '@/components/shared/ui/clickable-image-preview';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
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
import useCustoms from '@/hooks/useCustoms';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { toast } from 'sonner';
import CustomFormModal from './CustomFormModal';
import LottieCDNPlayer from './LottieCDNPlayer';
import { PetCustomTypeOptions, petTypeOptions } from './constants';

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
      size: 72,
    },
    {
      accessorKey: 'img',
      header: '썸네일',
      size: 156,
      cell: ({ row }) => {
        const value = row.original.img as ImgItem;
        return (
          <ClickableImagePreview
            src={value?.uri}
            alt={`${row.original.name} 커스텀 이미지`}
            triggerClassName='h-[120px] w-[120px]'
            imageClassName='h-full w-full object-contain'
          />
        );
      },
    },
    {
      accessorKey: 'name',
      header: '이름',
      size: 180,
      meta: {
        truncateMaxWidth: 160,
      },
    },
    {
      accessorKey: 'order',
      header: '순서',
      size: 72,
    },
    {
      accessorKey: 'fileKey',
      header: '키 값',
      size: 260,
      meta: {
        truncateMaxWidth: 240,
      },
    },
    {
      accessorKey: 'type',
      header: '타입',
      size: 96,
      cell: ({ row }) => {
        const label = PetCustomTypeOptions.find((item) => item.value === row.original.type)?.label;
        return <Badge variant='info'>{label}</Badge>;
      },
    },
    {
      accessorKey: 'petType',
      header: '펫 타입',
      size: 96,
      cell: ({ row }) => {
        const label = petTypeOptions.find((item) => item.value === row.original.petType)?.label;
        return <Badge variant='info'>{label}</Badge>;
      },
    },
    {
      accessorKey: 'petLevel',
      header: '펫 레벨',
      size: 88,
      cell: ({ row }) => {
        return <Badge variant='secondary'>{row.original.petLevel}</Badge>;
      },
    },
    {
      accessorKey: 'isPaid',
      header: '스타/하트',
      size: 96,
      cell: ({ row }) => {
        const value = row.original.isPaid;
        return <Badge variant={value ? 'warning' : 'destructive'}>{value ? '스타' : '하트'}</Badge>;
      },
    },
    {
      accessorKey: 'price',
      header: '가격',
      size: 96,
      cell: ({ row }) => {
        return <Badge variant='success'>{row.original.price}</Badge>;
      },
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      size: 92,
      cell: ({ row }) => {
        const value = row.original.isActive;
        return <Badge variant={value ? 'success' : 'destructive'}>{value ? '활성' : '비활성'}</Badge>;
      },
    },
    {
      accessorKey: 'fileUrl',
      header: '로티 파일',
      size: 170,
      meta: {
        useTruncateTooltip: false,
      },
      cell: ({ row }) => {
        return (
          <div className='flex h-[120px] w-[120px] items-center justify-center'>
            <LottieCDNPlayer fileUrl={row.original.fileUrl} width={120} height={120} />
          </div>
        );
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
            <AlertDialogTitle>삭제 {confirmTarget?.name}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <DefaultTableBtn className='justify-end'>
        <Button
          onClick={() => {
            setFocused(undefined);
            setOpenCreate(true);
          }}
          size='lg'
        >
          펫 커스텀 추가
        </Button>
      </DefaultTableBtn>
      <DataTable
        columns={columns}
        data={templates ?? []}
        countLabel={templates?.length ?? 0}
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
