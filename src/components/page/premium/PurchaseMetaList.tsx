import { PurchaseMeta } from '@/client/types';
import { DatePickerWithRange } from '@/components/ui/DatePickerWithRange';
import usePurchases from '@/hooks/usePurchase';
import { Button, Form, Input, Modal, Table, TableProps, Tag, Tooltip, message } from 'antd';
import dayjs from 'dayjs';
import { Copy, Eye } from 'lucide-react';
import { useState } from 'react';

function PurchaseMetaList() {
  const [modal, holder] = Modal.useModal();
  const [form] = Form.useForm();
  const [api, contextHolder] = message.useMessage();

  const [currentPage, setCurrentPage] = useState(1);
  const [searchFilters, setSearchFilters] = useState<{
    username?: string;
    startDate?: string;
    endDate?: string;
  }>({});

  // 날짜 범위 상태
  const [startedAt, setStartedAt] = useState(dayjs().subtract(7, 'day'));
  const [endedAt, setEndedAt] = useState(dayjs());

  const { items, isLoading, refetch, totalPage } = usePurchases({
    page: currentPage,
    ...searchFilters,
  });

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    api.success(`${label} 복사됨`);
  };

  const showDetail = (content: string, title: string) => {
    modal.info({
      title,
      content: (
        <div className='overflow-auto max-h-96'>
          <pre className='p-3 text-xs whitespace-pre-wrap bg-gray-50 rounded'>{content}</pre>
        </div>
      ),
      width: 600,
    });
  };

  const columns: TableProps<PurchaseMeta>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
      width: 80,
      fixed: 'left',
      render: (value) => <span className='text-sm font-medium text-gray-600'>{value}</span>,
    },
    {
      title: '플랫폼',
      dataIndex: 'platform',
      key: 'platform',
      width: 90,
      render: (value: string) => {
        const platformConfig = {
          EVENT: { color: 'red', text: 'EVENT' },
          IOS: { color: 'blue', text: 'iOS' },
          AOS: { color: 'green', text: 'Android' },
        };
        const config = platformConfig[value as keyof typeof platformConfig];
        return config ? <Tag color={config.color}>{config.text}</Tag> : <Tag>{value}</Tag>;
      },
    },
    {
      title: '유저 ID',
      dataIndex: 'userId',
      key: 'userId',
      width: 150,
      render: (value: string) => {
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <Tooltip title={value}>
              <span className='truncate text-sm font-mono max-w-[100px]'>{value}</span>
            </Tooltip>
            <Button
              type='text'
              size='middle'
              icon={<Copy />}
              onClick={() => copyToClipboard(value, '유저 ID')}
              className='opacity-80 hover:opacity-100'
            />
          </div>
        );
      },
    },
    {
      title: '유저 이름',
      dataIndex: 'username',
      key: 'username',
      width: 100,
      render: (value: string) => <span className='text-sm font-medium text-gray-600'>{value}</span>,
    },
    {
      title: '상품 ID',
      dataIndex: 'productId',
      key: 'productId',
      width: 150,
      render: (value: string) => {
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <Tooltip title={value}>
              <span className='truncate text-sm font-mono max-w-[100px]'>{value}</span>
            </Tooltip>
            <Button
              type='text'
              size='middle'
              icon={<Copy className='w-4 h-4' />}
              onClick={() => copyToClipboard(value, '상품 ID')}
              className='opacity-80 hover:opacity-100'
            />
          </div>
        );
      },
    },
    {
      title: '결제 ID',
      dataIndex: 'transactionId',
      key: 'transactionId',
      width: 180,
      render: (value: string) => {
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <Tooltip title={value}>
              <span className='truncate text-sm font-mono max-w-[120px]'>{value}</span>
            </Tooltip>
            <div className='flex gap-1'>
              <Button
                type='text'
                size='middle'
                icon={<Copy className='w-4 h-4' />}
                onClick={() => copyToClipboard(value, '결제 ID')}
                className='opacity-80 hover:opacity-100'
              />
              <Button
                type='text'
                size='middle'
                icon={<Eye className='w-4 h-4' />}
                onClick={() => showDetail(value, '결제 ID 상세')}
                className='opacity-80 hover:opacity-100'
              />
            </div>
          </div>
        );
      },
    },
    {
      title: '상태',
      dataIndex: 'status',
      key: 'status',
      width: 100,
      render: (_, ticket) => {
        const isExpired = ticket.isExpired;
        const isPurchase = !isExpired && (ticket.isSuccess || dayjs(ticket.createdAt).isBefore('2024-06-01'));

        if (!isExpired && !isPurchase) {
          return (
            <Tag color='red' className='font-medium'>
              실패
            </Tag>
          );
        }
        if (isPurchase) {
          return (
            <Tag color='green' className='font-medium'>
              구매
            </Tag>
          );
        }
        if (isExpired) {
          return (
            <Tag color='default' className='font-medium'>
              만료
            </Tag>
          );
        }
      },
    },
    {
      title: '환경',
      dataIndex: 'isProduction',
      key: 'isProduction',
      width: 100,
      render: (value: boolean) => (
        <Tag color={value ? 'purple' : 'orange'} className='font-medium'>
          {value ? 'PROD' : 'TEST'}
        </Tag>
      ),
    },
    {
      title: '구매 시간',
      dataIndex: 'createdAt',
      key: 'createdAt',
      width: 150,
      render: (value, record) => {
        const day = dayjs(value);
        const diffFromNow = dayjs().diff(day, 'day');
        const isRecent = diffFromNow <= 7;
        const isExpired = record.isExpired || !record.isSuccess;

        return (
          <div className='space-y-1'>
            <div className={`text-sm font-medium ${isRecent ? 'text-blue-600' : 'text-gray-700'}`}>
              {day.format('YYYY.MM.DD')}
            </div>
            <div className='text-xs text-gray-500'>
              {day.format('HH:mm')} ({diffFromNow}일 전)
            </div>
            {!isExpired && <div className='text-xs text-green-600'>활성</div>}
          </div>
        );
      },
    },
    {
      title: '만료 시간',
      dataIndex: 'expiredAt',
      key: 'expiredAt',
      width: 150,
      render: (value, record) => {
        const isExpired = record.isExpired;

        if (!isExpired) {
          return <span className='text-xs text-gray-400'>진행중</span>;
        }

        // 만료된 경우 구매 시간 기준으로 예상 만료 시간 계산 (예: 30일 후)
        const createdDay = dayjs(record.createdAt);
        const estimatedExpiry = createdDay.add(30, 'day');
        const diffFromNow = dayjs().diff(estimatedExpiry, 'day');

        return (
          <div className='space-y-1'>
            <div className='text-sm font-medium text-red-600'>{estimatedExpiry.format('YYYY.MM.DD')}</div>
            <div className='text-xs text-gray-500'>
              {estimatedExpiry.format('HH:mm')} ({Math.abs(diffFromNow)}일 전 만료)
            </div>
            <div className='text-xs text-red-600'>만료됨</div>
          </div>
        );
      },
    },
    {
      title: '로그',
      dataIndex: 'log',
      key: 'log',
      width: 100,
      render: (value: string) => {
        if (!value) return <span className='text-xs text-gray-400'>없음</span>;

        return (
          <div className='flex gap-1 items-center'>
            <Tooltip title='로그 보기'>
              <Button
                type='text'
                size='middle'
                icon={<Eye className='w-4 h-4' />}
                onClick={() => showDetail(value, '로그 상세')}
                className='opacity-80 hover:opacity-100'
              />
            </Tooltip>
          </div>
        );
      },
    },
  ];

  const handleSearch = () => {
    const values = form.getFieldsValue();

    // 유저 ID가 있으면 유저 ID로만 검색, 없으면 날짜 범위로 검색
    if (values.username && values.username.trim()) {
      setSearchFilters({
        username: values.username.trim(),
        startDate: undefined,
        endDate: undefined,
      });
    } else {
      setSearchFilters({
        username: undefined,
        startDate: startedAt.format('YYYY-MM-DD'),
        endDate: endedAt.format('YYYY-MM-DD'),
      });
    }
    setCurrentPage(1);
  };

  const handleReset = () => {
    form.resetFields();
    setSearchFilters({});
    setStartedAt(dayjs().subtract(7, 'day'));
    setEndedAt(dayjs());
    setCurrentPage(1);
  };

  return (
    <>
      {holder}
      <div className='flex gap-2 items-center py-4'>
        <span className='text-lg font-bold'>필터</span>
      </div>

      <Form form={form} layout='inline' className='p-4 mb-4 bg-gray-50 rounded' onFinish={handleSearch}>
        <Form.Item name='username' label='유저 ID'>
          <Input placeholder='유저 ID 입력' style={{ width: 200 }} />
        </Form.Item>

        <Form.Item label='날짜 범위'>
          <DatePickerWithRange
            startedAt={startedAt}
            endedAt={endedAt}
            setStartedAt={setStartedAt}
            setEndedAt={setEndedAt}
          />
        </Form.Item>

        <Form.Item>
          <Button type='primary' htmlType='submit'>
            검색
          </Button>
        </Form.Item>

        <Form.Item>
          <Button onClick={handleReset}>초기화</Button>
        </Form.Item>
      </Form>
      <Table
        dataSource={items}
        columns={columns}
        loading={isLoading}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
          showTotal: (total, range) => `${range[0]}-${range[1]} / 총 ${total}개`,
        }}
        scroll={{ x: 1400 }}
        rowClassName='hover:bg-gray-50 transition-colors'
        size='middle'
      />
    </>
  );
}

export default PurchaseMetaList;
