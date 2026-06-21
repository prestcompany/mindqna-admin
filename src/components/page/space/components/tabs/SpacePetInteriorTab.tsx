import { getSpacePetInterior } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { getPetTypeLabel } from '../../utils/space-display';

const ROOM_CATEGORY_LABEL: Record<string, string> = { rooftop: '옥상', inner: '실내', outer: '실외' };

function SpacePetInteriorTab({ spaceId, active }: { spaceId: string; active: boolean }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-pet-interior', spaceId],
    queryFn: () => getSpacePetInterior(spaceId),
    enabled: active && !!spaceId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[200px] items-center justify-center'>
        <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  const equippedCount = data.customs.filter((c) => c.isEquipped).length;
  return (
    <div className='space-y-6'>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>펫</h3>
        <div className='rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm'>
          {data.pet ? (
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
              <span className='font-medium text-slate-900'>{getPetTypeLabel(data.pet.type) ?? '-'}</span>
              <span className='tabular-nums text-slate-600'>Lv.{data.pet.level}</span>
              <span className='tabular-nums text-slate-500'>EXP {data.pet.exp.toFixed(1)}</span>
              <Badge variant='softNeutral'>커스텀 장착 {equippedCount}</Badge>
            </div>
          ) : (
            <span className='text-slate-500'>펫 정보가 없습니다.</span>
          )}
        </div>
      </section>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>방 ({data.rooms.length})</h3>
        {data.rooms.length ? (
          <div className='space-y-2'>
            {data.rooms.map((room) => (
              <div
                key={room.id}
                className='flex items-center justify-between rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm shadow-sm'
              >
                <span className='font-medium text-slate-900'>{room.name}</span>
                <Badge variant='softNeutral'>{ROOM_CATEGORY_LABEL[room.category] ?? room.category}</Badge>
              </div>
            ))}
          </div>
        ) : (
          <Card className='bg-card'>
            <CardContent className='py-6 text-center text-sm text-muted-foreground'>방 정보가 없습니다.</CardContent>
          </Card>
        )}
      </section>
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>인테리어 아이템</h3>
        <div className='rounded-xl border border-slate-200/80 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm'>
          배치된 아이템 <span className='font-semibold tabular-nums text-slate-900'>{data.interiorItems.length}</span>개
        </div>
      </section>
    </div>
  );
}

export default SpacePetInteriorTab;
