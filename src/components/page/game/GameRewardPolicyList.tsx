import { Game, GameRewardCondition, GameRewardPolicy } from '@/client/game';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGameRewardPolicies } from '@/hooks/useGame';
import { Modal, Table, TableProps, Tag } from 'antd';
import { Button } from 'antd/lib';
import { useRouter } from 'next/router';
import { useState } from 'react';
import GameRewardPolicyModal from './GameRewardPolicyModal';

function GameRewardPolicyList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useGameRewardPolicies({ page: currentPage });

  const [selectedGameRewardPolicy, setSelectedGameRewardPolicy] = useState<GameRewardPolicy | undefined>(undefined);
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
      render: (condition: GameRewardCondition, record: GameRewardPolicy) => {
        return (
          <Button
            onClick={() => {
              setSelectedGameRewardPolicy(record);
              setOpenEdit(true);
            }}
          >
            정책 수정
          </Button>
        );
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
        rowKey={(record) => record.id}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
        loading={isLoading}
      />
      <GameRewardPolicyModal isOpen={isOpenEdit} close={() => setOpenEdit(false)} refetch={refetch} gameRewardPolicy={selectedGameRewardPolicy} />
    </>
  );
}

export default GameRewardPolicyList;
