import { Game, GameRewardPolicy } from '@/client/game';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/shared/ui/data-table';
import { useGameRewardPolicies } from '@/hooks/useGame';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import GameRewardPolicyModal from './GameRewardPolicyModal';

function GameRewardPolicyList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { items, totalPage, isLoading, refetch } = useGameRewardPolicies({ page: currentPage });

  const [selectedGameRewardPolicy, setSelectedGameRewardPolicy] = useState<GameRewardPolicy | undefined>(undefined);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const columns: ColumnDef<GameRewardPolicy>[] = [
    {
      accessorKey: 'id',
      header: 'No.',
      size: 80,
    },
    {
      accessorKey: 'game',
      header: '게임명',
      size: 250,
      cell: ({ row }) => {
        const game = row.original.game as Game;
        return <Badge style={game ? { backgroundColor: game.primaryKeyColor, color: '#fff' } : undefined}>{game ? game.name : '전체 랭킹'}</Badge>;
      },
    },
    {
      id: 'actions',
      header: '관리',
      size: 90,
      cell: ({ row }) => {
        return (
          <TableRowActions
            items={[
              {
                label: '정책 수정',
                onClick: () => {
                  setSelectedGameRewardPolicy(row.original);
                  setOpenEdit(true);
                },
              },
            ]}
          />
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      size: 80,
      cell: ({ row }) => {
        const isActive = row.original.isActive;
        return <Badge variant={isActive ? 'success' : 'destructive'}>{isActive ? '활성' : '비활성'}</Badge>;
      },
    },
  ];

  return (
    <>
      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        rowKey={(record) => record.id.toString()}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          onChange: (page) => setCurrentPage(page),
        }}
      />
      <GameRewardPolicyModal
        isOpen={isOpenEdit}
        close={() => setOpenEdit(false)}
        refetch={refetch}
        gameRewardPolicy={selectedGameRewardPolicy}
      />
    </>
  );
}

export default GameRewardPolicyList;
