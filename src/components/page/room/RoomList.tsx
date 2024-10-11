import { RoomCategory, RoomTemplate, removeRoom } from '@/client/room';
import useRooms from '@/hooks/useRooms';
import { Button, Drawer, Modal, Table, TableProps, Tag, message } from 'antd';
import { useState } from 'react';
import RoomForm, { categoryOptions } from './RoomForm';

function RoomList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const { items, isLoading, refetch, totalPage } = useRooms(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<RoomTemplate | undefined>(undefined);

  const handleEdit = (value: RoomTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: RoomTemplate) => {
    modal.confirm({
      title: `삭제 (${value.type})`,
      onOk: async () => {
        try {
          await removeRoom(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<RoomTemplate>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '이름',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
      render: (value: RoomCategory) => {
        const v = categoryOptions.find((item) => item.value === value)?.label ?? value;
        return <Tag>{v}</Tag>;
      },
    },

    {
      title: '가격',
      dataIndex: 'price',
      key: 'price',
    },

    {
      title: '스타/히트',
      dataIndex: 'isPaid',
      key: 'isPaid',
      render: (value: boolean) => {
        return <Tag color={value ? 'gold' : 'red'}>{value ? '스타' : '하트'}</Tag>;
      },
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
        <RoomForm reload={refetch} close={() => setOpenCreate(false)} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <RoomForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
      </Drawer>
    </>
  );
}

export default RoomList;
