import { useEffect, useState } from 'react';

import { CardStatistics } from '@/client/dashboard';
import { Locale, SpaceType } from '@/client/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useCardAnalytics } from '@/hooks/useAnalytics';
import { AlertCircle } from 'lucide-react';

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

interface CardTabProps {
  setLoading: (loading: boolean) => void;
}

function CardTab({ setLoading }: CardTabProps) {
  const { data, isLoading } = useCardAnalytics();
  const [cardStats, setCardStats] = useState<CardStatistics['cardStats']>([]);
  const [displayData, setDisplayData] = useState<DisplayCountryData[]>([]);

  useEffect(() => {
    setLoading(isLoading);
  }, [isLoading, setLoading]);

  useEffect(() => {
    if (data && data.cardStats) {
      setCardStats(data.cardStats);
    } else {
      setCardStats([]);
    }
  }, [data]);

  // cardStats 데이터가 변경될 때 displayData로 변환
  useEffect(() => {
    if (!cardStats || cardStats.length === 0) {
      setDisplayData([]);
      return;
    }

    const groupedByLocale = cardStats.reduce(
      (acc, stat) => {
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

    setDisplayData(Object.values(groupedByLocale));
  }, [cardStats]);

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
    if (spaceType === 'alone') return 'bg-purple-500';
    return 'bg-gray-500';
  };

  if (isLoading) {
    return <div className='p-4 text-center'>로딩 중...</div>;
  }

  return (
    <>
      <div className='mt-6'>
        <Card>
          <CardHeader>
            <CardTitle>언어 및 카드 타입별 발급 현황</CardTitle>
            <CardDescription>
              언어별 카드 타입 진행 상황 (발급 수가 어드민 등록 최대치의 80% 이상 도달 시 추가 등록 필요)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className='space-y-8'>
              {displayData.map((country) => (
                <div key={country.code} className='pb-6 border-b last:border-0'>
                  <div className='flex items-center justify-between mb-4'>
                    <div className='flex items-center gap-2'>
                      <span className='text-lg font-medium'>
                        {country.name} ({country.code})
                      </span>
                      {/* 전체 질문/발급량에 대한 경고 */}
                      {needsOverallWarning(country) && (
                        <span className='bg-red-100 text-red-800 text-xs px-2 py-0.5 rounded-full flex items-center'>
                          <AlertCircle className='w-3 h-3 mr-1' />
                          경고 (전체)
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 카드 타입별 프로그레스 바 */}
                  <div className='space-y-4'>
                    {(Object.keys(SPACE_TYPE_MAP) as SpaceType[]).map((spaceTypeKey) => {
                      const typeStat = country.types[spaceTypeKey];
                      if (!typeStat) return null; // 해당 타입 데이터가 없으면 렌더링 안함

                      return (
                        <div key={spaceTypeKey}>
                          <div className='flex justify-between mb-1 text-sm'>
                            <span className='font-medium'>{SPACE_TYPE_MAP[spaceTypeKey]}</span>
                            <span>
                              {typeStat.userCount}/{typeStat.adminTarget}
                            </span>
                          </div>
                          <div className='w-full h-3 overflow-hidden bg-gray-200 rounded-full'>
                            <div
                              className={`h-full ${getProgressBarColor(typeStat.spaceType, typeStat.userCount, typeStat.adminTarget)}`}
                              style={{
                                width: `${typeStat.adminTarget > 0 ? (typeStat.userCount / typeStat.adminTarget) * 100 : 0}%`,
                              }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* 추가 질문 등록 필요 경고 (타입별) */}
                  {(Object.keys(country.types) as SpaceType[]).some((spaceTypeKey) => {
                    const typeStat = country.types[spaceTypeKey];
                    return typeStat && needsCardTypeWarning(typeStat.userCount, typeStat.adminTarget);
                  }) && (
                    <div className='px-3 py-2 mt-4 text-sm text-yellow-800 border border-yellow-200 rounded bg-yellow-50'>
                      <AlertCircle className='inline w-4 h-4 mr-1' />
                      하나 이상의 카드 타입에서 발급 수가 80% 이상에 도달했습니다. 추가 질문 등록이 필요할 수 있습니다.
                    </div>
                  )}
                </div>
              ))}
              {displayData.length === 0 && !isLoading && (
                <p className='text-center text-gray-500'>표시할 데이터가 없습니다.</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </>
  );
}

export default CardTab;
