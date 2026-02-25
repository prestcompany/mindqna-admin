import { Game, GamePlay } from '@/client/game';
import { Profile, Space } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import DataTable from '@/components/shared/ui/data-table';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import { useGamePlays } from '@/hooks/useGame';
import { ColumnDef } from '@tanstack/react-table';
import dayjs from 'dayjs';
import { useRouter } from 'next/router';
import { useState } from 'react';

function GamePlayList() {
  const router = useRouter();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useGamePlays({ page: currentPage });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

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
        return (
          <div style={{ display: 'flex', flexDirection: 'row', gap: '4px' }}>
            <Badge variant='default'>{profile.nickname}</Badge>
          </div>
        );
      },
    },
    {
      accessorKey: 'score',
      header: '획득 점수',
      size: 200,
      cell: ({ row }) => {
        if (!row.original.endedAt) return <Badge variant='warning'>-</Badge>;
        return <Badge variant='success'>{row.original.score} P</Badge>;
      },
    },
    {
      accessorKey: 'createdAt',
      header: '시작시간',
      size: 200,
      cell: ({ row }) => {
        const day = dayjs(row.original.createdAt);
        return <Badge variant='secondary'>{day.format('YYYY-MM-DD HH:mm')}</Badge>;
      },
    },
    {
      accessorKey: 'endedAt',
      header: '종료시간',
      size: 200,
      cell: ({ row }) => {
        const endedAt = row.original.endedAt;
        if (!endedAt) return <Badge variant='warning'>-</Badge>;
        const day = dayjs(endedAt);
        return <Badge variant='secondary'>{day.format('YYYY-MM-DD HH:mm')}</Badge>;
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
        <div className='flex-item-list'></div>
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
      <Sheet open={isOpenCreate} onOpenChange={(open) => !open && setOpenCreate(false)}>
        <SheetContent side='right' className='w-[600px] sm:max-w-none overflow-y-auto'>
          <SheetHeader><SheetTitle></SheetTitle></SheetHeader>
        </SheetContent>
      </Sheet>
      <Sheet open={isOpenEdit} onOpenChange={(open) => !open && setOpenEdit(false)}>
        <SheetContent side='right' className='w-[600px] sm:max-w-none overflow-y-auto'>
          <SheetHeader><SheetTitle></SheetTitle></SheetHeader>
        </SheetContent>
      </Sheet>
    </>
  );
}

export default GamePlayList;
