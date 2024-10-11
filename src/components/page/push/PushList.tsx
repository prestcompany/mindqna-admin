import { AdminPush } from '@/client/push';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import usePushes from '@/hooks/usePushes';
import { Button, Drawer, Modal, Select, Table, TableProps, Tag } from 'antd';
import { useRouter } from 'next/router';
import { useState } from 'react';

function PushList() {
  const router = useRouter();
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = usePushes({ page: currentPage, locale: filter.locale });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);

  const columns: TableProps<AdminPush>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },

    {
      title: '언어',
      dataIndex: 'locale',
      key: 'locale',
    },
    {
      title: '제목',
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: '메시지',
      dataIndex: 'message',
      key: 'message',
    },
    {
      title: '상태',
      dataIndex: 'isActive',
      key: 'isActive',
      render: (value) => {
        if (value) return <Tag color='green'>활성</Tag>;
        if (!value) return <Tag color='red'>비활성</Tag>;
      },
    },
    {
      title: '',
      dataIndex: '',
      key: 'x',
      render: (value) => (
        <div className='flex gap-4'>
          {/* <Button onClick={() => handleEdit(value)}>상태변경</Button> */}
          {/* <Button onClick={() => handleRemove(value)}>삭제</Button> */}
        </div>
      ),
    },
  ];
  return (
    <>
      {holder}
      <DefaultTableBtn className='justify-between'>
        <div>
          <div className='flex items-center gap-2 py-6 '>
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
          </div>
        </div>
        <div className='flex-item-list'>
          <Button type='primary' onClick={() => router.push('/marketing/push/new')}>
            푸시 등록
          </Button>
        </div>
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
      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={600}></Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}></Drawer>
    </>
  );
}

export default PushList;
