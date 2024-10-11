import { removeBubble } from '@/client/bubble';
import { BubbleType, PetBubble } from '@/client/types';
import useBubbles from '@/hooks/useBubbles';
import { Button, Drawer, Modal, Select, Table, TableProps, message } from 'antd';
import { useState } from 'react';
import BubbleForm from './BubbleForm';

function BubbleList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ type?: BubbleType[]; locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useBubbles(currentPage, filter.type, filter.locale);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<PetBubble | undefined>(undefined);

  const handleEdit = (value: PetBubble) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: PetBubble) => {
    modal.confirm({
      title: `삭제 (${value.message})`,
      onOk: async () => {
        try {
          await removeBubble(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<PetBubble>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },

    {
      title: 'message',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: '레벨',
      dataIndex: 'level',
      key: 'level',
    },
    {
      title: '타입',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: 'locale',
      dataIndex: 'locale',
      key: 'locale',
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
      <div className='flex items-center gap-2 py-4'>
        <span className='text-lg font-bold'>필터</span>
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
          ]}
          value={(filter.locale ?? [])?.[0]}
          onChange={(v: string) => {
            setFilter((prev) => ({ ...prev, locale: [v] }));
          }}
          allowClear
        />
        <Select
          placeholder='타입'
          style={{ width: 120 }}
          options={[
            { label: '공통', value: 'general' },
            { label: '오전', value: 'day' },
            { label: '오후', value: 'night' },
            { label: '커스텀', value: 'custom' },
          ]}
          value={(filter.type ?? [])?.[0]}
          onChange={(v: BubbleType) => {
            setFilter((prev) => ({ ...prev, type: [v] }));
          }}
          allowClear
        />
      </div>
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
        <BubbleForm reload={refetch} close={() => setOpenCreate(false)} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <BubbleForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
      </Drawer>
    </>
  );
}

export default BubbleList;
