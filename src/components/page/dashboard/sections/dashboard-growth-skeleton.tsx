import { DashboardTabValue } from '../types/growth';

interface DashboardGrowthSkeletonProps {
  tab: Exclude<DashboardTabValue, 'cards'>;
}

function SkeletonCard({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl border border-slate-200 bg-white ${className}`.trim()} />;
}

function DashboardGrowthSkeleton({ tab }: DashboardGrowthSkeletonProps) {
  const metricCount = tab === 'overview' ? 4 : 2;

  return (
    <div className='space-y-6'>
      <div className={`grid gap-4 ${metricCount === 4 ? 'md:grid-cols-2 xl:grid-cols-4' : 'md:grid-cols-2'}`}>
        {Array.from({ length: metricCount }).map((_, index) => (
          <SkeletonCard key={index} className='h-[132px]' />
        ))}
      </div>

      <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]'>
        <SkeletonCard className='h-[430px]' />
        <SkeletonCard className='h-[430px]' />
      </div>

      {tab === 'overview' ? (
        <div className='grid gap-6 xl:grid-cols-[minmax(0,1.7fr)_minmax(320px,0.9fr)]'>
          <SkeletonCard className='h-[420px]' />
          <div className='grid gap-4'>
            {Array.from({ length: 2 }).map((_, index) => (
              <SkeletonCard key={index} className='h-[198px]' />
            ))}
          </div>
        </div>
      ) : (
        <>
          <SkeletonCard className='h-[420px]' />
          <SkeletonCard className='h-[250px]' />
        </>
      )}
    </div>
  );
}

export default DashboardGrowthSkeleton;
