import { GameRanking } from '@/client/game';
import { Profile, Space } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGameRankings } from '@/hooks/useGame';
import { Button, Drawer, Modal, Table, TableProps, Tag } from 'antd';
import { useRouter } from 'next/router';
import { useState } from 'react';

function GameRankingList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useGameRankings({ page: currentPage });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

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
      dataIndex: 'score',
      key: 'score',
      width: 150,
      render: (score) => {
        return <Tag color='green'>{score} P</Tag>;
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
        <div className='flex-item-list'>
          <Button type='primary' onClick={() => router.push('/game/new')}>
            게임 생성
          </Button>
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

export default GameRankingList;
