import { deletePdfExportRecord, getPdfExportAdminDownloadUrl } from '@/client/pdf-export';
import type { PdfExportRecord } from '@/client/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import PdfExportAdjustDialog from './PdfExportAdjustDialog';

function PdfExportRowActions({ record, onChanged }: { record: PdfExportRecord; onChanged: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const { url } = await getPdfExportAdminDownloadUrl(record.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(`${err}`);
    }
    setDownloading(false);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deletePdfExportRecord(record.id);
      toast.success('레코드를 삭제했습니다.');
      onChanged();
    } catch (err) {
      toast.error(`${err}`);
    }
    setDeleting(false);
  };

  return (
    <div className='flex items-center justify-end gap-1'>
      <Button variant='ghost' size='sm' onClick={download} disabled={downloading}>
        보기
      </Button>
      <Button variant='ghost' size='sm' onClick={() => setAdjustOpen(true)}>
        조정
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant='ghost' size='sm' className='text-rose-600 hover:text-rose-700' disabled={deleting}>
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 발급 레코드를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              DB 레코드와 S3 파일이 함께 삭제되며 되돌릴 수 없습니다. ({record.fileName})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className='bg-rose-600 hover:bg-rose-700'>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PdfExportAdjustDialog record={record} open={adjustOpen} onOpenChange={setAdjustOpen} onChanged={onChanged} />
    </div>
  );
}

export default PdfExportRowActions;
