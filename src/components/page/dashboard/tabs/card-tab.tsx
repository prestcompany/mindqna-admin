import { CardStatistics } from '@/client/dashboard';
import { Locale, SpaceType } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCardAnalytics } from '@/hooks/useAnalytics';
import { AlertCircle } from 'lucide-react';
import { useMemo } from 'react';

// 화면 표시용 데이터 구조
interface DisplayCountryData {
  code: Locale;
  name: string; // Locale 코드를 기반으로 표시할 이름 (예: 'ko' -> '한국어')
  adminTotalQuestions: number; // 해당 locale의 전체 admin 질문 수 (경고용)
  userTotalQuestions: number; // 해당 locale의 전체 user 발급 수 (경고용)
  types: {
    [key in SpaceType]?: {
      userCount: number; // 사용자 발급 수 (spaceMaxOrder)
      adminTarget: number; // 어드민 등록 최대치 (maxOrder)
      spaceType?: SpaceType; // 원래 CardStat에 있던 CardTemplateType을 여기에 저장하여 getProgressBarColor에 전달할 수 있습니다.
    };
  };
}

const SPACE_TYPE_MAP: Record<SpaceType, string> = {
  couple: '커플',
  family: '가족',
  friends: '친구',
  alone: '혼자',
};

// LOCALE_NAME_MAP의 키 타입을 string으로 명시하여 인덱싱 오류 방지
const LOCALE_NAME_MAP: Record<string, string> = {
  ko: '한국어',
  en: '영어',
  ja: '일본어',
  zh: '중국어',
  zhTw: '중국어(번체)',
  es: '스페인어',
  id: '인도네시아어',
};

