import { updatePdfExportRecord } from '@/client/pdf-export';
import type { PdfExportRecord } from '@/client/types';
import { DefinitionRow } from '@/components/shared/ui/definition-row';
import { Button } from '@/components/ui/button';
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
    <>
      <div className='-mx-6'>
        <DefinitionRow
          label={`다운로드 횟수${record ? ` (최대 ${record.maxDownloadCount}회)` : ''}`}
          hint='0으로 되돌리면 다시 다운로드할 수 있습니다.'
        >
          <Input
            type='text'
            inputMode='numeric'
            autoComplete='off'
            value={downloadCount}
            onChange={(e) => setDownloadCount(e.target.value.replace(/[^\d]/g, ''))}
          />
        </DefinitionRow>
        <DefinitionRow label='만료일'>
          <Input type='date' value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
        </DefinitionRow>
      </div>

      <div className='sticky bottom-0 z-10 -mx-6 border-t bg-background/95 px-6 py-4 backdrop-blur supports-[backdrop-filter]:bg-background/80'>
        <div className='flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={onClose} disabled={saving}>
            취소
          </Button>
          <Button type='button' onClick={save} disabled={saving}>
            저장
          </Button>
        </div>
      </div>
    </>
  );
}

export default PdfExportAdjustDialog;
