import { Game, GamePlay } from '@/client/game';
import { Profile, Space } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import DataTable from '@/components/shared/ui/data-table';
import { useGamePlays } from '@/hooks/useGame';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useState } from 'react';

function GamePlayList() {
  const [currentPage, setCurrentPage] = useState(1);
  const { items, totalPage, isLoading } = useGamePlays({ page: currentPage });

  const columns: ColumnDef<GamePlay>[] = [
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
        return <Badge style={{ backgroundColor: game.primaryKeyColor, color: '#fff' }}>{game.name}</Badge>;
      },
    },
    {
      accessorKey: 'profile',
      header: '닉네임',
      size: 200,
      cell: ({ row }) => {
        const profile = row.original.profile as Profile;
        return profile.nickname;
      },
    },
    {
      accessorKey: 'score',
      header: '획득 점수',
      size: 200,
      cell: ({ row }) => {
        if (!row.original.endedAt) return '-';
        return `${row.original.score} P`;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '시작시간',
      size: 200,
      cell: ({ row }) => {
        const day = dayjs(row.original.createdAt);
        return day.format('YYYY-MM-DD HH:mm');
      },
    },
    {
      accessorKey: 'endedAt',
      header: '종료시간',
      size: 200,
      cell: ({ row }) => {
        const endedAt = row.original.endedAt;
        if (!endedAt) return '-';
        return dayjs(endedAt).format('YYYY-MM-DD HH:mm');
      },
    },
    {
      accessorKey: 'space',
      header: '공간 ID',
      cell: ({ row }) => {
        const space = row.original.space as Space;
        return <span className='font-mono text-foreground'>{space.id}</span>;
      },
    },
  ];

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
    </>
  );
}

export default GamePlayList;
