import { Banner, removeBanner } from '@/client/banner';
import { BannerLocationType } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import useBanners from '@/hooks/useBanners';
import { Button, Drawer, Image, Modal, Select, Table, TableProps, Tag, message } from 'antd';
import { useState } from 'react';
import BannerForm, { locationOptions } from './BannerForm';

function BannerList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ location?: BannerLocationType[]; locale?: string[] }>({});
  const { items, isLoading, refetch, totalPage } = useBanners({ page: currentPage, ...filter });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Banner | undefined>(undefined);

  const handleEdit = (value: Banner) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: Banner) => {
    modal.confirm({
      title: `삭제 (${value.name})`,
      onOk: async () => {
        try {
          await removeBanner(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<Banner>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '이미지',
      dataIndex: 'imgUri',
      key: 'imgUri',
      render: (value: string) => {
        return <Image width={'100%'} height={60} src={value ?? ''} alt='img' style={{ objectFit: 'contain' }} />;
      },
    },

    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '다국어',
      dataIndex: 'locale',
      key: 'locale',
    },
    {
      title: '위치',
      dataIndex: 'location',
      key: 'location',
      render: (value: string) => {
        const label = locationOptions.find((item) => item.value === value)?.label ?? value;
        return <Tag color='purple'>{label}</Tag>;
      },
    },
    {
      title: '조회수',
      dataIndex: 'viewCount',
      key: 'viewCount',
    },
    {
      title: '클릭수',
      dataIndex: 'clickCount',
      key: 'clickCount',
    },
    {
      title: '링크',
      dataIndex: 'link',
      key: 'link',
    },

    {
      title: '활성화',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value: boolean) => {
        return <Tag color={value ? 'green' : 'default'}>{value ? '활성화' : '비활성화'}</Tag>;
      },
    },

    {
      title: 'Action',
      dataIndex: '',
      key: 'x',
      render: (value) => (
        <div className='flex gap-4'>
          <Button onClick={() => handleEdit(value)}>수정</Button>
          <Button onClick={() => handleRemove(value)}>삭제</Button>
        </div>
      ),
    },
  ];
  return (
    <>
      {holder}
      <DefaultTableBtn className='justify-between'>
        <div className='flex items-center gap-2 py-4'>
          <Select
            placeholder='언어'
            style={{ width: 120 }}
            options={[
              { label: 'ko', value: 'ko' },
              { label: 'en', value: 'en' },
              { label: 'ja', value: 'ja' },
              { label: 'zh', value: 'zh' },
              { label: 'zhTw', value: 'zhTw' },
              { label: 'es', value: 'es' },
              { label: 'id', value: 'id' },
            ]}
            value={(filter.locale ?? [])?.[0]}
            onChange={(v: string) => {
              setFilter((prev) => ({ ...prev, locale: [v] }));
            }}
            allowClear
          />
          <Select
            placeholder='타입'
            style={{ width: 180 }}
            options={locationOptions}
            value={(filter.location ?? [])?.[0]}
            onChange={(v: BannerLocationType) => {
              setFilter((prev) => ({ ...prev, location: [v] }));
            }}
            allowClear
          />
        </div>
        <Button
          onClick={() => {
            setFocused(undefined);
            setOpenCreate(true);
          }}
          type='primary'
          size='large'
        >
          추가
        </Button>
      </DefaultTableBtn>

      <Table
        dataSource={items}
        columns={columns}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
        loading={isLoading}
      />
      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={600}>
        <BannerForm reload={refetch} close={() => setOpenCreate(false)} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <BannerForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
      </Drawer>
    </>
  );
}

export default BannerList;
