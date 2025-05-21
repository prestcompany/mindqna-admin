import Spinner from '@/components/shared/spinner';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import dayjs from 'dayjs';
import localeData from 'dayjs/plugin/localeData';
import weekday from 'dayjs/plugin/weekday';
import { useState } from 'react';
import CardTab from './tabs/CardTab';
import SpaceTab from './tabs/SpaceTab';
import OverviewTab from './tabs/UserTab';

dayjs.extend(weekday);
dayjs.extend(localeData);

function Dashboard() {
  const [loading, setLoading] = useState<boolean>(true);
  const [startedAt, setStartedAt] = useState<dayjs.Dayjs>(dayjs().subtract(7, 'day'));
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs>(dayjs());
  const [activeTab, setActiveTab] = useState<string>('overview');

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  return (
    <div className='relative flex flex-col w-full h-screen space-y-6'>
      <div className='flex flex-col items-center justify-between gap-4 md:flex-row'>
        <h1 className='text-3xl font-bold tracking-tight'>대시보드</h1>
        <div className='flex items-center w-full space-x-2 md:w-auto'>
          {activeTab !== 'cards' && (
            <DatePickerWithRange
              startedAt={startedAt}
              endedAt={endedAt}
              setStartedAt={setStartedAt}
              setEndedAt={setEndedAt}
              className='w-full md:w-auto'
            />
          )}
        </div>
      </div>

      <Tabs defaultValue='overview' className='space-y-4' onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value='overview'>사용자</TabsTrigger>
          <TabsTrigger value='analytics'>공간</TabsTrigger>
          <TabsTrigger value='cards'>질문</TabsTrigger>
        </TabsList>

        <TabsContent value='overview' className='space-y-4'>
          <OverviewTab startedAt={startedAt} endedAt={endedAt} setLoading={setLoading} />
        </TabsContent>

        <TabsContent value='analytics' className='space-y-4'>
          <SpaceTab startedAt={startedAt} endedAt={endedAt} setLoading={setLoading} />
        </TabsContent>

        <TabsContent value='cards' className='space-y-4'>
          <CardTab setLoading={setLoading} />
        </TabsContent>
      </Tabs>

      {loading && <Spinner />}
    </div>
  );
}

export default Dashboard;
