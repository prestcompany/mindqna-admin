import { IAPProduct } from "@/client/premium";
import useProducts from "@/hooks/useProducts";
import { Modal, Table, TableProps, Tag } from "antd";
import dayjs from "dayjs";
import { useState } from "react";

function ProductList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);

  const { items, isLoading, refetch, totalPage } = useProducts({
    page: currentPage,
  });

  const columns: TableProps<IAPProduct>["columns"] = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "username",
      dataIndex: ["owner", "username"],
      key: "username",
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
      title: "구독/소모품",
      dataIndex: "dueAt",
      key: "dueAt",
      render: (value: string) => {
        return <Tag color={value ? "blue" : "pink"}>{value ? "구독" : "소모품"}</Tag>;
      },
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
      title: "만료일",
      dataIndex: "dueAt",
      key: "dueAt",
      render: (value: string) => {
        const day = dayjs(value);
        return <div> {value ? day.format("YY.MM.DD HH:mm") : ""}</div>;
      },
    },

    {
      title: "활성화",
      dataIndex: "isActive",
      key: "isActive",
      render: (value: boolean) => {
        return <Tag color={value ? "green" : "default"}>{value ? "활성화" : "만료"}</Tag>;
      },
    },
    {
      title: "PROD/TEST",
      dataIndex: "isProduction",
      key: "isProduction",
      render: (value: boolean) => {
        return <Tag color={value ? "purple-inverse" : "default"}>{value ? "PROD" : "TEST"}</Tag>;
      },
    },

    {
      title: "생성 시간",
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

export default ProductList;
