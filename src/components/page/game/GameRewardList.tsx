import { Game, GameReward, GameRewardCondition } from '@/client/game';
import { Profile, Space } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGameRewards } from '@/hooks/useGame';
import { Drawer, Modal, Table, TableProps, Tag } from 'antd';
import { useRouter } from 'next/router';
import { useState } from 'react';

function GameRewardList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useGameRewards({ page: currentPage });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  console.log(items);

  const columns: TableProps<GameReward>['columns'] = [
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id',
      width: 80,
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
      title: '주차',
      dataIndex: 'week',
      key: 'week',
      width: 50,
      render: (week: number, record: GameReward) => {
        return (
          <Tag>
            {record.month}월 {week}주차
          </Tag>
        );
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
        return <Tag>{heartsEarned} 하트</Tag>;
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
      <DefaultTableBtn className='justify-between'></DefaultTableBtn>

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
