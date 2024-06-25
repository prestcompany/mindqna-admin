import { removeProfile, removeSpace } from "@/client/space";
import { Space, SpaceType } from "@/client/types";
import useSpaces from "@/hooks/useSpaces";
import { Button, Card, Drawer, Image, Modal, Select, Table, Tag, message } from "antd";
import { TableProps } from "antd/lib";
import dayjs from "dayjs";
import { useState } from "react";
import CoinForm from "./CoinForm";
import SpaceSearch from "./SpaceSearch";

function SpaceList() {
  const [modal, holder] = Modal.useModal();
  const [api, contextHolder] = message.useMessage();

  const [currentPage, setCurrentPage] = useState(1);
  const [isOpenCreate, setOpenCreate] = useState(false);
  const [isOpenCoin, setOpenCoin] = useState(false);
  const [isOpenProfile, setOpenProfile] = useState(false);

  const [focused, setFocused] = useState<Space | undefined>(undefined);

  const [filter, setFilter] = useState<{ type?: SpaceType[]; locale?: string[]; orderBy?: string }>({});
  const { items, totalPage, refetch, isLoading } = useSpaces({
    page: currentPage,
    type: filter.type,
    locale: filter.locale,
    orderBy: filter.orderBy as any,
  });

  const handleViewProfiles = (space: Space) => {
    setOpenProfile(true);
    setFocused(space);
  };

  const copyId = (id: string) => {
    navigator.clipboard.writeText(id);
    api.success(`${id} 복사`);
  };

  const handleRemove = (space: Space) => {
    modal.confirm({
      title: `삭제 (${space.id}) ${space.spaceInfo.name}`,
      onOk: async () => {
        try {
          await removeSpace(space.id);
          await refetch();
        } catch (err) {
          message.error(`${err}`);
        }
      },
    });
  };

  const columns: TableProps<Space>["columns"] = [
    {
      title: "id",
      dataIndex: "id",
      key: "id",
    },
    {
      title: "이름",
      dataIndex: ["spaceInfo", "name"],
      key: "name",
    },
    {
      title: "타입",
      dataIndex: ["spaceInfo", "type"],
      key: "type",
    },
    {
      title: "언어",
      dataIndex: ["spaceInfo", "locale"],
      key: "locale",
    },
    {
      title: "멤버 수",
      dataIndex: ["spaceInfo", "members"],
      key: "members",
    },
    {
      title: "카드 수",
      dataIndex: "cardOrder",
      key: "cardOrder",
    },
    {
      title: "답변 수",
      dataIndex: ["spaceInfo", "replies"],
      key: "replies",
    },
    {
      title: "하트/스타",
      dataIndex: "",
      key: "x",
      render: (_, space) => {
        return (
          <div className="flex gap-1">
            <Tag color="red">하트 {space.coin}</Tag>
            <Tag color="gold">스타 {space.coinPaid}</Tag>
          </div>
        );
      },
    },
    {
      title: "펫 LV",
      dataIndex: ["pet", "level"],
      key: "level",
      render: (level, space) => {
        return (
          <div className="flex gap-1">
            <Tag color="cyan">lv.{level}</Tag>
            <Tag color="blue">{space.pet.exp.toFixed(1)}</Tag>
          </div>
        );
      },
    },
    {
      title: "방/인테리어 갯수",
      dataIndex: ["rooms", "length"],
      key: "rooms",
      render: (count, space) => {
        return (
          <div className="flex gap-1">
            <Tag color="purple">{count}</Tag>
            <Tag color="orange">{space.InteriorItem.length}</Tag>
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
      title: "삭제예정일",
      dataIndex: "dueRemovedAt",
      key: "dueRemovedAt",
      render: (value: string, item: Space) => {
        const isPremium = item.profiles?.[0]?.isPremium;
        const day = dayjs(value);
        let diff = day.add(isPremium ? -60 : -30, "day").diff(item.createdAt, "minute");

        if (diff < 0) {
          diff = day.subtract(2, "day").diff(item.createdAt, "minute");
        }

        const gap = diff > 60 ? `${Math.floor(diff / 60)}시간 ${diff % 60}분` : `${diff}분`;

        if (!value) return;

        return (
          <div>
            <Tag color={"error"}>{gap}만에 삭제</Tag>
            {day.format("YY.MM.DD HH:mm")}
          </div>
        );
      },
    },

    {
      title: "Action",
      dataIndex: "",
      key: "x",
      render: (value, space) => (
        <div className="flex gap-4">
          <Button
            type="link"
            onClick={() => {
              handleViewProfiles(space);
            }}
          >
            멤버 보기
          </Button>
          <Button
            type="primary"
            onClick={() => {
              setOpenCoin(true);
              setFocused(space);
            }}
          >
            코인 지급
          </Button>

          <Button onClick={() => handleRemove(space)}>삭제</Button>
        </div>
      ),
    },
  ];

  return (
    <>
      {holder}
      {contextHolder}
      <div className="flex items-center gap-2 py-4">
        <Button onClick={() => setOpenCreate(true)} type="primary">
          검색하기
        </Button>
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
        <Select
          placeholder="공간 타입"
          style={{ width: 120 }}
          options={[
            { label: "혼자", value: "alone" },
            { label: "커플", value: "couple" },
            { label: "가족", value: "family" },
            { label: "친구", value: "friends" },
          ]}
          value={(filter.type ?? [])?.[0]}
          onChange={(v: SpaceType) => {
            setFilter((prev) => ({ ...prev, type: [v] }));
          }}
          allowClear
        />

        <span className="text-lg font-bold">정렬</span>

        <Select
          placeholder="정렬"
          style={{ width: 120 }}
          options={[
            { label: "카드 많은 순", value: "card" },
            { label: "답변 많은 순", value: "replies" },
            { label: "레벨 높은 순", value: "level" },
            { label: "멤버 많은 순", value: "members" },
          ]}
          value={(filter.type ?? [])?.[0]}
          onChange={(v: string) => {
            setFilter((prev) => ({ ...prev, orderBy: v }));
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

      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={1200}>
        <SpaceSearch />
      </Drawer>

      <Drawer
        open={isOpenCoin}
        onClose={() => {
          setOpenCoin(false);
          setFocused(undefined);
        }}
        width={600}
      >
        <CoinForm
          reload={refetch}
          close={() => {
            setOpenCoin(false);
            setFocused(undefined);
          }}
          spaceId={focused?.id ?? ""}
        />
      </Drawer>
      {focused && (
        <Modal open={isOpenProfile} footer={null} onCancel={() => setOpenProfile(false)}>
          {focused.profiles.map((profile) => {
            const { isPremium, isGoldClub, userId } = profile;

            const isOwenr = userId === focused.spaceInfo.ownerId;

            const removePro = async () => {
              modal.confirm({
                title: `삭제 (${profile.nickname})`,
                onOk: async () => {
                  try {
                    await removeProfile(profile.id);
                    await refetch();
                  } catch (err) {
                    message.error(`${err}`);
                  }
                },
              });
            };

            return (
              <Card key={profile.id} style={{ background: "#fefefe" }}>
                <div className="flex items-center gap-2">
                  <Image src={profile.img?.uri} style={{ width: 40, height: 40 }} />
                  {profile.nickname}
                  {isOwenr && <Tag color="black">OWNER</Tag>}
                  {isPremium && <Tag color="green-inverse">PREMIUM</Tag>}
                  {isGoldClub && <Tag color="gold">STAR CLUB</Tag>}
                </div>
                <div className="flex flex-col gap-4">
                  <Tag>ID: {profile.id}</Tag>
                  <Button onClick={() => copyId(profile.user.username)} type="primary">
                    username {profile.user.username}
                  </Button>
                  <Button onClick={removePro} type="default" size="small">
                    프로필 삭제
                  </Button>
                </div>
              </Card>
            );
          })}
        </Modal>
      )}
    </>
  );
}

export default SpaceList;
