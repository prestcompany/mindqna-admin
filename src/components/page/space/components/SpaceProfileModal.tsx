import { Space } from '@/client/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface SpaceProfileModalProps {
  open: boolean;
  space: Space | null;
  onClose: () => void;
  onRefresh: () => void;
  onRemoveProfile: (profileId: string, nickname: string) => void;
  copyId: (id: string) => void;
}

function SpaceProfileModal({ open, space, onClose, onRefresh, onRemoveProfile, copyId }: SpaceProfileModalProps) {
  if (!space) return null;

  return (
    <Dialog open={open} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className='max-w-[600px]'>
        <DialogHeader>
          <DialogTitle>{space.spaceInfo.name} 멤버 ({space.profiles.length}명)</DialogTitle>
        </DialogHeader>
        <div className='space-y-3'>
          {space.profiles.map((profile) => {
            const { isPremium, isGoldClub, userId } = profile;
            const isOwner = userId === space.spaceInfo.ownerId;

            return (
              <Card key={profile.id} className='bg-[#fefefe]'>
                <CardContent className='p-3'>
                  <div className='flex gap-3 items-center'>
                    <img
                      src={profile.img?.uri}
                      alt={profile.nickname}
                      width={40}
                      height={40}
                      className='rounded object-cover'
                    />
                    <div className='flex-1'>
                      <div className='flex gap-2 items-center mb-2'>
                        <span className='font-medium'>{profile.nickname}</span>
                        {isOwner && <Badge variant='default'>OWNER</Badge>}
                        {isPremium && <Badge variant='success'>PREMIUM</Badge>}
                        {isGoldClub && <Badge variant='warning'>STAR CLUB</Badge>}
                      </div>
                      <div className='mb-2 text-xs text-gray-500'>ID: {profile.id}</div>
                      <div className='flex gap-2'>
                        <Button size='sm' onClick={() => copyId(profile.user.username)}>
                          {profile.user.username}
                        </Button>
                        <Button size='sm' variant='destructive' onClick={() => onRemoveProfile(profile.id, profile.nickname)}>
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SpaceProfileModal;
