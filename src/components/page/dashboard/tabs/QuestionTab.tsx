import dayjs from 'dayjs';
import { useEffect } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import useAnalytics from '@/hooks/useAnaytics';

interface QuestionsTabProps {
  startedAt: dayjs.Dayjs;
  endedAt: dayjs.Dayjs;
}

function QuestionsTab({ startedAt, endedAt }: QuestionsTabProps) {
  const { data, isLoading, refetch } = useAnalytics({
    startedAt: startedAt.format('YYYY-MM-DD'),
    endedAt: endedAt.format('YYYY-MM-DD'),
  });

  // 날짜 변경 시 데이터 다시 가져오기
  useEffect(() => {
    refetch();
  }, [startedAt, endedAt, refetch]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>질문</CardTitle>
        <CardDescription>질문 통계를 확인하세요.</CardDescription>
      </CardHeader>
      <CardContent>
        <p>질문 데이터가 준비 중입니다.</p>
      </CardContent>
    </Card>
  );
}

export default QuestionsTab;
