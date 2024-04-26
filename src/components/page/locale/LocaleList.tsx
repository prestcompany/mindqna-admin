import { removeLocale } from "@/client/locale";
import { LocaleWord } from "@/client/types";
import useLocales from "@/hooks/useLocales";
import { Button, Drawer, Modal, Table, TableProps, message } from "antd";
import { useState } from "react";
import LocaleForm from "./LocaleForm";

function LocaleList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const { locales, totalPage, isLoading, refetch } = useLocales(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<LocaleWord | undefined>(undefined);

  const handleEdit = (value: LocaleWord) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: LocaleWord) => {
    modal.confirm({
      title: `삭제 (${value.key} - ${value.value})`,
      onOk: async () => {
        try {
          await removeLocale(value.id);
          window.location.reload();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<LocaleWord>["columns"] = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },

    {
      title: "key",
      dataIndex: "key",
      key: "key",
    },
    {
      title: "value",
      dataIndex: "value",
      key: "value",
    },
    {
      title: "locale",
      dataIndex: "locale",
      key: "locale",
    },

    {
      title: "Action",
      dataIndex: "",
      key: "x",
      render: (value) => (
        <div className="flex gap-4">
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
        type="primary"
        size="large"
      >
        추가
      </Button>
      <Table
        dataSource={locales}
        columns={columns}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
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
