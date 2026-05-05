import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { DashboardLocaleSpaceTypeDistribution } from '../types/growth';

interface SpaceTypeDistributionCardProps {
  rows: DashboardLocaleSpaceTypeDistribution[];
}

const typeColors: Record<string, string> = {
  friends: 'bg-emerald-500',
  alone: 'bg-amber-500',
  family: 'bg-indigo-500',
  couple: 'bg-sky-500',
};

function SpaceTypeDistributionCard({ rows }: SpaceTypeDistributionCardProps) {
  return (
    <Card className='border-slate-200/80 bg-white shadow-sm'>
      <CardHeader>
        <CardTitle className='text-base text-slate-950'>언어별 공간 유형 분포</CardTitle>
        <CardDescription>종료일 기준 누적 공간을 언어와 공간 유형별 개수/비율로 비교합니다.</CardDescription>
      </CardHeader>
      <CardContent>
        {rows.length ? (
          <div className='grid gap-4 xl:grid-cols-2'>
            {rows.map((row) => (
              <div key={row.locale} className='rounded-2xl border border-slate-200 bg-slate-50/70 p-4'>
                <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
                  <div>
                    <p className='font-semibold text-slate-950'>{row.label}</p>
                    <p className='text-xs text-slate-500'>{row.locale}</p>
                  </div>
                  <div className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600'>
                    총 {row.total.toLocaleString('ko-KR')}개
                  </div>
                </div>

                <div className='grid gap-3 sm:grid-cols-2'>
                  {row.types.map((type) => (
                    <div key={type.type} className='rounded-xl border border-slate-200 bg-white p-3'>
                      <div className='mb-2 flex items-center justify-between gap-2 text-sm'>
                        <span className='font-medium text-slate-900'>{type.label}</span>
                        <span className='text-xs font-semibold text-slate-600'>
                          {type.share.toFixed(1)}% / {type.count.toLocaleString('ko-KR')}개
                        </span>
                      </div>
                      <div className='h-2 overflow-hidden rounded-full bg-slate-100'>
                        <div
                          className={cn('h-full rounded-full', typeColors[type.type] ?? 'bg-slate-500')}
                          style={{ width: `${Math.min(type.share, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className='flex h-[180px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-500'>
            표시할 공간 유형 분포가 없습니다.
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default SpaceTypeDistributionCard;
