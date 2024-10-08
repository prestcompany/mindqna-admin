import { removeLocale } from '@/client/locale';
import { LocaleWord } from '@/client/types';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import useLocales from '@/hooks/useLocales';
import { Button, Drawer, Input, Modal, Select, Table, TableProps, message } from 'antd';
import { useState } from 'react';
import LocaleForm from './LocaleForm';

function LocaleList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [searchKey, setSearchKey] = useState('');
  const [searchValue, setSearchValue] = useState('');
  const { locales, totalPage, isLoading, refetch } = useLocales({ page: currentPage, locale: filter.locale, key: searchKey, value: searchValue });

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<LocaleWord | undefined>(undefined);

  const handleEdit = (value: LocaleWord) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleSearch = () => {
    setSearchKey(key);
    setSearchValue(value);
    refetch();
  };

  const handleRemove = (value: LocaleWord) => {
    modal.confirm({
      title: `삭제 (${value.key} - ${value.value})`,
      onOk: async () => {
        try {
          await removeLocale(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<LocaleWord>['columns'] = [
    {
      title: '번호',
      dataIndex: 'id',
      key: 'id',
    },

    {
      title: '다국어 키',
      dataIndex: 'key',
      key: 'key',
    },
    {
      title: '텍스트',
      dataIndex: 'value',
      key: 'value',
    },
    {
      title: '언어',
      dataIndex: 'locale',
      key: 'locale',
    },

    {
      title: '액션',
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
          <Input
            placeholder='키 값'
            value={key}
            onChange={(e) => {
              setKey(e.target.value);
            }}
          />
          <Input
            placeholder='텍스트'
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
            }}
          />
          <Button onClick={handleSearch}>검색</Button>
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
        dataSource={locales}
        columns={columns}
        rowKey={(row) => row.id}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
        loading={isLoading}
      />
      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={600}>
        <LocaleForm reload={refetch} close={() => setOpenCreate(false)} />
      </Drawer>

      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <LocaleForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
      </Drawer>
    </>
  );
}

export default LocaleList;
