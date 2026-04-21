import { Card, CardContent } from '@/components/ui/card';

interface DashboardHeroProps {
  title: string;
  description: string;
  rangeLabel: string;
  rangeSummary: string;
  lastUpdatedLabel: string;
  selectedLocalesLabel: string;
}

function DashboardHero({
  title,
  description,
  rangeLabel,
  rangeSummary,
  lastUpdatedLabel,
  selectedLocalesLabel,
}: DashboardHeroProps) {
  const summaryItems = [
    { label: '집계 범위', value: rangeLabel },
    { label: '최근 기준월', value: lastUpdatedLabel },
    { label: '선택 로케일', value: selectedLocalesLabel },
  ];

  return (
    <Card className='overflow-hidden border-slate-200/80 bg-white shadow-sm'>
      <div className='h-px w-full bg-gradient-to-r from-blue-600 via-sky-400 to-emerald-400' />
      <CardContent className='flex flex-col gap-4 p-5'>
        <div className='flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between'>
          <div className='space-y-3'>
            <div className='inline-flex items-center rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-xs font-medium text-blue-700'>
              Growth Dashboard
            </div>
            <div className='space-y-1.5'>
              <h1 className='text-2xl font-semibold tracking-tight text-slate-950'>{title}</h1>
              <p className='max-w-2xl text-sm leading-6 text-slate-600'>{description}</p>
            </div>
          </div>

          <div className='rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600 shadow-inner xl:max-w-sm'>
            <p className='font-medium text-slate-900'>운영 메모</p>
            <p className='mt-1 leading-6'>{rangeSummary}</p>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-3'>
          {summaryItems.map((item) => (
            <div key={item.label} className='rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-3'>
              <p className='text-xs font-medium uppercase tracking-[0.12em] text-slate-500'>{item.label}</p>
              <p className='mt-2 text-sm font-semibold text-slate-900'>{item.value}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

export default DashboardHero;
