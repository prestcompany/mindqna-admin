import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

interface DashboardCoreStatsProps {
  users?: number;
  profiles?: number;
  removedProfiles?: number;
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
] as const;

function formatValue(value?: number) {
  if (typeof value !== 'number') {
    return '-';
  }

  return value.toLocaleString('ko-KR');
}

function DashboardCoreStats({ users, profiles, removedProfiles, isLoading = false }: DashboardCoreStatsProps) {
  const values = {
    users,
    profiles,
    removedProfiles,
  };

  return (
    <section className='space-y-3'>
      <div className='flex flex-col gap-1'>
        <p className='text-sm font-medium text-slate-500'>전체 누적 현황</p>
        <p className='text-sm text-slate-600'>기간 필터와 관계없이 운영 규모를 먼저 확인할 수 있도록 상단에 고정한 요약 영역입니다.</p>
      </div>

      <div className='grid gap-4 md:grid-cols-3'>
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
