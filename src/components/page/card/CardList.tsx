import { publishCardTemplates, removeCardTemplate, unpublishCardTemplates } from "@/client/card";
import { CardTemplate, CardTemplateType, GetCardTemplatesResult, SpaceType } from "@/client/types";
import useCardTemplates from "@/hooks/useCardTemplates";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Drawer, Modal, Select, Table, TableProps, Tag, message } from "antd";
import { produce } from "immer";
import { useState } from "react";
import CardForm from "./CardForm";

function CardList() {
  const queryClient = useQueryClient();

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<CardTemplate | undefined>(undefined);

  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [filter, setFilter] = useState<{ type?: CardTemplateType[]; spaceType?: SpaceType[]; locale?: string[] }>({});
  const [modal, holder] = Modal.useModal();

  const { templates, totalPage, isLoading, refetch } = useCardTemplates({ page: currentPage, ...filter });

  const handleEdit = (value: CardTemplate) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: CardTemplate) => {
    modal.confirm({
      title: `삭제 ${value.name}`,
      onOk: async () => {
        await removeCardTemplate(value.id);
        await refetch();
      },
    });
  };

  const onSelectChange = (newSelectedRowKeys: React.Key[]) => {
    setSelectedRowKeys(newSelectedRowKeys);
  };

  const handlePressPublish = async () => {
    try {
      setLoading(true);
      await publishCardTemplates(selectedRowKeys as number[]);
      queryClient.setQueryData<GetCardTemplatesResult>(["cardTemplates"], (prev) => {
        if (!prev) return;
        return produce(prev, (draft) => {
          draft.templates.forEach((template) => {
            if (selectedRowKeys.includes(template.id)) {
              template.isPublished = true;
            }
          });
        });
      });
      messageApi.success({ content: "성공" });
    } catch (err) {
      console.error(err);
      messageApi.error({ content: `실패 : ${err}` });
    }
    setLoading(false);
  };

  const handlePressUnpublish = async () => {
    try {
      setLoading(true);
      await unpublishCardTemplates(selectedRowKeys as number[]);
      messageApi.success({ content: "성공" });
      queryClient.setQueryData<GetCardTemplatesResult>(["cardTemplates"], (prev) => {
        if (!prev) return;
        return produce(prev, (draft) => {
          draft.templates.forEach((template) => {
            if (selectedRowKeys.includes(template.id)) {
              template.isPublished = false;
            }
          });
        });
      });
    } catch (err) {
      console.error(err);
      messageApi.error({ content: `실패 : ${err}` });
    }
    setLoading(false);
  };

  const columns: TableProps<CardTemplate>["columns"] = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },

    {
      title: "이름",
      dataIndex: "name",
      key: "name",
      width: 700,
    },
    {
      title: "순서",
      dataIndex: "order",
      key: "order",
    },
    {
      title: "언어",
      dataIndex: "locale",
      key: "locale",
    },
    {
      title: "질문타입",
      dataIndex: "type",
      key: "type",
    },
    {
      title: "공간타입",
      dataIndex: "spaceType",
      key: "spaceType",
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
    {
      title: "상태",
      dataIndex: "isPublished",
      key: "isPublished",
      render: (value) => {
        return <Tag color={value ? "success" : "default"}>{value ? "published" : "waiting"}</Tag>;
      },
    },
  ];

  const rowSelection = {
    selectedRowKeys,
    onChange: onSelectChange,
    selections: [Table.SELECTION_ALL],
  };
  const hasSelected = selectedRowKeys.length > 0;

  return (
    <div>
      {contextHolder}
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
      <div className="flex items-center gap-2 py-4">
        <span className="text-lg font-bold">필터</span>
        <Select
          placeholder="언어"
          style={{ width: 120 }}
          options={[
            { label: "ko", value: "ko" },
            { label: "en", value: "en" },
            { label: "ja", value: "ja" },
            { label: "zh", value: "zh" },
            { label: "zhTw", value: "zhTw" },
            { label: "es", value: "es" },
          ]}
          value={(filter.locale ?? [])?.[0]}
          onChange={(v: string) => {
            setFilter((prev) => ({ ...prev, locale: [v] }));
          }}
          allowClear
        />
        <Select
          placeholder="질문타입"
          style={{ width: 120 }}
          options={[
            { label: "basic", value: "basic" },
            { label: "bonus", value: "bonus" },
          ]}
          value={(filter.type ?? [])?.[0]}
          onChange={(v: CardTemplateType) => {
            setFilter((prev) => ({ ...prev, type: [v] }));
          }}
          allowClear
        />
        <Select
          placeholder="공간타입"
          style={{ width: 120 }}
          options={[
            { label: "혼자", value: "alone" },
            { label: "커플", value: "couple" },
            { label: "가족", value: "family" },
            { label: "친구", value: "friends" },
          ]}
          value={(filter.spaceType ?? [])?.[0]}
          onChange={(v: SpaceType) => {
            setFilter((prev) => ({ ...prev, spaceType: [v] }));
          }}
          allowClear
        />
      </div>
      <Table
        rowSelection={rowSelection}
        rowKey={"id"}
        columns={columns}
        dataSource={templates}
        pagination={{
          total: totalPage * 10,
          current: currentPage,
          onChange: (page) => setCurrentPage(page),
          showSizeChanger: false,
        }}
        loading={loading || isLoading}
      />
      <div className="flex gap-3">
        <Button onClick={handlePressPublish} disabled={!hasSelected} type="primary" loading={loading}>
          publish
        </Button>
        <Button onClick={handlePressUnpublish} disabled={!hasSelected} loading={loading}>
          unpublish
        </Button>
      </div>
      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={600}>
        <CardForm reload={refetch} close={() => setOpenCreate(false)} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <CardForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
      </Drawer>
    </div>
  );
}

export default CardList;
