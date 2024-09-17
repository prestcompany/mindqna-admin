import { PurchaseMeta } from '@/client/types';
import usePurchases from '@/hooks/usePruchase';
import { Modal, Table, TableProps, Tag } from 'antd';
import dayjs from 'dayjs';
import { useState } from 'react';

function PurchaseMetaList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);

  const { items, isLoading, refetch, totalPage } = usePurchases({
    page: currentPage,
  });

  const columns: TableProps<PurchaseMeta>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },

    {
      title: '플랫폼',
      dataIndex: 'platform',
      key: 'platform',
      render: (value: string) => {
        if (value === 'EVENT') return <Tag color='red'>EVENT</Tag>;
        if (value === 'IOS') return <Tag>IOS</Tag>;
        if (value === 'AOS') return <Tag color='green'>AOS</Tag>;
      },
    },
    {
      title: '유저 ID',
      dataIndex: 'username',
      key: 'username',
    },
    {
      title: '상품 ID',
      dataIndex: 'productId',
      key: 'productId',
    },
    {
      title: '결제 ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
    },
    {
      title: '구매/만료',
      dataIndex: 'x',
      key: 'x',
      render: (_, ticket) => {
        const isExpired = ticket.isExpired;
        const isPurchase = !isExpired && (ticket.isSuccess || dayjs(ticket.createdAt).isBefore('2024-06-01'));

        return (
          <div>
            {!isExpired && !isPurchase && <Tag color='red'>실패</Tag>}
            {isPurchase && <Tag color='green'>구매</Tag>}
            {isExpired && <Tag color='default'>만료</Tag>}
          </div>
        );
      },
    },
    {
      title: 'PROD/TEST',
      dataIndex: 'isProduction',
      key: 'isProduction',
      render: (value: boolean) => {
        return <Tag color={value ? 'purple-inverse' : 'default'}>{value ? 'PROD' : 'TEST'}</Tag>;
      },
    },

    {
      title: '구매/만료 시간',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (value) => {
        const day = dayjs(value);
        const diffFromNow = dayjs().diff(day, 'day');

        return <div>{day.format('YY.MM.DD HH:mm')}</div>;
      },
    },
    {
      title: 'log',
      dataIndex: 'log',
      key: 'log',
    },
  ];
  return (
    <>
      {holder}
      <div className='flex items-center gap-2 py-4'>
        <span className='text-lg font-bold'>필터</span>
      </div>
      <Table
        dataSource={items}
        columns={columns}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
      />
    </>
  );
}

export default PurchaseMetaList;
