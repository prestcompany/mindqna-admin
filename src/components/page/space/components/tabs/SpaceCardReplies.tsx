import { getSpaceCardReplies } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';

function SpaceCardReplies({ spaceId, cardId }: { spaceId: string; cardId: number }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-card-replies', spaceId, cardId],
    queryFn: () => getSpaceCardReplies(spaceId, cardId),
    enabled: !!spaceId && !!cardId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[64px] items-center justify-center'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  return (
    <div className='space-y-3'>
      <div className='rounded-lg bg-slate-50 px-3 py-2'>
        <div className='text-[11px] font-medium text-slate-500'>질문</div>
        <div className='text-sm font-medium text-slate-900'>{data.templateName ?? `카드 #${data.order}`}</div>
      </div>
      {data.replies.length ? (
        <div className='space-y-2'>
          {data.replies.map((reply) => (
            <div key={reply.id} className='rounded-lg border border-slate-200/80 bg-white px-3 py-2'>
              <div className='flex items-center justify-between gap-2'>
                <span className='text-sm font-medium text-slate-900'>{reply.profile?.nickname ?? '-'}</span>
                <span className='text-[11px] text-slate-500'>{dayjs(reply.createdAt).format('YY.MM.DD HH:mm')}</span>
              </div>
              <p className='mt-1 whitespace-pre-wrap break-words text-sm text-slate-600'>{reply.content}</p>
            </div>
          ))}
        </div>
      ) : (
        <div className='px-1 text-sm text-slate-500'>아직 답변이 없습니다.</div>
      )}
    </div>
  );
}

export default SpaceCardReplies;
