import { TicketMeta } from "@/client/types";
import useTickets from "@/hooks/useTickets";
import { Modal, Table, TableProps, Tag } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

function TicketMetaList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);

  const [filter, setFilter] = useState<{ type?: ("permanent" | "subscribe")[] }>({});

  const { items, isLoading, refetch, totalPage } = useTickets({
    page: currentPage,
    type: filter.type,
  });

  const columns: TableProps<TicketMeta>["columns"] = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },

    {
      title: "플랫폼",
      dataIndex: "platform",
      key: "platform",
    },
    {
      title: "userId",
      dataIndex: "userId",
      key: "userId",
    },
    {
      title: "productId",
      dataIndex: "productId",
      key: "productId",
    },
    {
      title: "transactionId",
      dataIndex: "transactionId",
      key: "transactionId",
    },
    {
      title: "log",
      dataIndex: "log",
      key: "log",
    },
    {
      title: "구매/만료",
      dataIndex: "x",
      key: "x",
      render: (_, ticket) => {
        const isExpired = ticket.isExpired;
        const isPurchase = !isExpired && (ticket.isSuccess || dayjs(ticket.createdAt).isBefore("2024-06-01"));

        return (
          <div>
            {!isExpired && !isPurchase && <Tag color="red">실패</Tag>}
            {isPurchase && <Tag color="green">구매</Tag>}
            {isExpired && <Tag color="default">만료</Tag>}
          </div>
        );
      },
    },

    {
      title: "생성일",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => {
        const day = dayjs(value);
        const diffFromNow = dayjs().diff(day, "day");

        return <div>{day.format("YY.MM.DD HH:mm")}</div>;
      },
    },
  ];
  return (
    <>
      {holder}
      <div className="flex items-center gap-2 py-4">
        <span className="text-lg font-bold">필터</span>
        {/* <Select
          placeholder="타입"
          style={{ width: 120 }}
          options={[
            { label: "영구", value: "permanent" },
            { label: "구독", value: "subscribe" },
          ]}
          value={(filter.type ?? [])?.[0]}
          onChange={(v: string) => {
            setFilter((prev) => ({ ...prev, type: [v] as any }));
          }}
          allowClear
        /> */}
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

export default TicketMetaList;
