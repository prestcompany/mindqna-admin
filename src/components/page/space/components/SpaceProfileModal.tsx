import { Space } from '@/client/types';
import { Button, Card, Image, Modal, Tag } from 'antd';

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
    <Modal
      open={open}
      footer={null}
      onCancel={onClose}
      title={`👥 ${space.spaceInfo.name} 멤버 (${space.profiles.length}명)`}
      width={600}
    >
      <div className='space-y-3'>
        {space.profiles.map((profile) => {
          const { isPremium, isGoldClub, userId } = profile;
          const isOwner = userId === space.spaceInfo.ownerId;

          return (
            <Card key={profile.id} size='small' style={{ background: '#fefefe' }}>
              <div className='flex gap-3 items-center'>
                <Image
                  src={profile.img?.uri}
                  alt={profile.nickname}
                  style={{ width: 40, height: 40 }}
                  className='rounded'
                />
                <div className='flex-1'>
                  <div className='flex gap-2 items-center mb-2'>
                    <span className='font-medium'>{profile.nickname}</span>
                    {isOwner && <Tag color='black'>👑 OWNER</Tag>}
                    {isPremium && <Tag color='green'>💎 PREMIUM</Tag>}
                    {isGoldClub && <Tag color='gold'>⭐ STAR CLUB</Tag>}
                  </div>
                  <div className='mb-2 text-xs text-gray-500'>ID: {profile.id}</div>
                  <div className='flex gap-2'>
                    <Button size='small' type='primary' onClick={() => copyId(profile.user.username)}>
                      📋 {profile.user.username}
                    </Button>
                    <Button size='small' danger onClick={() => onRemoveProfile(profile.id, profile.nickname)}>
                      🗑️ 삭제
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Modal>
  );
}

export default SpaceProfileModal;
