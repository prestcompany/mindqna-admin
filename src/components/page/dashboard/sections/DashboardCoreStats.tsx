import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardCoreStatsProps {
  users?: number;
  profiles?: number;
  removedProfiles?: number;
  spaces?: number;
  isLoading?: boolean;
}

const statItems = [
  {
    key: 'users',
    title: '총 가입자',
    description: '전체 회원 계정 기준 누적 수치',
  },
  {
    key: 'profiles',
    title: '총 프로필',
    description: '생성된 전체 프로필 수',
  },
  {
    key: 'removedProfiles',
    title: '총 탈퇴 프로필',
    description: '비활성 또는 탈퇴 처리된 프로필 수',
  },
  {
    key: 'spaces',
    title: '총 공간수',
    description: '생성된 전체 공간 수',
  },
] as const;

function formatValue(value?: number) {
  if (typeof value !== 'number') {
    return '-';
  }

  return value.toLocaleString('ko-KR');
}

function DashboardCoreStats({ users, profiles, removedProfiles, spaces, isLoading = false }: DashboardCoreStatsProps) {
  const values = {
    users,
    profiles,
    removedProfiles,
    spaces,
  };

  return (
    <section className='space-y-3'>
      <div className='flex flex-wrap items-start justify-between gap-3'>
        <div className='flex flex-col gap-1'>
          <p className='text-sm font-medium text-slate-500'>전체 누적 현황</p>
          <p className='text-sm text-slate-600'>이 영역은 서비스 전체 스냅샷으로, 아래 기간과 국가 설정의 영향을 받지 않습니다.</p>
        </div>
        <div className='rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600'>기간 영향 없음</div>
      </div>

      <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-4'>
        {statItems.map((item) => (
          <Card key={item.key} className='border-slate-200/80 bg-white shadow-sm'>
            <CardHeader className='pb-3'>
              <CardTitle className='text-base text-slate-950'>{item.title}</CardTitle>
              <CardDescription>{item.description}</CardDescription>
            </CardHeader>
            <CardContent className='pt-0'>
              <div
                className={isLoading ? 'h-9 w-28 animate-pulse rounded-lg bg-slate-100' : 'text-3xl font-semibold tracking-tight text-slate-950'}
              >
                {isLoading ? null : formatValue(values[item.key])}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </section>
  );
}

export default DashboardCoreStats;
