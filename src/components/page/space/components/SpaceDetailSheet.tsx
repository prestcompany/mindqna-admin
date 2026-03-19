import { getSpace } from '@/client/space';
import { Space, SpaceDetail } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import SpaceDetailContent from './SpaceDetailContent';

interface SpaceDetailSheetProps {
  open: boolean;
  space: Space | null;
  onClose: () => void;
  copyId: (id: string) => void;
}

function SpaceDetailSheet({ open, space, onClose, copyId }: SpaceDetailSheetProps) {
  const spaceId = space?.id;
  const { data, isLoading } = useQuery({
    queryKey: ['space-detail', spaceId],
    queryFn: () => getSpace(spaceId as string),
    enabled: open && !!spaceId,
  });

  const detail: SpaceDetail | null = data ?? (space ? ({ ...space, recentCoinMetas: [] } as SpaceDetail) : null);

  if (!detail) return null;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminSideSheetContent
        title={detail.spaceInfo?.name ?? '공간 상세'}
        description='리스트에서 보이던 핵심 정보와 최근 재화 이용 내역을 함께 확인합니다.'
        size='xl'
      >
        {isLoading && !data ? (
          <div className='flex min-h-[320px] items-center justify-center'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <SpaceDetailContent detail={detail} copyId={copyId} />
        )}
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default SpaceDetailSheet;
