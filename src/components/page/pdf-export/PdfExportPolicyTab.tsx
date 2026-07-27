import { getPdfExportPolicy, updatePdfExportPolicy } from '@/client/pdf-export';
import type { UpdatePdfExportPolicyParams } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const EMPTY: UpdatePdfExportPolicyParams = {
  coinPerQuestion: 0,
  maxDownloadCount: 0,
  expiryDays: 0,
};

const FIELDS: { key: keyof UpdatePdfExportPolicyParams; label: string; hint: string }[] = [
  { key: 'coinPerQuestion', label: '카드당 코인(스타)', hint: '답변이 있는 카드 1장당 차감되는 스타 코인' },
  { key: 'maxDownloadCount', label: '최대 다운로드 횟수', hint: '발급 후 다시 받을 수 있는 최대 횟수' },
  { key: 'expiryDays', label: '유효 기간(일)', hint: '발급일로부터 다운로드 가능한 기간' },
];

function PdfExportPolicyTab() {
  const { data, refetch } = useQuery({ queryKey: ['pdf-export-policy'], queryFn: getPdfExportPolicy });
  const [form, setForm] = useState<UpdatePdfExportPolicyParams>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        coinPerQuestion: data.coinPerQuestion,
        maxDownloadCount: data.maxDownloadCount,
        expiryDays: data.expiryDays,
      });
    }
  }, [data]);

  const save = async () => {
    const values = [form.coinPerQuestion, form.maxDownloadCount, form.expiryDays];
    if (values.some((v) => v === undefined || v <= 0 || !Number.isInteger(v))) {
      toast.warning('모든 값은 1 이상의 정수여야 합니다.');
      return;
    }
    setSaving(true);
    try {
      await updatePdfExportPolicy(form);
      await refetch();
      toast.success('PDF 내보내기 정책을 저장했습니다.');
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  return (
    <div className='max-w-xl space-y-6 rounded-lg border border-border bg-white p-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-slate-900'>PDF 내보내기 정책</h3>
        <span className='text-xs text-slate-600'>
          {data?.updatedAt ? `수정: ${new Date(data.updatedAt).toLocaleString('ko-KR')}` : '기본값 적용 중'}
        </span>
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        {FIELDS.map((field) => (
          <div key={field.key} className='space-y-2'>
            <Label className='text-sm font-medium text-slate-600'>{field.label}</Label>
            <Input
              type='text'
              inputMode='numeric'
              value={form[field.key] || ''}
              onChange={(e) => setForm((p) => ({ ...p, [field.key]: Number(e.target.value.replace(/[^\d]/g, '')) }))}
            />
            <p className='text-xs text-slate-600'>{field.hint}</p>
          </div>
        ))}
      </div>
      <div className='flex justify-end'>
        <Button type='button' onClick={save} disabled={saving}>
          {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          저장
        </Button>
      </div>
    </div>
  );
}

export default PdfExportPolicyTab;
