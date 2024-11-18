import { User } from '@/client/types';
import { getUser, removeUser } from '@/client/user';
import { useQuery } from '@tanstack/react-query';
import { Button, Card, Drawer, Input, Modal, Tag, message } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';
import TicketForm from './TicketForm';

function UserSearch() {
  const [modal, holder] = Modal.useModal();
  const [api, contextHolder] = message.useMessage();
  const [id, setId] = useState('');
  const [isOpenTicket, setOpenTicket] = useState(false);
  const [focused, setFocused] = useState<string>('');

  const { data, refetch } = useQuery({ queryKey: ['user', id], queryFn: () => getUser(id), enabled: false });

  const renderItem = (user: User) => {
    const { id, username, locale, socialAccount, createdAt, _count, reserveUnregisterAt, spaceMaxCount } = user;

    const created = dayjs(createdAt);
    const diffFromNow = dayjs().diff(created, 'day');

    const colorMap: Record<string, string> = {
      GOOGLE: 'red',
      KAKAO: 'yellow',
      APPLE: 'black',
      LINE: 'green',
    };

    const copyId = (id: string) => {
      navigator.clipboard.writeText(id);
      api.success(`${id} 복사`);
    };

    const handleRemove = () => {
      modal.confirm({
        title: `삭제 (${username})`,
        onOk: async () => {
          try {
            await removeUser(id);
            await refetch();
          } catch (err) {
            message.error(`${err}`);
          }
        },
      });
    };

    return (
      <div key={id}>
        <Card title={username}>
          <div className='flex gap-4'>
            <div className='flex flex-col flex-1 gap-2'>
              <div className='flex items-center gap-2'>
                <Button onClick={() => copyId(id)}>ID: {id}</Button>
              </div>

              <div className='flex items-center gap-1'>
                <Tag color={colorMap[socialAccount.provider]}>{socialAccount.provider}</Tag>

                <div>{socialAccount.email}</div>

                <Tag color={user._count.profiles > 0 ? 'green' : 'default'}>{user._count.profiles > 0 ? '가입완료' : '가입중'}</Tag>

                <Tag>생성일: D+{diffFromNow}</Tag>
                {created.format('YY.MM.DD HH:mm')}
                {reserveUnregisterAt && <Tag color='error'>삭제 예정일 {reserveUnregisterAt}</Tag>}
              </div>
              <div className='flex items-center gap-1'>
                <Tag>언어 : {locale}</Tag>
                <Tag>공간 수 : {_count.profiles}</Tag>
                <Tag>공간 최대 치 : {spaceMaxCount}</Tag>
              </div>

              <Button
                type='primary'
                onClick={() => {
                  setOpenTicket(true);
                  setFocused(user.username);
                }}
              >
                티켓 지급
              </Button>

              <Button onClick={handleRemove} type='primary'>
                삭제
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  };

  return (
    <>
      {holder}
      {contextHolder}
      <div className='flex flex-col gap-4'>
        <div className='flex flex-col gap-2'>
          <Input placeholder='유저 ID 검색' value={id} onChange={(e) => setId(e.target.value)} />
          <Button onClick={() => refetch()} type='primary'>
            검색
          </Button>
        </div>
        {data && renderItem(data)}
      </div>
      <Drawer
        open={isOpenTicket}
        onClose={() => {
          setOpenTicket(false);
          setFocused('');
        }}
        width={600}
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
    </>
  );
}

export default UserSearch;
