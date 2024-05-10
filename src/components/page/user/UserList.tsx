import { User } from "@/client/types";
import { removeUser } from "@/client/user";
import useUsers from "@/hooks/useUsers";
import { Button, Drawer, Modal, Select, Table, TableProps, Tag, message } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import TicketForm from "./TicketForm";

function UserList() {
  const [modal, holder] = Modal.useModal();

  const [currentPage, setCurrentPage] = useState(1);
  const [isOpenTicket, setOpenTicket] = useState(false);
  const [focused, setFocused] = useState<string>("");

  const [filter, setFilter] = useState<{ locale?: string[] }>({});
  const { items, totalPage, isLoading, refetch } = useUsers({ page: currentPage, locale: filter.locale });

  const handleRemove = (value: User) => {
    modal.confirm({
      title: `삭제 (${value.username}) ${value.socialAccount.email}`,
      onOk: async () => {
        try {
          await removeUser(value.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<User>["columns"] = [
    {
      title: "username",
      dataIndex: "username",
      key: "username",
    },

    {
      title: "이메일",
      dataIndex: ["socialAccount", "email"],
      key: "email",
    },
    {
      title: "LOGIN BY",
      dataIndex: ["socialAccount", "provider"],
      key: "provider",
      render: (value) => {
        const colorMap: Record<string, string> = {
          GOOGLE: "red",
          KAKAO: "yellow",
          APPLE: "black",
          LINE: "green",
        };
        return <Tag color={colorMap[value]}>{value}</Tag>;
      },
    },
    {
      title: "언어",
      dataIndex: "locale",
      key: "locale",
    },

    {
      title: "공간 수",
      dataIndex: ["profiles", "length"],
      key: "spaceLength",
    },
    {
      title: "공간최대치",
      dataIndex: "spaceMaxCount",
      key: "spaceMaxCount",
      render: (value: number) => {
        return (
          <div>
            <Tag color={value > 5 ? "gold" : "default"}>{value}</Tag>
          </div>
        );
      },
    },
    {
      title: "가입일",
      dataIndex: "createdAt",
      key: "createdAt",
      render: (value) => {
        const day = dayjs(value);
        const diffFromNow = dayjs().diff(day, "day");

        return (
          <div>
            <Tag>D+{diffFromNow}</Tag>
            {day.format("YY.MM.DD HH:mm")}
          </div>
        );
      },
    },
    {
      title: "탈퇴예정일",
      dataIndex: "reserveUnregisterAt",
      key: "reserveUnregisterAt",
      render: (value: string, item: User) => {
        const day = dayjs(value);
        const diff = day.add(-48, "hour").diff(item.createdAt, "minute");
        const gap = diff > 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;

        if (!value) return;

        return (
          <div>
            <Tag color={"error"}>{gap}만에 탈퇴</Tag>
            {day.format("YY.MM.DD HH:mm")}
          </div>
        );
      },
    },

    {
      title: "Action",
      dataIndex: "",
      key: "x",
      render: (value, user) => (
        <div className="flex gap-4">
          <Button
            type="primary"
            onClick={() => {
              setOpenTicket(true);
              setFocused(user.username);
            }}
          >
            티켓 지급
          </Button>

          <Button onClick={() => handleRemove(value)}>삭제</Button>
        </div>
      ),
    },
  ];
  return (
    <>
      {holder}
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
          ]}
          value={(filter.locale ?? [])?.[0]}
          onChange={(v: string) => {
            setFilter((prev) => ({ ...prev, locale: [v] }));
          }}
          allowClear
        />
      </div>
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
      <Drawer
        open={isOpenTicket}
        onClose={() => {
          setOpenTicket(false);
          setFocused("");
        }}
        width={600}
      >
        <TicketForm
          reload={refetch}
          close={() => {
            setOpenTicket(false);
            setFocused("");
          }}
          username={focused}
        />
      </Drawer>
    </>
  );
}

export default UserList;
