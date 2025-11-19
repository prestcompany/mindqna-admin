import { User } from '@/client/types';
import { getUser, getUserByEmail, removeUser } from '@/client/user';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Drawer, Input, Modal, Space, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { Copy } from 'lucide-react';
import { useState } from 'react';
import TicketForm from './TicketForm';

function UserSearch() {
  const [modal, holder] = Modal.useModal();
  const [id, setId] = useState('');
  const [isOpenTicket, setOpenTicket] = useState(false);
  const [focused, setFocused] = useState<string>('');
  const [email, setEmail] = useState('');

  const { data, refetch, isLoading, isFetched } = useQuery({
    queryKey: ['user', id, email],
    queryFn: () => {
      if (id) {
        return getUser(id);
      } else if (email) {
        return getUserByEmail(email);
      }
    },
    enabled: false,
  });

  const copyId = (text: string) => {
    navigator.clipboard.writeText(text);
    message.success(`${text} 복사됨`);
  };

  const handleRemove = (user: User) => {
    modal.confirm({
      title: `사용자 삭제`,
      content: (
        <div className='space-y-2'>
          <p>
            <strong>{user.username}</strong> 사용자를 삭제하시겠습니까?
          </p>
          <div className='text-sm text-gray-600'>
            <p>• 이메일: {user.socialAccount.email}</p>
            <p>• 가입일: {dayjs(user.createdAt).format('YYYY-MM-DD')}</p>
            <p>• 공간 수: {user._count.profiles}개</p>
          </div>
        </div>
      ),
      okText: '삭제',
      okType: 'danger',
      cancelText: '취소',
      onOk: async () => {
        try {
          await removeUser(user.id);
          message.success(`${user.username} 사용자가 삭제되었습니다`);
          await refetch();
        } catch (err) {
          message.error(`삭제 실패: ${err}`);
        }
      },
    });
  };

  const renderUserCard = (user: User) => {
    const { id, username, locale, socialAccount, createdAt, _count, reserveUnregisterAt, spaceMaxCount } = user;
    const created = dayjs(createdAt);
    const diffFromNow = dayjs().diff(created, 'day');

    const providerMap = {
      GOOGLE: { color: 'red', icon: '🔍', text: 'Google' },
      KAKAO: { color: 'gold', icon: '💬', text: 'Kakao' },
      APPLE: { color: 'default', icon: '🍎', text: 'Apple' },
      LINE: { color: 'green', icon: '💚', text: 'Line' },
    };

    const providerConfig = providerMap[socialAccount.provider as keyof typeof providerMap] || {
      color: 'default',
      icon: '🔗',
      text: socialAccount.provider,
    };

    const isCompleted = _count.profiles > 0;

    return (
      <Card
        title={
          <div className='flex gap-2 items-center'>
            <span>👤 {username}</span>
            <Tag color={isCompleted ? 'green' : 'orange'}>{isCompleted ? '✅ 완료' : '⏳ 진행중'}</Tag>
          </div>
        }
        extra={
          <Space>
            <Button
              size='small'
              onClick={() => {
                setOpenTicket(true);
                setFocused(username);
              }}
              type='primary'
            >
              티켓 지급
            </Button>
            <Button size='small' danger onClick={() => handleRemove(user)}>
              삭제
            </Button>
          </Space>
        }
        className='bg-white shadow-sm'
      >
        <div className='space-y-3'>
          {/* 기본 정보 */}
          <div className='flex flex-wrap gap-2'>
            <Button size='small' type='default' onClick={() => copyId(id)} className='flex gap-1 items-center'>
              ID: {id.slice(0, 8)}...
              <Copy className='w-3 h-3' />
            </Button>
            <Tag color={providerConfig.color}>
              {providerConfig.icon} {providerConfig.text}
            </Tag>
            <Tag>{locale?.toUpperCase()}</Tag>
          </div>

          {/* 이메일 */}
          <div className='flex gap-2 items-center'>
            <span className='text-sm text-gray-500'>이메일:</span>
            <span>{socialAccount.email}</span>
          </div>

          {/* 통계 정보 */}
          <div className='flex flex-wrap gap-2'>
            <Tag color='blue'>🏠 공간 {_count.profiles}개</Tag>
            <Tag color={spaceMaxCount > 5 ? 'gold' : spaceMaxCount > 2 ? 'green' : 'default'}>
              🏆 최대 {spaceMaxCount}개
            </Tag>
            <Tag color={diffFromNow < 7 ? 'green' : diffFromNow < 30 ? 'orange' : 'default'}>D+{diffFromNow}</Tag>
          </div>

          {/* 가입일 */}
          <div className='flex gap-2 items-center text-sm text-gray-500'>
            <span>가입일:</span>
            <span>{created.format('YYYY-MM-DD HH:mm')}</span>
          </div>

          {/* 탈퇴 예정일 */}
          {reserveUnregisterAt && (
            <div className='flex gap-2 items-center'>
              <Tag color='error'>⚠️ 탈퇴 예정</Tag>
              <span className='text-sm text-red-600'>{reserveUnregisterAt}</span>
            </div>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className='space-y-4'>
      {holder}

      {/* 검색 영역 */}
      <Card size='small' title='🔍 사용자 검색'>
        <div className='flex gap-2'>
          <Input
            placeholder='유저코드를 입력하세요...'
            value={id}
            onChange={(e) => setId(e.target.value)}
            onPressEnter={() => refetch()}
            size='large'
          />
          <Button onClick={() => refetch()} type='primary' size='large' loading={isLoading} disabled={!id.trim()}>
            🔍 유저코드 검색
          </Button>
        </div>
      </Card>

      <Card size='small' title='🔍 이메일 검색'>
        <div className='flex gap-2'>
          <Input
            placeholder='이메일을 입력하세요...'
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onPressEnter={() => refetch()}
            size='large'
          />
          <Button onClick={() => refetch()} type='primary' size='large' loading={isLoading} disabled={!email.trim()}>
            🔍 이메일 검색
          </Button>
        </div>
      </Card>

      {/* 검색 결과 */}
      {data && renderUserCard(data)}

      {/* 검색 결과가 없는 경우 */}
      {!data && !isLoading && isFetched && (
        <Card className='py-8 text-center'>
          <div className='text-gray-400'>
            <p className='mb-2 text-lg'>😕</p>
            <p>검색 결과가 없습니다</p>
            <p className='mt-1 text-sm'>{id.trim() ? `유저코드: ${id}` : `이메일: ${email}`}</p>
          </div>
        </Card>
      )}

      {/* 티켓 지급 드로어 */}
      <Drawer
        open={isOpenTicket}
        onClose={() => {
          setOpenTicket(false);
          setFocused('');
        }}
        width={600}
        title='🎫 티켓 지급'
      >
        <TicketForm
          reload={refetch}
          close={() => {
            setOpenTicket(false);
            setFocused('');
          }}
          username={focused}
        />
      </Drawer>
    </div>
  );
}

export default UserSearch;
