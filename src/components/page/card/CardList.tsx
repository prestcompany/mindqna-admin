import { publishCardTemplates, unpublishCardTemplates } from "@/client/card";
import { CardTemplate, CardTemplateType, GetCardTemplatesResult, SpaceType } from "@/client/types";
import useCardTemplates from "@/hooks/useCardTemplates";
import { useQueryClient } from "@tanstack/react-query";
import { Button, Table, TableProps, Tag, message } from "antd";
import { produce } from "immer";
import { useState } from "react";

function CardList() {
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([]);
  const [messageApi, contextHolder] = message.useMessage();
  const [filter, setFilter] = useState<{ type?: CardTemplateType[]; spaceType?: SpaceType[]; locale?: string[] }>({});

  const { templates, totalPage, isLoading } = useCardTemplates({ page: currentPage, ...filter });

  const handleTableChange: TableProps<CardTemplate>["onChange"] = async (pagination, filter) => {
    setFilter(filter);
    console.log(filter);
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
      filters: [
        { text: "ko", value: "ko" },
        { text: "en", value: "en" },
        { text: "ja", value: "ja" },
        { text: "zh", value: "zh" },
      ],
    },
    {
      title: "질문타입",
      dataIndex: "type",
      key: "type",
      filters: [
        { text: "basic", value: "basic" },
        { text: "bonus", value: "bonus" },
      ],
    },
    {
      title: "공간타입",
      dataIndex: "spaceType",
      key: "spaceType",
      filters: [
        { text: "alone", value: "alone" },
        { text: "couple", value: "couple" },
        { text: "family", value: "family" },
        { text: "friends", value: "friends" },
      ],
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
      <Table
        rowSelection={rowSelection}
        rowKey={"id"}
        columns={columns}
        dataSource={templates}
        pagination={{ total: totalPage * 10, current: currentPage, onChange: (page) => setCurrentPage(page) }}
        loading={loading || isLoading}
        onChange={handleTableChange}
      />
      <div className="flex gap-3">
        <Button onClick={handlePressPublish} disabled={!hasSelected} type="primary" loading={loading}>
          publish
        </Button>
        <Button onClick={handlePressUnpublish} disabled={!hasSelected} loading={loading}>
          unpublish
        </Button>
      </div>
    </div>
  );
}

export default CardList;
