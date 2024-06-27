import { Coupon, removeCoupon } from "@/client/coupon";
import useCoupons from "@/hooks/useCoupons";
import { Button, Drawer, Modal, Table, TableProps, Tag, message } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import CouponForm from "./CouponForm";

function CouponList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const { items, isLoading, refetch, totalPage } = useCoupons(currentPage);

  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenEdit, setOpenEdit] = useState(false);
  const [focused, setFocused] = useState<Coupon | undefined>(undefined);

  const handleEdit = (value: Coupon) => {
    setFocused(value);
    setOpenEdit(true);
  };

  const handleRemove = (value: Coupon) => {
    modal.confirm({
      title: `삭제 (${value.name})`,
      onOk: async () => {
        try {
          await removeCoupon(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<Coupon>["columns"] = [
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
      title: "code",
      dataIndex: "code",
      key: "code",
    },

    {
      title: "히트",
      dataIndex: "heart",
      key: "star",
      render: (value: number) => {
        return <Tag color={"red"}>{value}</Tag>;
      },
    },
    {
      title: "스타",
      dataIndex: "star",
      key: "star",
      render: (value: boolean) => {
        return <Tag color={"gold"}>{value}</Tag>;
      },
    },

    {
      title: "티켓 수",
      dataIndex: "ticketCount",
      key: "ticketCount",
      render: (value: boolean) => {
        return <Tag color={"purple-inverse"}>{value}</Tag>;
      },
    },
    {
      title: "티켓 혜택 일",
      dataIndex: "ticketDueDayNum",
      key: "ticketDueDayNum",
      render: (value: boolean) => {
        return <Tag color={"purple"}>{value}</Tag>;
      },
    },

    {
      title: "만료일",
      dataIndex: "dueAt",
      key: "dueAt",
      render: (value: string) => {
        const day = dayjs(value);
        return <div>{value ? day.format("YY.MM.DD HH:mm") : ""}</div>;
      },
    },

    {
      title: "사용",
      dataIndex: "username",
      key: "username",
      render: (value: string) => {
        return <div> {value || "미사용"}</div>;
      },
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
        <CouponForm reload={refetch} close={() => setOpenCreate(false)} />
      </Drawer>
      <Drawer open={isOpenEdit} onClose={() => setOpenEdit(false)} width={600}>
        <CouponForm init={focused} reload={refetch} close={() => setOpenEdit(false)} />
      </Drawer>
    </>
  );
}

export default CouponList;
