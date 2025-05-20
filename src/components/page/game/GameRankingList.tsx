import { Game, GameRanking } from '@/client/game';
import { Profile, Space } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGameRankingRewardCreate, useGameRankings, useGames } from '@/hooks/useGame';
import { Button, Drawer, Modal, Select, Table, TableProps, Tag } from 'antd';
import { useRouter } from 'next/router';
import { useState } from 'react';

function GameRankingList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ gameId?: number; year?: number; month?: number; week?: number }>({});
  const { items, totalPage, isLoading, refetch } = useGameRankings({ page: currentPage, ...filter });
  const { items: games } = useGames({ page: 1 });
  const { mutate, data } = useGameRankingRewardCreate();

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const handleRewardCreate = () => {
    mutate();
  };

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

  const columns: TableProps<GameRanking>['columns'] = [
    {
      title: '순위',
      dataIndex: 'rank',
      key: 'rank',
      width: 80,
      render: (rank) => {
        const color = rank <= 5 ? 'gold' : '';
        return <Tag color={color}>{rank}</Tag>;
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
      title: '연도',
      dataIndex: 'year',
      key: 'year',
      width: 80,
      render: (year) => {
        return <Tag>{year}년</Tag>;
      },
    },
    {
      title: '월',
      dataIndex: 'month',
      key: 'month',
      width: 80,
      render: (month) => {
        return <Tag>{month}월</Tag>;
      },
    },
    {
      title: '주차',
      dataIndex: 'week',
      key: 'week',
      width: 80,
      render: (week) => {
        return <Tag>{week}주차</Tag>;
      },
    },
    {
      title: '닉네임',
      dataIndex: 'profile',
      key: 'profile.nickname',
      width: 150,
      render: (profile: Profile) => {
        return (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <Tag color='black'>{profile.nickname}</Tag>
          </div>
        );
      },
    },

    {
      title: '점수',
      dataIndex: 'bestScore',
      key: 'bestScore',
      width: 150,
      render: (bestScore) => {
        return <Tag color='green'>{bestScore.toLocaleString()} P</Tag>;
      },
    },

    {
      title: '공간 ID',
      dataIndex: 'space',
      key: 'space.id',
      width: 150,
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
        <Button type='default' onClick={handleRewardCreate}>
          랭킹 보상 지급
        </Button>
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

export default GameRankingList;
