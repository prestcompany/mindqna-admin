import { Game, GameRanking } from '@/client/game';
import { Profile, Space } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/shared/ui/data-table';
import { FILTER_CONTROL_CLASS, FilterBar } from '@/components/shared/ui/filter-bar';
import { useGameRankingRewardCreate, useGameRankings, useGames } from '@/hooks/useGame';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

function GameRankingList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ gameId?: number; year?: number; month?: number; week?: number }>({});
  const { items, totalPage, isLoading } = useGameRankings({ page: currentPage, ...filter });
  const { items: games } = useGames({ page: 1 });
  const { mutate } = useGameRankingRewardCreate();

  const handleRewardCreate = () => {
    mutate();
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = [{ value: currentYear, label: `${currentYear}년` }];

  const monthOptions = Array.from({ length: 12 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}월`,
  }));

  const weekOptions = Array.from({ length: 53 }, (_, i) => ({
    value: i + 1,
    label: `${i + 1}주차`,
  }));

  const columns: ColumnDef<GameRanking>[] = [
    {
      accessorKey: 'rank',
      header: '순위',
      size: 80,
      cell: ({ row }) => {
        const rank = row.original.rank;
        return <Badge variant={rank <= 5 ? 'softWarning' : 'softNeutral'}>{rank}</Badge>;
      },
    },
    {
      accessorKey: 'game',
      header: '게임',
      size: 150,
      cell: ({ row }) => {
        const game = row.original.game as Game;
        return <Badge style={{ backgroundColor: game.primaryKeyColor, color: '#fff' }}>{game.name}</Badge>;
      },
    },
    {
      accessorKey: 'year',
      header: '연도',
      size: 80,
      cell: ({ row }) => {
        return `${row.original.year}년`;
      },
    },
    {
      accessorKey: 'month',
      header: '월',
      size: 80,
      cell: ({ row }) => {
        return `${row.original.month}월`;
      },
    },
    {
      accessorKey: 'week',
      header: '주차',
      size: 80,
      cell: ({ row }) => {
        return `${row.original.week}주차`;
      },
    },
    {
      accessorKey: 'profile',
      header: '닉네임',
      size: 150,
      cell: ({ row }) => {
        const profile = row.original.profile as Profile;
        return profile.nickname;
      },
    },
    {
      accessorKey: 'bestScore',
      header: '점수',
      size: 150,
      cell: ({ row }) => {
        const score = (row.original as GameRanking & { bestScore?: number }).bestScore ?? row.original.score;
        return `${score.toLocaleString()} P`;
      },
    },
    {
      accessorKey: 'space',
      header: '공간 ID',
      size: 150,
      cell: ({ row }) => {
        const space = row.original.space as Space;
        return <span className='font-mono text-foreground'>{space.id}</span>;
      },
    },
  ];
  return (
    <>
      <FilterBar>
        <ShadSelect
          value={filter.gameId?.toString() ?? '__all__'}
          onValueChange={(v) => {
            setFilter({ ...filter, gameId: v === '__all__' ? undefined : Number(v) });
          }}
        >
          <SelectTrigger className={`w-[200px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='게임' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>전체</SelectItem>
            {games?.map((game) => (
              <SelectItem key={game.id} value={game.id.toString()}>
                {game.name}
              </SelectItem>
            ))}
          </SelectContent>
        </ShadSelect>
        <ShadSelect
          value={filter.year?.toString() ?? '__all__'}
          onValueChange={(v) => {
            setFilter({ ...filter, year: v === '__all__' ? undefined : Number(v) });
          }}
        >
          <SelectTrigger className={`w-[120px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='연도' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>전체</SelectItem>
            {yearOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </ShadSelect>
        <ShadSelect
          value={filter.month?.toString() ?? '__all__'}
          onValueChange={(v) => {
            setFilter({ ...filter, month: v === '__all__' ? undefined : Number(v) });
          }}
        >
          <SelectTrigger className={`w-[100px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='월' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>전체</SelectItem>
            {monthOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </ShadSelect>
        <ShadSelect
          value={filter.week?.toString() ?? '__all__'}
          onValueChange={(v) => {
            setFilter({ ...filter, week: v === '__all__' ? undefined : Number(v) });
          }}
        >
          <SelectTrigger className={`w-[100px] ${FILTER_CONTROL_CLASS}`}>
            <SelectValue placeholder='주차' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='__all__'>전체</SelectItem>
            {weekOptions.map((opt) => (
              <SelectItem key={opt.value} value={opt.value.toString()}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </ShadSelect>
        <div className='flex-1' />
        <Button variant='outline' onClick={handleRewardCreate} className={FILTER_CONTROL_CLASS}>
          랭킹 보상 지급
        </Button>
      </FilterBar>

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

export default GameRankingList;
