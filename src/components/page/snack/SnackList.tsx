import { removeSnack } from '@/client/snack';
import { ImgItem, Snack } from '@/client/types';
import useSnacks from '@/hooks/useSnack';
import { Button, Drawer, Image, Modal, Table, TableProps, Tag, message } from 'antd';
import { useState } from 'react';
import SnackForm from './SnackForm';

function SnackList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const { items, totalPage, isLoading, refetch } = useSnacks(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Snack | undefined>(undefined);

  const handleEdit = (value: Snack) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: Snack) => {
    modal.confirm({
      title: `삭제 (${value.name})`,
      onOk: async () => {
        try {
          await removeSnack(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<Snack>['columns'] = [
    {
      title: '이미지',
      dataIndex: 'Img',
      key: 'Img',
      render: (value: ImgItem) => {
        return <Image width={'100%'} height={60} src={value?.uri ?? ''} alt='img' style={{ objectFit: 'contain' }} />;
      },
    },
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },

    {
      title: '이름',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '설명',
      dataIndex: 'desc',
      key: 'desc',
    },
    {
      title: '종류',
      dataIndex: 'kind',
      key: 'kind',
    },
    {
      title: '진화하는 펫',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '경험치',
      dataIndex: 'exp',
      key: 'exp',
    },

    {
      title: '순서',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: '가격',
      dataIndex: 'price',
      key: 'price',
    },
    {
      title: '스타/하트',
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
      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={720}>
        <SnackForm close={() => setOpenCreate(false)} reload={refetch} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={720}>
        <SnackForm init={focused} close={() => setOpenEdit(false)} reload={refetch} />
      </Drawer>
    </>
  );
}

export default SnackList;
