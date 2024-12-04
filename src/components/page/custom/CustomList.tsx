import { removeCustomTemplate } from '@/client/custom';
import { ImgItem, PetCustomTemplate } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import useCustoms from '@/hooks/useCustoms';
import { Button, Image, Modal, Table, Tag, message } from 'antd';
import { TableProps } from 'antd/lib';
import { useState } from 'react';
import CustomFormModal from './CustomFormModal';
import LottieCDNPlayer from './LottieCDNPlayer';
import { PetCustomTypeOptions, petTypeOptions } from './constant';

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
      title: '순서',
      dataIndex: 'order',
      key: 'order',
    },
    {
      title: '키 값',
      dataIndex: 'fileKey',
      key: 'fileKey',
      render: (value: string) => {
        return <p className='font-bold'>{value}</p>;
      },
    },
    {
      title: '타입',
      dataIndex: 'type',
      key: 'type',
      render: (value: string) => {
        const label = PetCustomTypeOptions.find((item) => item.value === value)?.label;
        return <Tag color='cyan-inverse'>{label}</Tag>;
      },
    },

    {
      title: '펫 타입',
      dataIndex: 'petType',
      key: 'petType',
      render: (value: string) => {
        const label = petTypeOptions.find((item) => item.value === value)?.label;
        return <Tag color='blue-inverse'>{label}</Tag>;
      },
    },
    {
      title: '펫 레벨',
      dataIndex: 'petLevel',
      key: 'petLevel',
      render: (value: string) => {
        return <Tag color='purple-inverse'>{value}</Tag>;
      },
    },

    {
      title: '스타/하트',
      dataIndex: 'isPaid',
      key: 'isPaid',
      render: (value: boolean) => {
        return <Tag color={value ? 'gold-inverse' : 'red-inverse'}>{value ? '스타' : '하트'}</Tag>;
      },
    },
    {
      title: '가격',
      dataIndex: 'price',
      key: 'price',
      render: (value: number) => {
        return <Tag color='green-inverse'>{value}</Tag>;
      },
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value: boolean) => {
        return <Tag color={value ? 'green' : 'red'}>{value ? '활성' : '비활성'}</Tag>;
      },
    },
    {
      title: '썸네일',
      dataIndex: 'img',
      key: 'img',
      render: (value: ImgItem) => {
        return <Image width={60} height={60} src={value?.uri ?? ''} alt='img' style={{ objectFit: 'contain' }} />;
      },
    },
    {
      title: '로티 파일',
      dataIndex: 'fileUrl',
      key: 'fileUrl',
      render: (value: string) => {
        return <LottieCDNPlayer fileUrl={value} width={150} height={150} />;
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
        rowKey={(record) => record.id}
      />

      {isOpenCreate && <CustomFormModal isOpen={isOpenCreate} reload={refetch} close={() => setOpenCreate(false)} />}
      {isOpenEdit && <CustomFormModal isOpen={isOpenEdit} reload={refetch} close={() => setOpenEdit(false)} init={focused} />}
    </>
  );
}

export default CustomList;
