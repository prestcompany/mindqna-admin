import { getSpaceDiary } from '@/client/space';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';

function SpaceDiaryDetail({ spaceId, diaryId }: { spaceId: string; diaryId: number }) {
  const { data, isFetching } = useQuery({
    queryKey: ['space-diary', spaceId, diaryId],
    queryFn: () => getSpaceDiary(spaceId, diaryId),
    enabled: !!spaceId && !!diaryId,
  });
  if (isFetching && !data) {
    return (
      <div className='flex min-h-[64px] items-center justify-center'>
        <Loader2 className='h-4 w-4 animate-spin text-muted-foreground' />
      </div>
    );
  }
  if (!data) return null;
  return <p className='whitespace-pre-wrap break-words text-sm text-slate-600'>{data.content || '내용 없음'}</p>;
}

export default SpaceDiaryDetail;
