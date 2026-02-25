import { publishCardTemplates, removeCardTemplate, unpublishedCardTemplates } from '@/client/card';
import { CardTemplate, CardTemplateType, GetCardTemplatesResult, SpaceType } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import useCardTemplates from '@/hooks/useCardTemplates';
import { useQueryClient } from '@tanstack/react-query';
import DataTable from '@/components/shared/ui/data-table';
import { Checkbox } from '@/components/ui/checkbox';
import { ColumnDef } from '@tanstack/react-table';
import { produce } from 'immer';
import { useState } from 'react';
import { toast } from 'sonner';
import CardForm from './CardForm';
import { CardUploadModal } from './CardUploadModal';

function CardList() {
  const queryClient = useQueryClient();

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<CardTemplate | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [filter, setFilter] = useState<{ type?: CardTemplateType[]; spaceType?: SpaceType[]; locale?: string[] }>({});

  const [confirmDelete, setConfirmDelete] = useState<CardTemplate | undefined>(undefined);
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  const { templates, totalPage, isLoading, refetch } = useCardTemplates({ page: currentPage, ...filter });

  const handleEdit = (value: CardTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: CardTemplate) => {
    setConfirmDelete(value);
  };

  const handleConfirmRemove = async () => {
    if (!confirmDelete) return;
    await removeCardTemplate(confirmDelete.id);
    await refetch();
    setConfirmDelete(undefined);
  };

  const handlePressPublish = async () => {
    try {
      setLoading(true);
      await publishCardTemplates(selectedRowKeys as number[]);
      queryClient.setQueryData<GetCardTemplatesResult>(['cardTemplates'], (prev) => {
        if (!prev) return;
        return produce(prev, (draft) => {
          draft.templates.forEach((template) => {
            if (selectedRowKeys.includes(template.id)) {
              template.isPublished = true;
            }
          });
        });
      });
      toast.success('성공');
    } catch (err) {
      console.error(err);
      toast.error(`실패 : ${err}`);
    }
    setLoading(false);
  };

  const handlePressUnpublished = async () => {
    try {
      setLoading(true);
      await unpublishedCardTemplates(selectedRowKeys as number[]);
      toast.success('성공');
      queryClient.setQueryData<GetCardTemplatesResult>(['cardTemplates'], (prev) => {
        if (!prev) return;
        return produce(prev, (draft) => {
          draft.templates.forEach((template) => {
            if (selectedRowKeys.includes(template.id)) {
              template.isPublished = false;
            }
          });
        });
      });
    } catch (err) {
      console.error(err);
      toast.error(`실패 : ${err}`);
    }
    setLoading(false);
  };

  const handleBulkUpload = () => {
    setIsUploadOpen(true);
  };

  const columns: ColumnDef<CardTemplate>[] = [
    {
      id: 'select',
      size: 40,
      header: () => (
        <Checkbox
          checked={templates?.length > 0 && selectedRowKeys.length === templates?.length}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedRowKeys(templates?.map((t) => t.id) || []);
            } else {
              setSelectedRowKeys([]);
            }
          }}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={selectedRowKeys.includes(row.original.id)}
          onCheckedChange={(checked) => {
            if (checked) {
              setSelectedRowKeys((prev) => [...prev, row.original.id]);
            } else {
              setSelectedRowKeys((prev) => prev.filter((k) => k !== row.original.id));
            }
          }}
        />
      ),
    },
    {
      accessorKey: 'id',
      header: '번호',
    },
    {
      accessorKey: 'name',
      header: '이름',
      size: 700,
    },
    {
      accessorKey: 'order',
      header: '순서',
    },
    {
      accessorKey: 'locale',
      header: '언어',
    },
    {
      accessorKey: 'type',
      header: '질문타입',
    },
    {
      accessorKey: 'spaceType',
      header: '공간타입',
    },
    {
      accessorKey: 'isPublished',
      header: '상태',
      cell: ({ row }) => {
        const value = row.original.isPublished;
        return <Badge variant={value ? 'success' : 'muted'}>{value ? '활성' : '비활성'}</Badge>;
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

  const hasSelected = selectedRowKeys.length > 0;

  return (
    <div>
      <DefaultTableBtn className='justify-between'>
        <div className='flex items-center gap-2 py-4'>
          <ShadSelect
            value={(filter.locale ?? [])?.[0] ?? '__all__'}
            onValueChange={(v: string) => {
              setFilter((prev) => ({ ...prev, locale: v === '__all__' ? undefined : [v] }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='언어' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              <SelectItem value='ko'>ko</SelectItem>
              <SelectItem value='en'>en</SelectItem>
              <SelectItem value='ja'>ja</SelectItem>
              <SelectItem value='zh'>zh</SelectItem>
              <SelectItem value='zhTw'>zhTw</SelectItem>
              <SelectItem value='es'>es</SelectItem>
              <SelectItem value='id'>id</SelectItem>
            </SelectContent>
          </ShadSelect>
          <ShadSelect
            value={(filter.type ?? [])?.[0] ?? '__all__'}
            onValueChange={(v: string) => {
              setFilter((prev) => ({ ...prev, type: v === '__all__' ? undefined : [v as CardTemplateType] }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='질문타입' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              <SelectItem value='basic'>basic</SelectItem>
              <SelectItem value='bonus'>bonus</SelectItem>
            </SelectContent>
          </ShadSelect>
          <ShadSelect
            value={(filter.spaceType ?? [])?.[0] ?? '__all__'}
            onValueChange={(v: string) => {
              setFilter((prev) => ({ ...prev, spaceType: v === '__all__' ? undefined : [v as SpaceType] }));
            }}
          >
            <SelectTrigger className='w-[120px]'>
              <SelectValue placeholder='공간타입' />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value='__all__'>전체</SelectItem>
              <SelectItem value='alone'>혼자</SelectItem>
              <SelectItem value='couple'>커플</SelectItem>
              <SelectItem value='family'>가족</SelectItem>
              <SelectItem value='friends'>친구</SelectItem>
            </SelectContent>
          </ShadSelect>
        </div>
        <div className='flex items-center gap-4'>
          <Button variant='outline' size='lg' onClick={handleBulkUpload}>
            카드 템플릿 엑셀 업로드
          </Button>
          <Button
            onClick={() => {
              setFocused(undefined);
              setOpenCreate(true);
            }}
            size='lg'
          >
            카드 템플릿 추가
          </Button>
        </div>
      </DefaultTableBtn>

      <DataTable
        columns={columns}
        data={templates || []}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          pageSize: 10,
          onChange: (page) => setCurrentPage(page),
        }}
        loading={loading || isLoading}
      />
      <div className='flex gap-3'>
        <Button onClick={handlePressPublish} disabled={!hasSelected || loading}>
          활성화
        </Button>
        <Button variant='outline' onClick={handlePressUnpublished} disabled={!hasSelected || loading}>
          비활성화
        </Button>
      </div>
      <Sheet open={isOpenCreate} onOpenChange={(open) => !open && setOpenCreate(false)}>
        <SheetContent side='right' className='w-[600px] sm:max-w-none overflow-y-auto'>
          <SheetHeader><SheetTitle>카드 템플릿 추가</SheetTitle></SheetHeader>
          <CardForm reload={refetch} close={() => setOpenCreate(false)} />
        </SheetContent>
      </Sheet>

      <Sheet open={isOpenEdit} onOpenChange={(open) => !open && setOpenEdit(false)}>
        <SheetContent side='right' className='w-[600px] sm:max-w-none overflow-y-auto'>
          <SheetHeader><SheetTitle>카드 템플릿 수정</SheetTitle></SheetHeader>
          <CardForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
        </SheetContent>
      </Sheet>

      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(undefined)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>삭제 팝업</AlertDialogTitle>
            <AlertDialogDescription>
              순서 {confirmDelete?.order} 을 정말 삭제하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmRemove}>확인</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={isUploadOpen} onOpenChange={(open) => !open && setIsUploadOpen(false)}>
        <DialogContent className='max-w-lg'>
          <DialogHeader>
            <DialogTitle>카드 템플릿 업로드</DialogTitle>
          </DialogHeader>
          <CardUploadModal />
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default CardList;
