import { removeProfile, removeSpace, searchSpaces } from '@/client/space';
import { Space, SpaceType } from '@/client/types';
import { useQuery } from '@tanstack/react-query';
import {
  Button,
  Card,
  Collapse,
  DatePicker,
  Drawer,
  Image,
  Input,
  Modal,
  Radio,
  Select,
  Table,
  Tag,
  message,
} from 'antd';
import { TableProps } from 'antd/lib';
import dayjs from 'dayjs';
import isBetween from 'dayjs/plugin/isBetween';
import { useState } from 'react';
import CoinForm from './CoinForm';

dayjs.extend(isBetween);

const { RangePicker } = DatePicker;
const { Panel } = Collapse;

function SpaceSearch() {
  const [modal, holder] = Modal.useModal();
  const [api, contextHolder] = message.useMessage();

  // 검색 상태
  const [searchParams, setSearchParams] = useState({
    id: '',
    username: '',
    type: undefined as SpaceType | undefined,
    locale: undefined as string | undefined,
    dateRange: null as [dayjs.Dayjs, dayjs.Dayjs] | null,
  });

  // UI 상태
  const [viewMode, setViewMode] = useState<'card' | 'table'>('card');
  const [isOpenCoin, setOpenCoin] = useState(false);
  const [focused, setFocused] = useState<Space | undefined>(undefined);

  const { data, refetch, isLoading } = useQuery({
    queryKey: ['space-search', searchParams],
    queryFn: () =>
      searchSpaces({
        spaceId: searchParams.id || '',
        username: searchParams.username || '',
      }),
    enabled: false,
  });

  // 필터링된 데이터
  const filteredData =
    data?.filter((space) => {
      if (searchParams.type && space.spaceInfo.type !== searchParams.type) return false;
      if (searchParams.locale && space.spaceInfo.locale !== searchParams.locale) return false;
      if (searchParams.dateRange) {
        const created = dayjs(space.spaceInfo.createdAt);
        if (!created.isBetween(searchParams.dateRange[0], searchParams.dateRange[1], 'day', '[]')) return false;
      }
      return true;
    }) || [];

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    api.success(`${id} 복사`);
  };

  const handleSearch = () => {
    if (!searchParams.id && !searchParams.username) {
      message.warning('검색어를 입력해주세요');
      return;
    }
    refetch();
  };

  const handleRemoveSpace = (space: Space) => {
    modal.confirm({
      title: `삭제 (${space.spaceInfo.name})`,
      onOk: async () => {
        try {
          await removeSpace(space.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  // 테이블 컬럼 정의
  const columns: TableProps<Space>['columns'] = [
    {
      title: 'ID',
      dataIndex: 'id',
      key: 'id',
      width: 120,
      render: (id) => (
        <Button size='small' onClick={() => copyId(id)}>
          {id}
        </Button>
      ),
    },
    {
      title: '이름',
      dataIndex: ['spaceInfo', 'name'],
      key: 'name',
      width: 150,
    },
    {
      title: '타입',
      dataIndex: ['spaceInfo', 'type'],
      key: 'type',
      width: 80,
      render: (type) => <Tag>{type}</Tag>,
    },
    {
      title: '언어',
      dataIndex: ['spaceInfo', 'locale'],
      key: 'locale',
      width: 60,
      render: (locale) => <Tag>{locale}</Tag>,
    },
    {
      title: '멤버',
      dataIndex: ['profiles', 'length'],
      key: 'members',
      width: 60,
    },
    {
      title: '하트/스타',
      key: 'coins',
      width: 120,
      render: (_, space) => (
        <div className='flex gap-1'>
          <Tag color='red'>{space.coin}</Tag>
          <Tag color='gold'>{space.coinPaid}</Tag>
        </div>
      ),
    },
    {
      title: '펫 LV',
      dataIndex: ['pet', 'level'],
      key: 'level',
      width: 60,
    },
    {
      title: '생성일',
      dataIndex: ['spaceInfo', 'createdAt'],
      key: 'createdAt',
      width: 100,
      render: (value) => {
        const day = dayjs(value);
        const diffFromNow = dayjs().diff(day, 'day');
        return (
          <div>
            <Tag>D+{diffFromNow}</Tag>
            <div className='text-xs'>{day.format('MM.DD')}</div>
          </div>
        );
      },
    },
    {
      title: '작업',
      key: 'actions',
      width: 120,
      render: (_, space) => (
        <div className='flex gap-1'>
          <Button
            size='small'
            type='primary'
            onClick={() => {
              setOpenCoin(true);
              setFocused(space);
            }}
          >
            코인
          </Button>
          <Button size='small' danger onClick={() => handleRemoveSpace(space)}>
            삭제
          </Button>
        </div>
      ),
    },
  ];

  const renderCardItem = (space: Space) => {
    const { coin, coinPaid, dueRemovedAt, rooms, cardOrder } = space;
    const { type, name, locale, petName, noticeTime, ownerId, createdAt } = space.spaceInfo;
    const { level } = space.pet;

    const created = dayjs(createdAt);
    const diffFromNow = dayjs().diff(created, 'day');

    const handleRemove = () => {
      modal.confirm({
        title: `삭제 (${name})`,
        onOk: async () => {
          try {
            await removeSpace(space.id);
            await refetch();
          } catch (err) {
            message.error(`${err}`);
          }
        },
      });
    };

    return (
      <Card
        key={space.id}
        title={name}
        size='small'
        className='mb-4'
        extra={
          <div className='flex gap-2'>
            <Button size='small' onClick={() => copyId(space.id)}>
              ID 복사
            </Button>
            <Button
              size='small'
              type='primary'
              onClick={() => {
                setOpenCoin(true);
                setFocused(space);
              }}
            >
              코인 지급
            </Button>
            <Button size='small' danger onClick={handleRemove}>
              삭제
            </Button>
          </div>
        }
      >
        <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
          {/* 공간 정보 */}
          <div className='space-y-2'>
            <div className='flex gap-2 items-center'>
              <Tag>{type}</Tag>
              <Tag>언어 {locale}</Tag>
              <Tag>질문 {cardOrder}개</Tag>
            </div>

            <div className='flex gap-2 items-center'>
              <Tag color='red'>하트 {coin}</Tag>
              <Tag color='gold'>스타 {coinPaid}</Tag>
            </div>

            <div className='flex gap-2 items-center'>
              <Tag>펫이름: {petName}</Tag>
              <Tag>LV. {level}</Tag>
            </div>

            <div className='flex gap-2 items-center'>
              <Tag>생성일: D+{diffFromNow}</Tag>
              <span className='text-sm text-gray-500'>{created.format('YY.MM.DD HH:mm')}</span>
            </div>

            {dueRemovedAt && <Tag color='error'>삭제 예정일 {dueRemovedAt}</Tag>}
          </div>

          {/* 멤버 정보 */}
          <div>
            <div className='mb-2 font-semibold'>멤버 {space.profiles.length}명</div>
            <div className='grid overflow-y-auto grid-cols-1 gap-2 max-h-48'>
              {space.profiles.map((profile) => {
                const { isPremium, isGoldClub, userId } = profile;
                const isOwner = userId === ownerId;

                const removePro = async () => {
                  modal.confirm({
                    title: `삭제 (${profile.nickname})`,
                    onOk: async () => {
                      try {
                        await removeProfile(profile.id);
                        await refetch();
                      } catch (err) {
                        message.error(`${err}`);
                      }
                    },
                  });
                };

                return (
                  <div key={profile.id} className='flex gap-2 items-center p-2 bg-gray-50 rounded'>
                    <Image
                      src={profile.img?.uri}
                      alt={profile.nickname}
                      style={{ width: 32, height: 32 }}
                      className='rounded'
                    />
                    <div className='flex-1'>
                      <div className='flex gap-1 items-center'>
                        <span className='text-sm font-medium'>{profile.nickname}</span>
                        {isOwner && <Tag color='black'>OWNER</Tag>}
                        {isPremium && <Tag color='green'>PREMIUM</Tag>}
                        {isGoldClub && <Tag color='gold'>STAR</Tag>}
                      </div>
                      <div className='flex gap-1 mt-1'>
                        <Button size='small' type='link' onClick={() => copyId(profile.user.username)}>
                          {profile.user.username}
                        </Button>
                        <Button size='small' type='link' danger onClick={removePro}>
                          삭제
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <>
      {holder}
      {contextHolder}

      <div className='space-y-4'>
        {/* 검색 및 필터 섹션 */}
        <Collapse defaultActiveKey={['search']} className='bg-white'>
          <Panel header='검색 및 필터' key='search'>
            <div className='grid grid-cols-1 gap-4 mb-4 md:grid-cols-2 lg:grid-cols-4'>
              <div>
                <label className='block mb-1 text-sm font-medium'>공간 ID</label>
                <Input
                  placeholder='공간 ID'
                  value={searchParams.id}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, id: e.target.value }))}
                />
              </div>

              <div>
                <label className='block mb-1 text-sm font-medium'>사용자명</label>
                <Input
                  placeholder='사용자명'
                  value={searchParams.username}
                  onChange={(e) => setSearchParams((prev) => ({ ...prev, username: e.target.value }))}
                />
              </div>

              <div>
                <label className='block mb-1 text-sm font-medium'>공간 타입</label>
                <Select
                  placeholder='공간 타입'
                  style={{ width: '100%' }}
                  options={[
                    { label: '혼자', value: 'alone' },
                    { label: '커플', value: 'couple' },
                    { label: '가족', value: 'family' },
                    { label: '친구', value: 'friends' },
                  ]}
                  value={searchParams.type}
                  onChange={(v: SpaceType) => setSearchParams((prev) => ({ ...prev, type: v }))}
                  allowClear
                />
              </div>

              <div>
                <label className='block mb-1 text-sm font-medium'>언어</label>
                <Select
                  placeholder='언어'
                  style={{ width: '100%' }}
                  options={[
                    { label: 'ko', value: 'ko' },
                    { label: 'en', value: 'en' },
                    { label: 'ja', value: 'ja' },
                    { label: 'zh', value: 'zh' },
                    { label: 'zhTw', value: 'zhTw' },
                    { label: 'es', value: 'es' },
                    { label: 'id', value: 'id' },
                  ]}
                  value={searchParams.locale}
                  onChange={(v: string) => setSearchParams((prev) => ({ ...prev, locale: v }))}
                  allowClear
                />
              </div>
            </div>

            <div className='grid grid-cols-1 gap-4 mb-4 md:grid-cols-2'>
              <div>
                <label className='block mb-1 text-sm font-medium'>생성일 범위</label>
                <RangePicker
                  value={searchParams.dateRange}
                  onChange={(dates) =>
                    setSearchParams((prev) => ({ ...prev, dateRange: dates as [dayjs.Dayjs, dayjs.Dayjs] | null }))
                  }
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <Button onClick={handleSearch} type='primary' loading={isLoading}>
              검색
            </Button>
          </Panel>
        </Collapse>

        {/* 뷰 모드 선택 */}
        {data && (
          <div className='flex justify-between items-center'>
            <div>총 {filteredData.length}개 검색됨</div>
            <Radio.Group value={viewMode} onChange={(e) => setViewMode(e.target.value)} buttonStyle='solid'>
              <Radio.Button value='card'>카드 뷰</Radio.Button>
              <Radio.Button value='table'>테이블 뷰</Radio.Button>
            </Radio.Group>
          </div>
        )}

        {/* 결과 표시 */}
        {data && (
          <>
            {viewMode === 'table' ? (
              <Table
                dataSource={filteredData}
                columns={columns}
                rowKey='id'
                size='small'
                scroll={{ x: 800 }}
                pagination={{
                  pageSize: 20,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total) => `총 ${total}개`,
                }}
                loading={isLoading}
              />
            ) : (
              <div className='space-y-4'>{filteredData.map((space) => renderCardItem(space))}</div>
            )}
          </>
        )}
      </div>

      <Drawer
        open={isOpenCoin}
        onClose={() => {
          setOpenCoin(false);
          setFocused(undefined);
        }}
        width={600}
      >
        <CoinForm
          reload={refetch}
          close={() => {
            setOpenCoin(false);
            setFocused(undefined);
          }}
          spaceId={focused?.id ?? ''}
          currentCoins={
            focused
              ? {
                  hearts: focused.coin,
                  stars: focused.coinPaid,
                }
              : undefined
          }
        />
      </Drawer>
    </>
  );
}

export default SpaceSearch;
