import { Game, GameReward, GameRewardCondition } from '@/client/game';
import { Profile, Space } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGameRewards, useGames } from '@/hooks/useGame';
import { Drawer, Modal, Select, Table, TableProps, Tag } from 'antd';
import { useRouter } from 'next/router';
import { useState } from 'react';

function GameRewardList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ gameId?: number; year?: number; month?: number; week?: number }>({});
  const { items, totalPage, isLoading, refetch } = useGameRewards({ page: currentPage, ...filter });
  const { items: games } = useGames({ page: 1 });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = [{ value: currentYear, label: `${currentYear}년` }];

  // 월 옵션
  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}월`,
  }));

  // 주차 옵션
  const weekOptions = Array.from({ length: 53 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}주차`,
  }));

  const columns: TableProps<GameReward>['columns'] = [
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      render: (id: number, _, index) => {
        return <span>{(index + 1) * currentPage}</span>;
      },
    },
    {
      title: '게임',
      dataIndex: 'game',
      key: 'game.name',
      width: 150,
      render: (game: Game) => {
        return <Tag color={game.primaryKeyColor}>{game.name}</Tag>;
      },
    },
    {
      title: '닉네임',
      dataIndex: 'profile',
      key: 'profile.nickname',
      width: 200,
      render: (profile: Profile) => {
        return (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <Tag color='black'>{profile.nickname}</Tag>
          </div>
        );
      },
    },
    {
      title: '월',
      dataIndex: 'week',
      key: 'week',
      width: 50,
      render: (week: number, record: GameReward) => {
        return <Tag>{record.month}월</Tag>;
      },
    },
    {
      title: '주차',
      dataIndex: 'week',
      key: 'week',
      width: 50,
      render: (week: number, record: GameReward) => {
        return <Tag>{week}주차</Tag>;
      },
    },
    {
      title: '순위',
      dataIndex: 'condition',
      key: 'condition.rank',
      width: 50,
      render: (condition: GameRewardCondition) => {
        return <Tag>{condition.rank}위</Tag>;
      },
    },
    {
      title: '달성 점수',
      dataIndex: 'condition',
      key: 'condition.score',
      width: 120,
      render: (condition: GameRewardCondition) => {
        return <Tag>{condition.score.toLocaleString()}점</Tag>;
      },
    },
    {
      title: '획득 보상',
      dataIndex: 'heartsEarned',
      key: 'heartsEarned',
      width: 120,
      render: (heartsEarned: number) => {
        return <Tag color='red-inverse'>{heartsEarned} 하트</Tag>;
      },
    },
    {
      title: '보상 확인',
      dataIndex: 'isRead',
      key: 'isRead',
      width: 120,
      render: (isRead: boolean) => {
        return <Tag color={isRead ? 'green' : 'red'}>{isRead ? '확인' : '미확인'}</Tag>;
      },
    },
    {
      title: '공간 ID',
      dataIndex: 'space',
      key: 'space.id',
      render: (space: Space) => {
        return <Tag>{space.id}</Tag>;
      },
    },
  ];

  return (
    <>
      {holder}
      <DefaultTableBtn className='justify-between'>
        <div className='flex items-center gap-2 py-4'>
          <Select
            placeholder='게임'
            style={{ width: 200 }}
            options={[
              { value: '', label: '전체' },
              ...(games?.map((game) => ({
                value: game.id,
                label: game.name,
              })) || []),
            ]}
            onChange={(v: number) => {
              setFilter({ ...filter, gameId: v });
            }}
          />
          <Select
            placeholder='연도'
            options={[{ value: '', label: '전체' }, ...yearOptions]}
            style={{ width: 120 }}
            onChange={(v: number) => {
              setFilter({ ...filter, year: v });
            }}
          />
          <Select
            placeholder='월'
            options={[{ value: '', label: '전체' }, ...monthOptions]}
            style={{ width: 100 }}
            onChange={(v: number) => {
              setFilter({ ...filter, month: v });
            }}
          />
          <Select
            placeholder='주차'
            options={[{ value: '', label: '전체' }, ...weekOptions]}
            style={{ width: 100 }}
            onChange={(v: number) => {
              setFilter({ ...filter, week: v });
            }}
          />
        </div>
      </DefaultTableBtn>

      <Table
        dataSource={items}
        columns={columns}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
        loading={isLoading}
      />
      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={600}></Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}></Drawer>
    </>
  );
}

export default GameRewardList;
