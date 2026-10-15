import { getPdfExportPolicy, updatePdfExportPolicy } from '@/client/pdf-export';
import type { PdfExportCurrency } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  EMPTY_PDF_EXPORT_POLICY_FORM,
  PDF_EXPORT_CURRENCY_LABEL,
  type PdfExportPolicyForm,
  pdfExportPolicyError,
  toPdfExportPolicyForm,
  toUpdatePdfExportPolicyParams,
} from './services/pdf-export-policy-form';

type NumberField = Exclude<keyof PdfExportPolicyForm, 'currency'>;

const CURRENCIES: PdfExportCurrency[] = ['STAR', 'HEART'];

const PRICE_FIELDS: { key: NumberField; label: string; hint: string }[] = [
  {
    key: 'coinPerQuestion',
    label: '카드당 스타',
    hint: '구버전 앱은 결제 화폐와 관계없이 이 단가로 스타를 차감합니다.',
  },
  { key: 'heartPerQuestion', label: '카드당 하트', hint: '결제 화폐가 하트일 때 답변이 있는 카드 1장당 차감됩니다.' },
];

const LIMIT_FIELDS: { key: NumberField; label: string; hint: string }[] = [
  { key: 'maxDownloadCount', label: '최대 다운로드 횟수', hint: '발급 후 다시 받을 수 있는 최대 횟수' },
  { key: 'expiryDays', label: '유효 기간(일)', hint: '발급일로부터 다운로드 가능한 기간' },
];

function PdfExportPolicyTab() {
  const { data, refetch } = useQuery({ queryKey: ['pdf-export-policy'], queryFn: getPdfExportPolicy });
  const [form, setForm] = useState<PdfExportPolicyForm>(EMPTY_PDF_EXPORT_POLICY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) setForm(toPdfExportPolicyForm(data));
  }, [data]);

  const save = async () => {
    const error = pdfExportPolicyError(form);
    if (error) {
      toast.warning(error);
      return;
    }
    setSaving(true);
    try {
      await updatePdfExportPolicy(toUpdatePdfExportPolicyParams(form));
      await refetch();
      toast.success('PDF 내보내기 정책을 저장했습니다.');
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  const renderNumberField = (field: { key: NumberField; label: string; hint: string }) => (
    <div key={field.key} className='space-y-2'>
      <Label htmlFor={`pdf-policy-${field.key}`} className='text-sm font-medium text-muted-foreground'>
        {field.label}
      </Label>
      <Input
        id={`pdf-policy-${field.key}`}
        type='text'
        inputMode='numeric'
        value={form[field.key] || ''}
        onChange={(e) => setForm((p) => ({ ...p, [field.key]: Number(e.target.value.replace(/[^\d]/g, '')) }))}
      />
      <p className='text-xs text-muted-foreground'>{field.hint}</p>
    </div>
  );

  return (
    <div className='max-w-xl space-y-6 rounded-lg border border-border bg-white p-6'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-foreground'>PDF 내보내기 정책</h3>
        <span className='text-xs text-muted-foreground'>
          {data?.updatedAt ? `수정: ${new Date(data.updatedAt).toLocaleString('ko-KR')}` : '기본값 적용 중'}
        </span>
      </div>

      <div className='space-y-2'>
        <Label className='text-sm font-medium text-muted-foreground'>결제 화폐</Label>
        <RadioGroup
          value={form.currency}
          onValueChange={(value) => setForm((p) => ({ ...p, currency: value as PdfExportCurrency }))}
          className='grid grid-cols-2 gap-2'
        >
          {CURRENCIES.map((currency) => (
            <div key={currency}>
              <RadioGroupItem value={currency} id={`pdf-policy-currency-${currency}`} className='peer sr-only' />
              <Label
                htmlFor={`pdf-policy-currency-${currency}`}
                className='flex h-10 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground'
              >
                {PDF_EXPORT_CURRENCY_LABEL[currency]}
              </Label>
            </div>
          ))}
        </RadioGroup>
        <p className='text-xs text-muted-foreground'>최신 앱에서 PDF를 살 때 차감되는 화폐입니다.</p>
      </div>

      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>{PRICE_FIELDS.map(renderNumberField)}</div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>{LIMIT_FIELDS.map(renderNumberField)}</div>

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
