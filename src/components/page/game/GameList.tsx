import { Game } from '@/client/game';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGames } from '@/hooks/useGame';
import { Button, Modal, Table, TableProps, Tag } from 'antd';
import { useRouter } from 'next/router';
import { useState } from 'react';
import GameFormModal from './GameFormModal';

function GameList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useGames({ page: currentPage });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const [selectedGame, setSelectedGame] = useState<Game | undefined>(undefined);

  const columns: TableProps<Game>['columns'] = [
    {
      title: 'No.',
      dataIndex: 'id',
      key: 'id',
    },

    {
      title: '게임명',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '게임 타입',
      dataIndex: 'type',
      key: 'type',
      render: (value) => {
        return <Tag color='black'>{value}</Tag>;
      },
    },

    {
      title: '라이프',
      dataIndex: 'playLimitLife',
      key: 'playLimitLife',
      render: (value) => {
        return <Tag color='pink-inverse'>{value} 개</Tag>;
      },
    },
    {
      title: '제한시간',
      dataIndex: 'timeLimitSecond',
      key: 'timeLimitSecond',
      render: (value) => {
        return <Tag>{value} 초</Tag>;
      },
    },
    {
      title: '일일 플레이 제한',
      dataIndex: 'dailyPlayLimit',
      key: 'dailyPlayLimit',
      render: (value) => {
        return <Tag color='blue'>{value} 회</Tag>;
      },
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value) => {
        if (value) return <Tag color='green'>활성</Tag>;
        if (!value) return <Tag color='red'>비활성</Tag>;
      },
    },
    {
      title: '',
      dataIndex: '',
      key: 'x',
      render: (value, record) => (
        <div className='flex gap-4'>
          <Button
            onClick={() => {
              setOpenEdit(true);
              setSelectedGame(record);
            }}
          >
            수정
          </Button>
        </div>
      ),
    },
  ];

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedGame(undefined); // 선택된 게임 데이터 초기화
  };
  return (
    <>
      {holder}
      <DefaultTableBtn className='justify-between'>
        <div className='flex-item-list'></div>
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
      <GameFormModal isOpen={isOpenCreate} close={() => setOpenCreate(false)} refetch={refetch} />
      <GameFormModal isOpen={isOpenEdit} close={handleCloseEdit} game={selectedGame} refetch={refetch} />
    </>
  );
}

export default GameList;
