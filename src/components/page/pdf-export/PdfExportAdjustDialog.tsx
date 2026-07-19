import { updatePdfExportRecord } from '@/client/pdf-export';
import type { PdfExportRecord } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type Props = {
  record: PdfExportRecord | null;
  onClose: () => void;
  onChanged: () => void;
};

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function PdfExportAdjustDialog({ record, onClose, onChanged }: Props) {
  const [downloadCount, setDownloadCount] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (record) {
      setDownloadCount(String(record.downloadCount));
      setExpiresAt(toDateInput(record.expiresAt));
    }
  }, [record]);

  const save = async () => {
    if (!record) return;
    const count = Number(downloadCount);
    if (!Number.isInteger(count) || count < 0) {
      toast.warning('다운로드 횟수는 0 이상의 정수여야 합니다.');
      return;
    }
    const parsedExpiry = new Date(`${expiresAt}T23:59:59`);
    if (Number.isNaN(parsedExpiry.getTime())) {
      toast.warning('만료일이 올바르지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      await updatePdfExportRecord(record.id, { downloadCount: count, expiresAt: parsedExpiry.toISOString() });
      toast.success('발급 정보를 수정했습니다.');
      onChanged();
      onClose();
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  return (
    <Dialog open={!!record} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-[440px] border-border bg-background p-0 shadow-2xl'>
        <DialogHeader className='border-b border-border/70 px-6 py-5'>
          <DialogTitle>다운로드·만료 조정</DialogTitle>
          <DialogDescription>CS 대응을 위해 이 발급 건의 다운로드 횟수와 만료일을 직접 수정합니다.</DialogDescription>
        </DialogHeader>

        <div className='space-y-5 px-6 py-5'>
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-foreground'>
              다운로드 횟수{record ? ` (최대 ${record.maxDownloadCount}회)` : ''}
            </label>
            <Input
              type='text'
              inputMode='numeric'
              autoComplete='off'
              value={downloadCount}
              onChange={(e) => setDownloadCount(e.target.value.replace(/[^\d]/g, ''))}
            />
            <p className='text-xs text-muted-foreground'>0으로 되돌리면 다시 다운로드할 수 있습니다.</p>
          </div>
          <div className='space-y-2'>
            <label className='block text-sm font-medium text-foreground'>만료일</label>
            <Input type='date' value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>

        <DialogFooter className='border-t border-border/70 px-6 py-4'>
          <Button type='button' variant='outline' onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type='button' onClick={save} disabled={saving}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PdfExportAdjustDialog;
