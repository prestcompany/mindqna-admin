import { Game, GameRewardPolicy } from '@/client/game';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGameRewardPolicies } from '@/hooks/useGame';
import { Drawer, Modal, Table, TableProps, Tag } from 'antd';
import { Button } from 'antd/lib';
import { useRouter } from 'next/router';
import { useState } from 'react';

function GameRewardPolicyList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useGameRewardPolicies({ page: currentPage });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const columns: TableProps<GameRewardPolicy>['columns'] = [
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
      title: '정책',
      dataIndex: 'condition',
      key: 'condition',
      width: 100,
      render: (condition: any) => {
        return <Button>정책 보기</Button>;
      },
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      width: 80,
      render: (isActive: boolean) => {
        return <Tag color={isActive ? 'green' : 'red'}>{isActive ? '활성' : '비활성'}</Tag>;
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

export default GameRewardPolicyList;
