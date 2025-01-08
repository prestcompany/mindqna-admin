import { deleteSquareLibrary, LibraryData, LibrarySubType, LibraryType } from '@/client/square-library';
import { Locale } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import useLibrary from '@/hooks/useLibrary';
import { Button, Drawer, Image, message, Modal, Select, Table, TableProps, Tag } from 'antd';
import { useState } from 'react';
import LibraryForm from './LibraryForm';

type Props = {
  type: LibraryType;
};

export const subCategoryOptions = {
  info: [
    { label: '테스트', value: 'test' },
    { label: '이벤트 종료', value: 'eventend' },
    { label: '이벤트 진행중', value: 'eventing' },
    { label: '이벤트 예정', value: 'eventplan' },
  ],
  article: [
    { label: '혼자', value: 'alone' },
    { label: '친구', value: 'friend' },
    { label: '가족', value: 'family' },
    { label: '연인', value: 'couple' },
  ],
};

export const LibraryMap: Record<LibrarySubType, string> = {
  [LibrarySubType.TEST]: '테스트',
  [LibrarySubType.EVENTEND]: '이벤트 종료',
  [LibrarySubType.EVENTING]: '이벤트 진행중',
  [LibrarySubType.EVENTPLAN]: '이벤트 예정',
  [LibrarySubType.ALONE]: '혼자',
  [LibrarySubType.FRIEND]: '친구',
  [LibrarySubType.FAMILY]: '가족',
  [LibrarySubType.COUPLE]: '연인',
};

function LibraryList({ type }: Props) {
  const [modal, holder] = Modal.useModal();
  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ subCategory?: LibrarySubType; locale?: Locale }>({});
  const { items, isLoading, refetch, totalPage } = useLibrary({ category: type, page: currentPage, ...filter });
  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<LibraryData | undefined>(undefined);

  const handleEdit = (value: LibraryData) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: LibraryData) => {
    modal.confirm({
      title: `삭제 (${value.name})`,
      onOk: async () => {
        try {
          if (!value.id) return;
          await deleteSquareLibrary(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<LibraryData>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },
    {
      title: '이미지',
      dataIndex: 'img',
      key: 'img',
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
      title: '타입',
      dataIndex: 'subCategory',
      key: 'subCategory',
      render: (value: LibrarySubType) => {
        return <Tag color='green'>{LibraryMap[value]}</Tag>;
      },
    },
    {
      title: '다국어',
      dataIndex: 'locale',
      key: 'locale',
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '내용',
      dataIndex: 'content',
      key: 'content',
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
      title: '고정',
      dataIndex: 'isFixed',
      key: 'isFixed',
      render: (value: boolean) => {
        return <Tag color={value ? 'green' : 'default'}>{value ? '고정됨' : '고정 안됨'}</Tag>;
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
            value={filter.locale}
            onChange={(v: Locale) => {
              setFilter((prev) => ({ ...prev, locale: v }));
            }}
            allowClear
          />
          <Select
            placeholder='타입'
            style={{ width: 180 }}
            options={subCategoryOptions[type]}
            value={filter.subCategory}
            onChange={(v: LibrarySubType) => {
              setFilter((prev) => ({ ...prev, subCategory: v }));
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
        <LibraryForm reload={refetch} close={() => setOpenCreate(false)} type={type} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <LibraryForm init={focused} reload={refetch} close={() => setOpenEdit(false)} type={type} />
      </Drawer>
    </>
  );
}

export default LibraryList;
