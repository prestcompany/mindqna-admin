import { PurchaseMeta } from "@/client/types";
import usePurchases from "@/hooks/usePruchase";
import { Modal, Table, TableProps, Tag } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

function PurchaseMetaList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);

  const { items, isLoading, refetch, totalPage } = usePurchases({
    page: currentPage,
  });

  const columns: TableProps<PurchaseMeta>["columns"] = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },

    {
      title: "플랫폼",
      dataIndex: "platform",
      key: "platform",
      render: (value: string) => {
        if (value === "EVENT") return <Tag color="red">EVENT</Tag>;
        if (value === "IOS") return <Tag>IOS</Tag>;
        if (value === "AOS") return <Tag color="green">AOS</Tag>;
      },
    },
    {
      title: "username",
      dataIndex: "username",
      key: "username",
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
      title: "구매/만료 시간",
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
