import { deletePdfExportRecord, getPdfExportAdminDownloadUrl, getPdfExportHistory } from '@/client/pdf-export';
import type { PdfExportRecord } from '@/client/types';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar, type FilterChipItem } from '@/components/shared/ui/filter-bar';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { Search } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import PdfExportAdjustDialog from './PdfExportAdjustDialog';
import { createPdfExportHistoryColumns } from './PdfExportHistoryColumns';

const PAGE_SIZE = 20;

function PdfExportHistoryTab() {
  const [space, setSpace] = useState('');
  const [user, setUser] = useState('');
  const [applied, setApplied] = useState<{ space: string; user: string }>({ space: '', user: '' });
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<PdfExportRecord | null>(null);
  const [adjustTarget, setAdjustTarget] = useState<PdfExportRecord | null>(null);

  const { data, isFetching, refetch } = useQuery({
    queryKey: ['pdf-export-history', page, applied.space, applied.user],
    queryFn: () => getPdfExportHistory({ page, space: applied.space || undefined, user: applied.user || undefined }),
    placeholderData: keepPreviousData,
  });

  const search = () => {
    setPage(1);
    setApplied({ space: space.trim(), user: user.trim() });
  };

  const removeChip = (key: string) => {
    if (key === 'space') {
      setSpace('');
      setApplied((prev) => ({ ...prev, space: '' }));
    } else {
      setUser('');
      setApplied((prev) => ({ ...prev, user: '' }));
    }
    setPage(1);
  };

  const openDownload = async (record: PdfExportRecord) => {
    try {
      const { url } = await getPdfExportAdminDownloadUrl(record.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(`${err}`);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      await deletePdfExportRecord(deleteTarget.id);
      await refetch();
      toast.success('발급 기록을 삭제했습니다.');
    } catch (err) {
      toast.error(`${err}`);
    }
    setDeleteTarget(null);
  };

  const columns = createPdfExportHistoryColumns({
    onDownload: openDownload,
    onAdjust: setAdjustTarget,
    onDelete: setDeleteTarget,
  });

  const chips: FilterChipItem[] = [
    ...(applied.space ? [{ key: 'space', label: `공간: ${applied.space}` }] : []),
    ...(applied.user ? [{ key: 'user', label: `유저: ${applied.user}` }] : []),
  ];

  return (
    <>
      <FilterBar chips={chips} onRemoveChip={removeChip}>
        <Input
          value={space}
          onChange={(e) => setSpace(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder='공간 이름 또는 공간 ID'
          className={`w-56 ${FILTER_CONTROL_CLASS}`}
        />
        <Input
          value={user}
          onChange={(e) => setUser(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          placeholder='닉네임 · 계정 · 프로필 ID'
          className={`w-56 ${FILTER_CONTROL_CLASS}`}
        />
        <Button onClick={search} disabled={isFetching} className={`${FILTER_CONTROL_CLASS} [&_svg]:size-3.5`}>
          <Search className='h-3.5 w-3.5' />
          검색
        </Button>
      </FilterBar>

      <DataTable
        columns={columns}
        data={data?.items ?? []}
        loading={isFetching}
        pagination={{
          total: data?.totalCount ?? 0,
          page,
          pageSize: PAGE_SIZE,
          onChange: (next) => setPage(next),
        }}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 PDF 발급 기록을 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              저장된 PDF 파일과 발급 기록이 함께 삭제되며 되돌릴 수 없습니다.
              {deleteTarget ? ` (${deleteTarget.fileName})` : ''}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete}>삭제</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PdfExportAdjustDialog
        record={adjustTarget}
        onClose={() => setAdjustTarget(null)}
        onChanged={() => refetch()}
      />
    </>
  );
}

export default PdfExportHistoryTab;