function CardTab() {
  const { data, isLoading } = useCardAnalytics();

  const displayData = useMemo(() => {
    const cardStats = data?.cardStats ?? [];

    if (!cardStats.length) {
      return [];
    }

    const groupedByLocale = cardStats.reduce(
      (acc, stat: CardStatistics['cardStats'][number]) => {
        const localeKey: string = stat.locale; // stat.locale을 string으로 명시적 타입 지정
        if (!acc[localeKey]) {
          acc[localeKey] = {
            code: stat.locale,
            name: LOCALE_NAME_MAP[localeKey] || localeKey,
            adminTotalQuestions: 0,
            userTotalQuestions: 0,
            types: {},
          };
        }
        // stat.spaceType을 사용하여 types 객체에 접근
        const spaceTypeKey: SpaceType = stat.spaceType;
        acc[localeKey].types[spaceTypeKey] = {
          userCount: stat.spaceMaxOrder || 0,
          adminTarget: stat.maxOrder || 0,
          spaceType: stat.spaceType,
        };
        return acc;
      },
      {} as Record<string, DisplayCountryData>, // acc의 키 타입도 string으로 명시
    );

    Object.values(groupedByLocale).forEach((localeData) => {
      let adminSum = 0;
      let userSum = 0;
      Object.values(localeData.types).forEach((typeStats) => {
        if (typeStats) {
          adminSum += typeStats.adminTarget;
          userSum += typeStats.userCount;
        }
      });
      localeData.adminTotalQuestions = adminSum;
      localeData.userTotalQuestions = userSum;
    });

    return Object.values(groupedByLocale);
  }, [data?.cardStats]);

  // 일반 경고 (질문 수 14개 미만 / 사용자 발급 30개 미만)
  // 이 로직은 전체 질문 수와 전체 사용자 발급 수를 알아야 함.
  // 현재 cardStats 구조에서는 이 정보를 직접 얻기 어려움.
  // 여기서는 DisplayCountryData의 adminTotalQuestions, userTotalQuestions를 사용.
  const needsOverallWarning = (country: DisplayCountryData) => {
    // adminTotalQuestions는 모든 타입의 spaceMaxOrder의 합
    // userTotalQuestions는 모든 타입의 maxOrder의 합
    return country.adminTotalQuestions < 14 || country.userTotalQuestions < 30;
  };

  // 카드 타입별 경고 표시 필요 여부 확인 (어드민 발급 수의 80% 이상 사용)
  const needsCardTypeWarning = (userCount: number, adminTarget: number) => {
    if (adminTarget === 0) return false; // 목표치가 0이면 경고하지 않음
    return userCount >= adminTarget * 0.8;
  };

  // getProgressBarColor는 CardTemplateType을 기준으로 색상을 결정합니다.
  const getProgressBarColor = (spaceType: SpaceType | undefined, userCount: number, adminTarget: number) => {
    if (needsCardTypeWarning(userCount, adminTarget)) return 'bg-red-500';
    // CardTemplateType 문자열 리터럴과 직접 비교
    if (spaceType === 'couple') return 'bg-blue-500';
    if (spaceType === 'family') return 'bg-indigo-500';
    if (spaceType === 'friends') return 'bg-green-500';
    if (spaceType === 'alone') return 'bg-amber-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return <div className='rounded-2xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500'>로딩 중...</div>;
  }

  return (
    <div className='space-y-6'>
      <div className='grid gap-4 md:grid-cols-3'>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base text-slate-950'>활성 로케일</CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-2xl font-semibold tracking-tight text-slate-950'>{displayData.length.toLocaleString('ko-KR')}</p>
            <p className='mt-1 text-sm text-slate-500'>현재 카드 발급 현황을 추적 중인 로케일 수</p>
          </CardContent>
        </Card>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base text-slate-950'>전체 관리자 목표</CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-2xl font-semibold tracking-tight text-slate-950'>
              {displayData.reduce((sum, country) => sum + country.adminTotalQuestions, 0).toLocaleString('ko-KR')}
            </p>
            <p className='mt-1 text-sm text-slate-500'>로케일별 카드 목표치 합계</p>
          </CardContent>
        </Card>
        <Card className='border-slate-200/80 bg-white shadow-sm'>
          <CardHeader className='pb-3'>
            <CardTitle className='text-base text-slate-950'>전체 사용자 발급</CardTitle>
          </CardHeader>
          <CardContent className='pt-0'>
            <p className='text-2xl font-semibold tracking-tight text-slate-950'>
              {displayData.reduce((sum, country) => sum + country.userTotalQuestions, 0).toLocaleString('ko-KR')}
            </p>
            <p className='mt-1 text-sm text-slate-500'>누적 사용자 카드 발급 수</p>
          </CardContent>
        </Card>
      </div>

      <Card className='border-slate-200/80 bg-white shadow-sm'>
        <CardHeader>
          <CardTitle className='text-base text-slate-950'>질문 운영 현황</CardTitle>
          <CardDescription>언어별 카드 목표 대비 발급 현황을 같은 시각 체계로 정리했습니다.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className='space-y-8'>
            {displayData.map((country) => (
              <div key={country.code} className='border-b border-slate-200 pb-6 last:border-0'>
                <div className='mb-4 flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2'>
                    <span className='text-lg font-medium text-slate-950'>
                      {country.name} ({country.code})
                    </span>
                    {needsOverallWarning(country) && (
                      <Badge variant='warning' className='gap-1 rounded-full px-2 py-1'>
                        <AlertCircle className='h-3 w-3' />
                        주의 필요
                      </Badge>
                    )}
                  </div>
                  <div className='text-sm text-slate-500'>
                    관리자 목표 {country.adminTotalQuestions.toLocaleString('ko-KR')} / 사용자 발급{' '}
                    {country.userTotalQuestions.toLocaleString('ko-KR')}
                  </div>
                </div>

                <div className='space-y-4'>
                  {(Object.keys(SPACE_TYPE_MAP) as SpaceType[]).map((spaceTypeKey) => {
                    const typeStat = country.types[spaceTypeKey];
                    if (!typeStat) return null;

                    return (
                      <div key={spaceTypeKey}>
                        <div className='mb-1 flex justify-between text-sm text-slate-600'>
                          <span className='font-medium text-slate-900'>{SPACE_TYPE_MAP[spaceTypeKey]}</span>
                          <span>
                            {typeStat.userCount}/{typeStat.adminTarget}
                          </span>
                        </div>
                        <div className='h-3 w-full overflow-hidden rounded-full bg-slate-100'>
                          <div
                            className={`h-full ${getProgressBarColor(typeStat.spaceType, typeStat.userCount, typeStat.adminTarget)}`}
                            style={{
                              width: `${typeStat.adminTarget > 0 ? Math.min((typeStat.userCount / typeStat.adminTarget) * 100, 100) : 0}%`,
                            }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(Object.keys(country.types) as SpaceType[]).some((spaceTypeKey) => {
                  const typeStat = country.types[spaceTypeKey];
                  return typeStat && needsCardTypeWarning(typeStat.userCount, typeStat.adminTarget);
                }) && (
                  <div className='mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-900'>
                    <AlertCircle className='mr-1 inline h-4 w-4' />
                    일부 카드 타입이 목표치의 80% 이상 소진되었습니다. 추가 질문 등록을 검토해주세요.
                  </div>
                )}
              </div>
            ))}
            {displayData.length === 0 && !isLoading && <p className='text-center text-slate-500'>표시할 데이터가 없습니다.</p>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default CardTab;
