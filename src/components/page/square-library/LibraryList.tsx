import { LibraryData, LibrarySubType, LibraryType } from '@/client/square-library';
import DefaultTableBtn from '@/components/shared/ui/default-table-btn';
import useLibrary from '@/hooks/useLibrary';
import { Button, Drawer, Modal, Select, Table } from 'antd';
import { useState } from 'react';
import { createColumns } from './columns';
import { subCategoryOptions } from './constants';
import { createDeleteHandler } from './handlers';
import LibraryForm from './LibraryForm';
import { useLibraryFilter } from './useLibraryFilter';

type Props = {
  type: LibraryType;
};

function LibraryList({ type }: Props) {
  const [modal, holder] = Modal.useModal();
  const [currentPage, setCurrentPage] = useState(1);
  const { filter, updateFilter } = useLibraryFilter();
  const { items, isLoading, refetch, totalPage } = useLibrary({ category: type, page: currentPage, ...filter });
  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<LibraryData | undefined>(undefined);

  const handleEdit = (value: LibraryData) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = createDeleteHandler(modal, refetch);

  const columns = createColumns({
    currentPage,
    onEdit: handleEdit,
    onRemove: handleRemove,
  });
  return (
    <>
      {holder}
      <DefaultTableBtn className='justify-between'>
        <div className='flex gap-2 items-center py-4'>
          {/* <Select
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
          /> */}
          <Select
            placeholder='타입'
            style={{ width: 180 }}
            options={subCategoryOptions[type]}
            value={filter.subCategory}
            onChange={(v: LibrarySubType) => {
              updateFilter({ subCategory: v });
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
