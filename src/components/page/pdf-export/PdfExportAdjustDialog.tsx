import { updatePdfExportRecord } from '@/client/pdf-export';
import type { PdfExportRecord } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

type Props = {
  record: PdfExportRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function PdfExportAdjustDialog({ record, open, onOpenChange, onChanged }: Props) {
  const [downloadCount, setDownloadCount] = useState(String(record.downloadCount));
  const [expiresAt, setExpiresAt] = useState(toDateInput(record.expiresAt));
  const [saving, setSaving] = useState(false);

  const save = async () => {
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
      await updatePdfExportRecord(record.id, {
        downloadCount: count,
        expiresAt: parsedExpiry.toISOString(),
      });
      toast.success('레코드를 조정했습니다.');
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>다운로드 횟수 · 만료일 조정</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <Label className='text-xs text-slate-600'>다운로드 횟수 (최대 {record.maxDownloadCount})</Label>
            <Input
              type='text'
              inputMode='numeric'
              value={downloadCount}
              onChange={(e) => setDownloadCount(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs text-slate-600'>만료일</Label>
            <Input type='date' value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={save} disabled={saving}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PdfExportAdjustDialog;
