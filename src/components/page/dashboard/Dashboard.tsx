import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import { useState } from 'react';

import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import QuestionsTab from './tabs/QuestionTab';
import AnalyticsTab from './tabs/SpaceTab';
import OverviewTab from './tabs/UserTab';

dayjs.extend(weekday);
dayjs.extend(localeData);

function Dashboard() {
  const [startedAt, setStartedAt] = useState<dayjs.Dayjs>(dayjs().subtract(1, 'day'));
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs>(dayjs());

  return (
    <div className='flex flex-col space-y-6'>
      <div className='flex flex-col items-center justify-between gap-4 md:flex-row'>
        <h1 className='text-3xl font-bold tracking-tight'>대시보드</h1>
        <div className='flex items-center w-full space-x-2 md:w-auto'>
          <DatePickerWithRange
            startedAt={startedAt}
            endedAt={endedAt}
            setStartedAt={setStartedAt}
            setEndedAt={setEndedAt}
            className='w-full md:w-auto'
          />
        </div>
      </div>

      <Tabs defaultValue='overview' className='space-y-4'>
        <TabsList>
          <TabsTrigger value='overview'>사용자</TabsTrigger>
          <TabsTrigger value='analytics'>공간</TabsTrigger>
          <TabsTrigger value='questions'>질문</TabsTrigger>
          {/* <TabsTrigger value='reports'>보고서</TabsTrigger>
            <TabsTrigger value='notifications'>알림</TabsTrigger> */}
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <OverviewTab startedAt={startedAt} endedAt={endedAt} />
        </TabsContent>

        <TabsContent value='analytics' className='space-y-4'>
          <AnalyticsTab startedAt={startedAt} endedAt={endedAt} />
        </TabsContent>

        <TabsContent value='questions'>
          <QuestionsTab startedAt={startedAt} endedAt={endedAt} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default Dashboard;
