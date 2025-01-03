import { Game, GamePlay } from '@/client/game';
import { Profile, Space } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGamePlays } from '@/hooks/useGame';
import { Button, Drawer, Modal, Table, TableProps, Tag } from 'antd';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useState } from 'react';

function GamePlayList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useGamePlays({ page: currentPage });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const columns: TableProps<GamePlay>['columns'] = [
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id',
      width: 80,
    },
    {
      title: '게임명',
      dataIndex: 'game',
      key: 'game.name',
      width: 250,
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
      title: '점수',
      dataIndex: 'score',
      key: 'score',
      width: 200,
      render: (score, gamePlay) => {
        if (!gamePlay.endedAt) return <Tag color='gold'>-</Tag>;
        return <Tag color='green'>{score} P</Tag>;
      },
    },
    {
      title: '시작시간',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 200,
      render: (createdAt) => {
        const day = dayjs(createdAt);

        return <Tag>{day.format('YYYY-MM-DD HH:mm')}</Tag>;
      },
    },
    {
      title: '종료시간',
      dataIndex: 'endedAt',
      key: 'endedAt',
      width: 200,
      render: (endedAt) => {
        if (!endedAt) return <Tag color='gold'>-</Tag>;
        const day = dayjs(endedAt);

        return <Tag>{day.format('YYYY-MM-DD HH:mm')}</Tag>;
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

export default GamePlayList;
