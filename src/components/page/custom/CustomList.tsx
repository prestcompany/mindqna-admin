import { removeCustomTemplate } from '@/client/custom';
import { ImgItem, PetCustomTemplate } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import useCustoms from '@/hooks/useCustoms';
import { Button, Image, Modal, Table, Tag, message } from 'antd';
import { TableProps } from 'antd/lib';
import { useState } from 'react';
import CustomForm from './CustomForm';

function CustomList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<PetCustomTemplate | undefined>(undefined);

  const { templates, totalPage, isLoading, refetch } = useCustoms({ page: currentPage });

  const handleEdit = (value: PetCustomTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: PetCustomTemplate) => {
    modal.confirm({
      title: `삭제 ${value.name}`,
      onOk: async () => {
        try {
          await removeCustomTemplate(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<PetCustomTemplate>['columns'] = [
    {
      title: '이미지',
      dataIndex: 'img',
      key: 'img',
      render: (value: ImgItem) => {
        return <Image width={'100%'} height={100} src={value?.uri ?? ''} alt='img' style={{ objectFit: 'contain' }} />;
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
      title: '타입',
      dataIndex: 'type',
      key: 'type',
    },
    {
      title: '카테고리',
      dataIndex: 'category',
      key: 'category',
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
      title: 'width',
      dataIndex: 'width',
      key: 'width',
    },
    {
      title: 'height',
      dataIndex: 'height',
      key: 'height',
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
        <div className='flex items-center gap-2 py-4'></div>
        <div className='flex items-center gap-4'>
          <Button
            onClick={() => {
              setFocused(undefined);
              setOpenCreate(true);
            }}
            type='primary'
            size='large'
          >
            펫 커스텀 추가
          </Button>
        </div>
      </DefaultTableBtn>
      <Table
        dataSource={templates}
        columns={columns}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
        loading={isLoading}
      />
      <Modal closeIcon open={isOpenCreate} onCancel={() => setOpenCreate(false)} maskClosable={false}>
        <CustomForm reload={refetch} close={() => setOpenCreate(false)} />
      </Modal>
    </>
  );
}

export default CustomList;
