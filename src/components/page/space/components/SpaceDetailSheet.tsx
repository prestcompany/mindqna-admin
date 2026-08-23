import { getSpace } from '@/client/space';
import { Space, SpaceDetail } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Sheet } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import SpaceDetailContent from './SpaceDetailContent';
import SpaceEditPanel from './SpaceEditPanel';
import SpaceIdentityStrip from './SpaceIdentityStrip';
import SpaceActivitySummary from './tabs/SpaceActivitySummary';
import SpaceActivityTab from './tabs/SpaceActivityTab';
import SpaceCardEligibilityPanel from './tabs/SpaceCardEligibilityPanel';
import SpaceCardsTab from './tabs/SpaceCardsTab';
import SpaceCoinsTab from './tabs/SpaceCoinsTab';
import SpaceDiariesTab from './tabs/SpaceDiariesTab';
import SpaceMembersTab from './tabs/SpaceMembersTab';
import SpacePetInteriorTab from './tabs/SpacePetInteriorTab';
import SpaceSchedulesTab from './tabs/SpaceSchedulesTab';

interface SpaceDetailSheetProps {
  open: boolean;
  space: Space | null;
  onClose: () => void;
  copyId: (id: string) => void;
  /** Which tab to land on the next time this sheet opens. Defaults to 개요. */
  initialTab?: string;
  /** Threaded down to the members tab so profile removal — with its existing confirm
   * dialog — keeps a path once SpaceProfileModal is gone. Optional: SpaceSearch.tsx
   * renders this sheet too, without a wired-up removal flow of its own (see report). */
  onRemoveProfile?: (profileId: string, nickname: string) => void;
}

function SpaceDetailSheet({ open, space, onClose, copyId, initialTab, onRemoveProfile }: SpaceDetailSheetProps) {
  const spaceId = space?.id;
  const [tab, setTab] = useState(initialTab ?? 'overview');
  // A mode of this sheet, not a second overlay stacked on top of it — the body swaps
  // between the tab strip and the edit rows, and only one of them is ever mounted.
  const [editOpen, setEditOpen] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['space-detail', spaceId],
    queryFn: () => getSpace(spaceId as string),
    enabled: open && !!spaceId,
  });
  // 다른 공간을 열면 항상 initialTab(기본값 개요)부터 보이고, 편집 모드도 초기화한다.
  useEffect(() => {
    setTab(initialTab ?? 'overview');
    setEditOpen(false);
  }, [spaceId, initialTab]);

  const detail: SpaceDetail | null = data ?? (space ? ({ ...space, recentCoinMetas: [] } as SpaceDetail) : null);
  if (!detail) return null;
  const id = detail.id;

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminSideSheetContent
        title={detail.spaceInfo?.name ?? '공간 상세'}
        size={editOpen ? 'md' : 'xl'}
        bodyClassName={editOpen ? 'overflow-hidden p-0' : undefined}
      >
        {editOpen ? (
          <SpaceEditPanel detail={detail} onCancel={() => setEditOpen(false)} onSaved={() => setEditOpen(false)} />
        ) : (
          <Tabs value={tab} onValueChange={setTab} className='w-full'>
            {/* 기본 shadcn 세그먼트 룩 유지 + 좁은 폭에서는 가로 스크롤(줄바꿈으로 세그먼트가 깨지지 않게) */}
            <div className='mb-4 overflow-x-auto'>
              <TabsList>
                <TabsTrigger value='overview'>개요</TabsTrigger>
                <TabsTrigger value='members'>멤버</TabsTrigger>
                <TabsTrigger value='cards'>카드/답변</TabsTrigger>
                <TabsTrigger value='coins'>재화 내역</TabsTrigger>
                <TabsTrigger value='diaries'>일기</TabsTrigger>
                <TabsTrigger value='schedules'>일정</TabsTrigger>
                <TabsTrigger value='pet'>펫/인테리어</TabsTrigger>
                <TabsTrigger value='activity'>활동로그</TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value='overview'>
              {isLoading && !data ? (
                <div className='flex min-h-[320px] items-center justify-center'>
                  <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
                </div>
              ) : (
                <div className='space-y-6'>
                  <SpaceIdentityStrip detail={detail} copyId={copyId} onEdit={() => setEditOpen(true)} />
                  <SpaceActivitySummary spaceId={id} active={tab === 'overview'} />
                  <SpaceCardEligibilityPanel spaceId={id} active={tab === 'overview'} detail={detail} />
                  <SpaceDetailContent detail={detail} copyId={copyId} />
                </div>
              )}
            </TabsContent>
            <TabsContent value='members'>
              <SpaceMembersTab spaceId={id} active={tab === 'members'} copyId={copyId} onRemoveProfile={onRemoveProfile} />
            </TabsContent>
            <TabsContent value='cards'>
              <SpaceCardsTab spaceId={id} active={tab === 'cards'} />
            </TabsContent>
            <TabsContent value='coins'>
              <SpaceCoinsTab spaceId={id} active={tab === 'coins'} />
            </TabsContent>
            <TabsContent value='diaries'>
              <SpaceDiariesTab spaceId={id} active={tab === 'diaries'} />
            </TabsContent>
            <TabsContent value='schedules'>
              <SpaceSchedulesTab spaceId={id} active={tab === 'schedules'} />
            </TabsContent>
            <TabsContent value='pet'>
              <SpacePetInteriorTab spaceId={id} active={tab === 'pet'} />
            </TabsContent>
            <TabsContent value='activity'>
              <SpaceActivityTab spaceId={id} active={tab === 'activity'} />
            </TabsContent>
          </Tabs>
        )}
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default SpaceDetailSheet;
