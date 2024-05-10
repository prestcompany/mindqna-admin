import useAnalytics from "@/hooks/useAnaytics";
import { DatePicker, Statistic, Tabs } from "antd";
import { TabsProps } from "antd/lib";
import "chart.js/auto";
import "chartjs-plugin-datalabels";
import dayjs from "dayjs";
import localeData from "dayjs/plugin/localeData";
import weekday from "dayjs/plugin/weekday";
import { useState } from "react";
import { Chart } from "react-chartjs-2";

dayjs.extend(weekday);
dayjs.extend(localeData);

function Dashboard() {
  const [startedAt, setStartedAt] = useState<dayjs.Dayjs>(dayjs());
  const [endedAt, setEndedAt] = useState<dayjs.Dayjs>(dayjs());

  const { data, refetch, isLoading } = useAnalytics({
    startedAt: startedAt.format("YYYY-MM-DD"),
    endedAt: endedAt.format("YYYY-MM-DD"),
  });

  const userCountMap = countSameCreatedAt(
    (data?.users ?? []).map((user) => ({ createdAt: dayjs(user.createdAt).format("YYYY-MM-DD") }))
  );
  const spaceCountMap = countSameCreatedAt(
    (data?.spaces ?? []).map((item) => ({ createdAt: dayjs(item.createdAt).format("YYYY-MM-DD") }))
  );

  const spaceTypeCountMap = countItemsWithSameKey(
    (data?.spaces ?? []).map((space) => ({ type: space.spaceInfo.type })),
    "type"
  );

  const spaceItems: TabsProps["items"] = [
    {
      key: "1",
      label: "생성수",
      children: (
        <div className="flex gap-12">
          <div className="w-[600px] h-[600px]">
            <Chart
              type="bar"
              options={{
                plugins: {
                  datalabels: {
                    display: true,
                    color: "white",
                  },
                },
              }}
              data={{
                labels: Object.keys(spaceCountMap),
                datasets: [
                  {
                    label: "생성 수",
                    data: Object.values(spaceCountMap),
                  },
                ],
              }}
            />
          </div>
          <div className="flex flex-col gap-4">
            {Object.entries(spaceCountMap).map(([type, count]) => {
              return (
                <div key={type}>
                  {type} : {count}
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: "타입 통계",
      children: (
        <div className="flex gap-12">
          <div className="w-[600px] h-[600px]">
            <Chart
              type="pie"
              options={{
                plugins: {
                  datalabels: {
                    display: true,
                    color: "white",
                  },
                },
              }}
              data={{
                labels: Object.keys(spaceTypeCountMap),
                datasets: [
                  {
                    label: "공간 수",
                    data: Object.values(spaceTypeCountMap),
                  },
                ],
              }}
            />
          </div>
          <div className="flex flex-col gap-4">
            {Object.entries(spaceTypeCountMap).map(([type, count]) => {
              return (
                <div key={type}>
                  {type} : {count}
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
  ];

  const items: TabsProps["items"] = [
    {
      key: "1",
      label: "가입자",
      children: (
        <div className="flex gap-12">
          <div className="w-[600px] h-[600px]">
            <Chart
              type="bar"
              options={{
                plugins: {
                  datalabels: {
                    display: true,
                    color: "white",
                  },
                },
              }}
              data={{
                labels: Object.keys(userCountMap),
                datasets: [
                  {
                    label: "가입자 수",
                    data: Object.values(userCountMap),
                  },
                ],
              }}
            />
          </div>
          <div className="flex flex-col gap-4">
            {Object.entries(userCountMap).map(([type, count]) => {
              return (
                <div key={type}>
                  {type} : {count}
                </div>
              );
            })}
          </div>
        </div>
      ),
    },
    {
      key: "2",
      label: "공간",
      children: <Tabs defaultActiveKey="1" items={spaceItems} />,
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      <div className="flex gap-8">
        <Statistic title="총 가입자" value={data?.total.users} loading={isLoading} />
        <Statistic title="총 공간 수" value={data?.total.spaces} loading={isLoading} />
        <Statistic title="총 멤버 수" value={data?.total.profiles} loading={isLoading} />
      </div>
      <div className="flex items-center gap-4">
        <div>
          시작일
          <DatePicker onChange={(day) => setStartedAt(dayjs(day?.toDate()))} value={startedAt} />
        </div>
        <div>
          ~ 종료일
          <DatePicker onChange={(day) => setEndedAt(dayjs(day?.toDate()))} value={endedAt} />
        </div>
      </div>
      <div>
        <Tabs defaultActiveKey="1" items={items} />
      </div>
    </div>
  );
}

export default Dashboard;

function countSameCreatedAt(items: { createdAt: string }[]): { [key: string]: number } {
  const createdAtCounts: { [key: string]: number } = {};

  // createdAt 값을 기준으로 개수를 카운트
  items.forEach((item) => {
    const createdAt = item.createdAt;
    if (createdAtCounts[createdAt]) {
      createdAtCounts[createdAt]++;
    } else {
      createdAtCounts[createdAt] = 1;
    }
  });

  const sortedCounts: { [key: string]: number } = {};
  Object.keys(createdAtCounts)
    .sort()
    .forEach((key) => {
      sortedCounts[key] = createdAtCounts[key];
    });

  return sortedCounts;
}

function countItemsWithSameKey(items: { [key: string]: string }[], targetKey: string): { [key: string]: number } {
  const keyCounts: { [key: string]: number } = {};

  // targetKey를 기준으로 개수를 카운트
  items.forEach((item) => {
    const keyValue = item[targetKey];
    if (keyCounts[keyValue]) {
      keyCounts[keyValue]++;
    } else {
      keyCounts[keyValue] = 1;
    }
  });

  const sortedCounts: { [key: string]: number } = {};
  Object.keys(keyCounts)
    .sort()
    .forEach((key) => {
      sortedCounts[key] = keyCounts[key];
    });

  return sortedCounts;
}
