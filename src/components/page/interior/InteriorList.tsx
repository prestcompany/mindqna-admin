import { removeInteriorTemplate } from "@/client/interior";
import { ImgItem, InteriorTemplate } from "@/client/types";
import useInteriors from "@/hooks/useInteriors";
import { Button, Drawer, Image, Modal, Table, Tag, message } from "antd";
import { TableProps } from "antd/lib";
import { useState } from "react";
import InteriorForm from "./InteriorForm";

function InteriorList() {
  const [modal, holder] = Modal.useModal();

  const { templates, fetchMore, hasNextPage, isLoading } = useInteriors();

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<InteriorTemplate | undefined>(undefined);

  const handleEdit = (value: InteriorTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: InteriorTemplate) => {
    modal.confirm({
      title: `삭제 ${value.name}`,
      onOk: async () => {
        try {
          await removeInteriorTemplate(value.id);
          window.location.reload();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<InteriorTemplate>["columns"] = [
    {
      title: "이미지",
      dataIndex: "img",
      key: "img",
      render: (value: ImgItem) => {
        return <Image width={"100%"} height={100} src={value?.uri ?? ""} alt="img" style={{ objectFit: "contain" }} />;
      },
    },
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },

    {
      title: "이름",
      dataIndex: "name",
      key: "name",
    },
    {
      title: "타입",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "방 타입",
      dataIndex: "room",
      key: "room",
    },
    {
      title: "카테고리",
      dataIndex: "category",
      key: "category",
    },
    {
      title: "가격",
      dataIndex: "price",
      key: "price",
    },
    {
      title: "무/유료",
      dataIndex: "isPaid",
      key: "isPaid",
      render: (value: boolean) => {
        return <Tag color={value ? "success" : "default"}>{value ? "유료" : "무료"}</Tag>;
      },
    },
    {
      title: "width",
      dataIndex: "width",
      key: "width",
    },
    {
      title: "height",
      dataIndex: "height",
      key: "height",
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
      <Table dataSource={templates} columns={columns} />
      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={600}>
        <InteriorForm />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <InteriorForm init={focused} />
      </Drawer>
    </>
  );
}

export default InteriorList;
