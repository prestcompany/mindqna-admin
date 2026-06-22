import { getSpacePetInterior } from '@/client/space';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { useQuery } from '@tanstack/react-query';
import { ImageOff, Loader2 } from 'lucide-react';
import { getPetTypeLabel } from '../../utils/space-display';

const ROOM_CATEGORY_LABEL: Record<string, string> = { rooftop: '옥상', inner: '실내', outer: '실외' };
const INTERIOR_TYPE_LABEL: Record<string, string> = {
  item: '소품',
  wall: '벽지',
  floor: '바닥',
  todayFrame: '오늘의 액자',
  event: '이벤트',
};
const CUSTOM_TYPE_LABEL: Record<string, string> = { effect: '이펙트', closet: '의상', buddy: '버디' };

function Thumb({ uri, alt }: { uri?: string | null; alt: string }) {
  if (!uri) {
    return (
      <div className='flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400'>
        <ImageOff className='h-4 w-4' />
      </div>
    );
  }
  // 인테리어/커스텀 템플릿 이미지는 서버 업로드(public)라 직접 표시한다.
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={uri} alt={alt} className='h-12 w-12 shrink-0 rounded-lg border border-slate-200/80 object-cover' />;
}

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
  const equippedCustoms = data.customs.filter((c) => c.isEquipped);

  return (
    <div className='space-y-6'>
      {/* 펫 */}
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>펫</h3>
        <div className='rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm'>
          {data.pet ? (
            <div className='flex flex-wrap items-center gap-x-3 gap-y-1'>
              <span className='font-medium text-slate-900'>{getPetTypeLabel(data.pet.type) ?? '-'}</span>
              <span className='tabular-nums text-slate-600'>Lv.{data.pet.level}</span>
              <span className='tabular-nums text-slate-500'>EXP {data.pet.exp.toFixed(1)}</span>
            </div>
          ) : (
            <span className='text-sm text-slate-500'>펫 정보가 없습니다.</span>
          )}
          {data.customs.length ? (
            <div className='mt-3 border-t border-slate-100 pt-3'>
              <div className='mb-2 text-xs font-medium text-slate-500'>
                커스텀 {data.customs.length} · 장착 {equippedCustoms.length}
              </div>
              <div className='flex flex-wrap gap-1.5'>
                {data.customs.map((c) => (
                  <span
                    key={c.id}
                    className={
                      c.isEquipped
                        ? 'inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700'
                        : 'inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600'
                    }
                  >
                    {c.template?.name || CUSTOM_TYPE_LABEL[c.customType] || c.customType}
                    {c.isEquipped ? ' · 장착' : ''}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {/* 인테리어 보유 목록 */}
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>인테리어 {data.interiorItems.length}</h3>
        {data.interiorItems.length ? (
          <div className='grid grid-cols-1 gap-2 sm:grid-cols-2'>
            {data.interiorItems.map((item) => (
              <div
                key={item.id}
                className='flex items-center gap-3 rounded-xl border border-slate-200/80 bg-white px-3 py-2.5 shadow-sm'
              >
                <Thumb uri={item.template?.img?.uri} alt={item.template?.name ?? '인테리어'} />
                <div className='min-w-0 flex-1'>
                  <div className='truncate text-sm font-medium text-slate-900'>
                    {item.template?.name ?? `#${item.interiorTemplateId}`}
                  </div>
                  <div className='mt-0.5 flex flex-wrap items-center gap-1'>
                    {item.template?.type ? (
                      <Badge variant='softNeutral'>{INTERIOR_TYPE_LABEL[item.template.type] ?? item.template.type}</Badge>
                    ) : null}
                    {item.template?.category ? (
                      <span className='text-xs text-slate-500'>{item.template.category}</span>
                    ) : null}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <Card className='bg-card'>
            <CardContent className='py-6 text-center text-sm text-muted-foreground'>보유한 인테리어가 없습니다.</CardContent>
          </Card>
        )}
      </section>

      {/* 방 */}
      <section className='space-y-2'>
        <h3 className='text-base font-semibold text-slate-900'>방 {data.rooms.length}</h3>
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
    </div>
  );
}

export default SpacePetInteriorTab;
