import { Button } from '@/components/ui/button';
import { ChevronDown, ChevronRight, Copy } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, sortKeysDeep(v)]),
    );
  }
  return value;
}

function ReceiptViewer({ title, raw }: { title: string; raw: string }) {
  const [open, setOpen] = useState(false);

  const pretty = useMemo(() => {
    try {
      return JSON.stringify(sortKeysDeep(JSON.parse(raw)), null, 2);
    } catch {
      return null; // 파싱 실패 → 원문 폴백
    }
  }, [raw]);

  const copyRaw = () => {
    navigator.clipboard.writeText(raw);
    toast.success(`${title} 원문 복사됨`);
  };

  return (
    <div className='rounded-lg border border-slate-200'>
      <div className='flex items-center justify-between px-3 py-2'>
        <button
          type='button'
          onClick={() => setOpen((prev) => !prev)}
          className='flex items-center gap-1 text-xs font-semibold text-slate-600'
        >
          {open ? <ChevronDown className='h-3.5 w-3.5' /> : <ChevronRight className='h-3.5 w-3.5' />}
          {title}
          {pretty === null ? <span className='ml-1 font-normal text-slate-500'>(원문)</span> : null}
        </button>
        <Button variant='ghost' size='sm' className='px-2 text-xs text-slate-600' onClick={copyRaw}>
          <Copy className='mr-1 h-3 w-3' />
          복사
        </Button>
      </div>
      {open ? (
        <pre className='max-h-80 overflow-auto whitespace-pre-wrap border-t border-slate-100 bg-slate-50 p-3 text-xs text-slate-700'>
          {pretty ?? raw}
        </pre>
      ) : null}
    </div>
  );
}

export default ReceiptViewer;
