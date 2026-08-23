import { Game, GameType } from '@/client/game';
import TableRowActions from '@/components/shared/ui/table-row-actions';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/shared/ui/data-table';
import { useGames } from '@/hooks/useGame';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import GameFormSheet from './GameFormSheet';

function GameList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { items, totalPage, isLoading, refetch } = useGames({ page: currentPage });

  const [isOpenEdit, setOpenEdit] = useState(false);

  const [selectedGame, setSelectedGame] = useState<Game | undefined>(undefined);

  const gameTypeMap: Record<GameType, string> = {
    SPEED_MATH: '사칙연산 빨리하기',
    MEMORY_TAP: '기억하고 누르기',
    SEQUENCE_TAP: '따라 누르기',
    SEQUENCE_TAP_2: '따라 누르기 2',
    SWIPE_MATCH: '문지르기',
    DODGE_AND_COLLECT: '물건 피하고 재화 받기',
    ETC: '기타',
  };

  const columns: ColumnDef<Game>[] = [
    {
      accessorKey: 'id',
      header: 'No.',
    },
    {
      accessorKey: 'name',
      header: '게임명',
    },
    {
      accessorKey: 'type',
      header: '게임 타입',
      cell: ({ row }) => {
        const type = row.original.type;
        return <Badge variant='softNeutral'>{gameTypeMap[type] || type}</Badge>;
      },
    },
    {
      accessorKey: 'playLimitLife',
      header: '라이프',
      cell: ({ row }) => {
        return `${row.original.playLimitLife} 개`;
      },
    },
    {
      accessorKey: 'timeLimitSecond',
      header: '제한시간',
      cell: ({ row }) => {
        return `${row.original.timeLimitSecond} 초`;
      },
    },
    {
      accessorKey: 'dailyPlayLimit',
      header: '일일 플레이 제한',
      cell: ({ row }) => {
        return `${row.original.dailyPlayLimit} 회`;
      },
    },
    {
      accessorKey: 'isActive',
      header: '상태',
      cell: ({ row }) => {
        const value = row.original.isActive;
        if (value) return <Badge variant='dotSuccess'>활성</Badge>;
        if (!value) return <Badge variant='dotNeutral'>비활성</Badge>;
      },
    },
    {
      id: 'actions',
      header: '관리',
      cell: ({ row }) => (
        <TableRowActions
          items={[
            {
              label: '수정',
              onClick: () => {
                setOpenEdit(true);
                setSelectedGame(row.original);
              },
            },
          ]}
        />
      ),
    },
  ];

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setSelectedGame(undefined);
  };
  return (
    <>
      <DataTable
        columns={columns}
        data={items || []}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          page: currentPage,
          onChange: (page) => setCurrentPage(page),
        }}
      />
      <GameFormSheet isOpen={isOpenEdit} close={handleCloseEdit} game={selectedGame} refetch={refetch} />
    </>
  );
}

export default GameList;
