import { removeRule } from "@/client/rule";
import { AppRule } from "@/client/types";
import useRules from "@/hooks/useRules";
import { Button, Drawer, Modal, Table, TableProps, message } from "antd";
import { Tag } from "antd/lib";
import { useState } from "react";
import ExpForm from "./ExpForm";

function ExpList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const { items, isLoading, refetch, totalPage } = useRules(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<AppRule | undefined>(undefined);

  const handleEdit = (value: AppRule) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: AppRule) => {
    modal.confirm({
      title: `삭제 (${value.key} - ${value.value})`,
      onOk: async () => {
        try {
          await removeRule(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<AppRule>["columns"] = [
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
      title: "다음 레벨업 필요 경험치",
      dataIndex: "value",
      key: "value",
    },
    {
      title: "활성화",
      dataIndex: "isActive",
      key: "isActive",
      render: (value) => <Tag color={value ? "green" : "default"}>{value ? "활성화" : "비활성화"}</Tag>,
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
        <ExpForm reload={refetch} close={() => setOpenCreate(false)} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <ExpForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
      </Drawer>
    </>
  );
}

export default ExpList;
