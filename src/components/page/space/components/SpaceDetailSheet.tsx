import { getSpace } from '@/client/space';
import { Space, SpaceCoinHistoryMeta, SpaceDetail } from '@/client/types';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Copy, Loader2 } from 'lucide-react';

interface SpaceDetailSheetProps {
  open: boolean;
  space: Space | null;
  onClose: () => void;
  copyId: (id: string) => void;
}

function formatDate(value?: string | null, format = 'YY.MM.DD HH:mm:ss') {
  if (!value) return '-';
  return dayjs(value).format(format);
}

function buildCoinMetaLabel(meta: SpaceCoinHistoryMeta) {
  const currencyLabel = meta.isPaid ? '스타' : '하트';
  const signedAmount = meta.amount > 0 ? `+${meta.amount}` : `${meta.amount}`;
  return `${currencyLabel} ${signedAmount}`;
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

  const hasPremiumMember = detail.hasPremiumMember ?? detail.profiles?.some((profile) => profile.isPremium);
  const hasGoldClubMember = detail.hasGoldClubMember ?? detail.profiles?.some((profile) => profile.isGoldClub);

  return (
    <Sheet open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <AdminSideSheetContent
        title={detail.spaceInfo?.name ?? '공간 상세'}
        description='공간 코드, 생성일, 멤버 상태, 최근 재화 이용 내역을 확인합니다.'
        size='xl'
      >
        {isLoading && !data ? (
          <div className='flex min-h-[320px] items-center justify-center'>
            <Loader2 className='h-5 w-5 animate-spin text-muted-foreground' />
          </div>
        ) : (
          <div className='space-y-6'>
            <div className='flex flex-wrap items-center gap-2'>
              <Badge variant='secondary'>{detail.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
              <Badge variant='info'>{detail.spaceInfo?.type ?? '-'}</Badge>
              {detail.isActive ? <Badge variant='success'>ACTIVE</Badge> : <Badge variant='muted'>INACTIVE</Badge>}
              {hasPremiumMember ? <Badge variant='success'>PREMIUM 포함</Badge> : null}
              {hasGoldClubMember ? <Badge variant='warning'>GOLD CLUB 포함</Badge> : null}
            </div>

            <div className='grid grid-cols-1 gap-3 xl:grid-cols-2'>
              <Card className='min-w-0 shadow-none'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>공간 기본 정보</CardTitle>
                </CardHeader>
                <CardContent className='space-y-3'>
                  <div className='flex flex-col gap-3 rounded-lg border bg-muted/20 px-3 py-3 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='min-w-0 flex-1'>
                      <div className='text-xs text-muted-foreground'>공간 코드</div>
                      <div className='break-all font-mono text-sm'>{detail.id}</div>
                    </div>
                    <Button
                      type='button'
                      variant='outline'
                      size='icon'
                      onClick={() => copyId(detail.id)}
                      className='h-8 w-8 shrink-0'
                    >
                      <Copy className='h-4 w-4' />
                    </Button>
                  </div>
                  <div className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3'>
                    <div className='min-w-0 rounded-lg border px-3 py-2'>
                      <div className='text-xs text-muted-foreground'>공간 이름</div>
                      <div className='mt-1 break-words font-medium'>{detail.spaceInfo?.name ?? '-'}</div>
                    </div>
                    <div className='min-w-0 rounded-lg border px-3 py-2'>
                      <div className='text-xs text-muted-foreground'>생성일</div>
                      <div className='mt-1 break-words font-medium'>{formatDate(detail.createdAt)}</div>
                    </div>
                    <div className='min-w-0 rounded-lg border px-3 py-2'>
                      <div className='text-xs text-muted-foreground'>카드 수</div>
                      <div className='mt-1 break-words font-medium'>{detail.cardOrder ?? 0}</div>
                    </div>
                    <div className='min-w-0 rounded-lg border px-3 py-2'>
                      <div className='text-xs text-muted-foreground'>마지막 카드 발급</div>
                      <div className='mt-1 break-words font-medium'>{formatDate(detail.latestCardIssuedAt)}</div>
                    </div>
                    <div className='min-w-0 rounded-lg border px-3 py-2'>
                      <div className='text-xs text-muted-foreground'>다음 카드 생성 기준</div>
                      <div className='mt-1 break-all font-medium'>{detail.cardGenDate ?? '-'}</div>
                    </div>
                    <div className='min-w-0 rounded-lg border px-3 py-2'>
                      <div className='text-xs text-muted-foreground'>삭제 예정일</div>
                      <div className='mt-1 break-words font-medium'>{formatDate(detail.dueRemovedAt)}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className='min-w-0 shadow-none'>
                <CardHeader className='pb-3'>
                  <CardTitle className='text-sm'>운영 지표</CardTitle>
                </CardHeader>
                <CardContent className='grid grid-cols-1 gap-3 text-sm sm:grid-cols-2'>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>하트 / 스타</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant='destructive'>하트 {detail.coin}</Badge>
                      <Badge variant='warning'>스타 {detail.coinPaid}</Badge>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>펫</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant='info'>EXP {detail.pet?.exp?.toFixed(1) ?? '0.0'}</Badge>
                      <Badge variant='secondary'>Lv.{detail.pet?.level ?? 0}</Badge>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>멤버 / 방</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant='default'>멤버 {detail.spaceInfo?.members ?? detail.profiles?.length ?? 0}</Badge>
                      <Badge variant='secondary'>방 {detail.rooms?.length ?? 0}</Badge>
                    </div>
                  </div>
                  <div className='min-w-0 rounded-lg border px-3 py-2'>
                    <div className='text-xs text-muted-foreground'>답변 / 인테리어</div>
                    <div className='mt-1 flex flex-wrap gap-2'>
                      <Badge variant='info'>답변 {detail.spaceInfo?.replies ?? 0}</Badge>
                      <Badge variant='secondary'>인테리어 {detail.InteriorItem?.length ?? 0}</Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className='min-w-0 shadow-none'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm'>멤버</CardTitle>
              </CardHeader>
              <CardContent className='space-y-3'>
                {detail.profiles?.length ? (
                  detail.profiles.map((profile) => {
                    const isOwner = profile.userId === detail.spaceInfo?.ownerId;

                    return (
                      <div
                        key={profile.id}
                        className='flex flex-col gap-3 rounded-lg border px-3 py-3 sm:flex-row sm:items-start sm:justify-between'
                      >
                        <div className='min-w-0 flex-1 space-y-1'>
                          <div className='flex flex-wrap items-center gap-2'>
                            <span className='truncate font-medium'>{profile.nickname}</span>
                            {isOwner ? <Badge variant='default'>OWNER</Badge> : null}
                            {profile.isPremium ? <Badge variant='success'>PREMIUM</Badge> : null}
                            {profile.isGoldClub ? <Badge variant='warning'>GOLD CLUB</Badge> : null}
                          </div>
                          <div className='break-all text-sm text-muted-foreground'>{profile.user?.username ?? '-'}</div>
                        </div>
                        <Button
                          type='button'
                          variant='ghost'
                          size='sm'
                          className='w-fit'
                          onClick={() => copyId(profile.user?.username ?? profile.id)}
                        >
                          복사
                        </Button>
                      </div>
                    );
                  })
                ) : (
                  <div className='text-sm text-muted-foreground'>멤버 정보가 없습니다.</div>
                )}
              </CardContent>
            </Card>

            <Card className='min-w-0 shadow-none'>
              <CardHeader className='pb-3'>
                <CardTitle className='text-sm'>최근 재화 이용 내역</CardTitle>
              </CardHeader>
              <CardContent className='p-0'>
                {detail.recentCoinMetas?.length ? (
                  <div className='max-h-[420px] overflow-y-auto px-6 pb-4'>
                    {detail.recentCoinMetas.map((meta, index) => {
                      const actorName = meta.profile?.nickname ?? meta.profile?.user?.username ?? '-';
                      return (
                        <div key={meta.id}>
                          <div className='flex flex-col gap-2 py-3 sm:flex-row sm:items-start sm:justify-between'>
                            <div className='min-w-0 flex-1 space-y-2'>
                              <div className='flex flex-wrap items-center gap-2'>
                                <Badge variant={meta.amount < 0 || meta.isUse ? 'warning' : 'success'}>
                                  {buildCoinMetaLabel(meta)}
                                </Badge>
                                <Badge variant='secondary'>{meta.isUse ? '사용' : '지급/획득'}</Badge>
                                <span className='truncate text-sm font-medium'>{actorName}</span>
                              </div>
                              <div className='break-words text-sm text-muted-foreground'>{meta.description || '사유 없음'}</div>
                            </div>
                            <div className='shrink-0 text-xs text-muted-foreground'>{formatDate(meta.createdAt)}</div>
                          </div>
                          {index < detail.recentCoinMetas.length - 1 ? <Separator /> : null}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className='px-6 pb-6 text-sm text-muted-foreground'>최근 재화 이용 내역이 없습니다.</div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default SpaceDetailSheet;
