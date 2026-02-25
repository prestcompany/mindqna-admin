import { Game, GameReward, GameRewardCondition } from '@/client/game';
import { Profile, Space } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Select as ShadSelect, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGameRewards, useGames } from '@/hooks/useGame';
import { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';

function GameRewardList() {
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ gameId?: number; year?: number; month?: number; week?: number }>({});
  const { items, totalPage, isLoading } = useGameRewards({ page: currentPage, ...filter });
  const { items: games } = useGames({ page: 1 });

  const getRewardRankLabel = (condition: GameRewardCondition) => {
    const legacyCondition = condition as GameRewardCondition & { rank?: number };
    if (typeof legacyCondition.rank === 'number') {
      return `${legacyCondition.rank}위`;
    }

    if (condition.rangeRank?.rankStart && condition.rangeRank?.rankEnd) {
      return `${condition.rangeRank.rankStart}~${condition.rangeRank.rankEnd}위`;
    }

    const firstIndividualRank = Object.values(condition.individualRanks || {})[0]?.rank;
    if (typeof firstIndividualRank === 'number') {
      return `${firstIndividualRank}위`;
    }

    return '-';
  };

  const getRewardScoreLabel = (condition: GameRewardCondition) => {
    const legacyCondition = condition as GameRewardCondition & { score?: number };
    if (typeof legacyCondition.score === 'number') {
      return `${legacyCondition.score.toLocaleString()}점`;
    }
    return '-';
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

  const columns: ColumnDef<GameReward>[] = [
    {
      accessorKey: 'id',
      header: 'No.',
      size: 80,
      cell: ({ row }) => {
        return <span>{(currentPage - 1) * 10 + row.index + 1}</span>;
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
      accessorKey: 'profile',
      header: '닉네임',
      size: 200,
      cell: ({ row }) => {
        const profile = row.original.profile as Profile;
        return (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <Badge variant='default'>{profile.nickname}</Badge>
          </div>
        );
      },
    },
    {
      id: 'month',
      accessorKey: 'week',
      header: '월',
      size: 50,
      cell: ({ row }) => {
        return <Badge variant='secondary'>{row.original.month}월</Badge>;
      },
    },
    {
      id: 'week',
      accessorKey: 'week',
      header: '주차',
      size: 50,
      cell: ({ row }) => {
        return <Badge variant='secondary'>{row.original.week}주차</Badge>;
      },
    },
    {
      id: 'condition.rank',
      header: '순위',
      size: 50,
      cell: ({ row }) => {
        const condition = row.original.condition as GameRewardCondition;
        return <Badge variant='secondary'>{getRewardRankLabel(condition)}</Badge>;
      },
    },
    {
      id: 'condition.score',
      header: '달성 점수',
      size: 120,
      cell: ({ row }) => {
        const condition = row.original.condition as GameRewardCondition;
        return <Badge variant='secondary'>{getRewardScoreLabel(condition)}</Badge>;
      },
    },
    {
      accessorKey: 'heartsEarned',
      header: '획득 보상',
      size: 120,
      cell: ({ row }) => {
        return <Badge variant='destructive'>{row.original.heartsEarned} 하트</Badge>;
      },
    },
    {
      accessorKey: 'isRead',
      header: '보상 확인',
      size: 120,
      cell: ({ row }) => {
        const isRead = Boolean(row.original.isRead);
        return <Badge variant={isRead ? 'success' : 'destructive'}>{isRead ? '확인' : '미확인'}</Badge>;
      },
    },
    {
      accessorKey: 'space',
      header: '공간 ID',
      cell: ({ row }) => {
        const space = row.original.space as Space;
        return <Badge variant='secondary'>{space.id}</Badge>;
      },
    },
  ];

  return (
    <>
      <DefaultTableBtn className='justify-between'>
        <div className='flex items-center gap-2 py-4'>
          <ShadSelect
            value={filter.gameId?.toString() ?? '__all__'}
            onValueChange={(v) => {
              setFilter({ ...filter, gameId: v === '__all__' ? undefined : Number(v) });
            }}
          >
            <SelectTrigger className='w-[200px]'>
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
            <SelectTrigger className='w-[120px]'>
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
            <SelectTrigger className='w-[100px]'>
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
            <SelectTrigger className='w-[100px]'>
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
        </div>
      </DefaultTableBtn>

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

export default GameRewardList;
