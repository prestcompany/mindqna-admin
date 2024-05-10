import { removeProfile, removeSpace } from "@/client/space";
import { Space, SpaceType } from "@/client/types";
import useSpaces from "@/hooks/useSpaces";
import { Button, Card, Drawer, Image, Modal, Pagination, Select, Tag, message } from "antd";
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
  const [focused, setFocused] = useState<string>("");

  const [filter, setFilter] = useState<{ type?: SpaceType[]; locale?: string[] }>({});
  const { items, totalPage, refetch } = useSpaces({
    page: currentPage,
    type: filter.type,
    locale: filter.locale,
  });

  const renderItem = (space: Space) => {
    const { coin, coinPaid, createdAt, dueRemovedAt, rooms, cardOrder } = space;
    const { type, name, locale, petName, noticeTime, ownerId } = space.spaceInfo;
    const { level } = space.pet;

    const created = dayjs(createdAt);
    const diffFromNow = dayjs().diff(created, "day");

    const copyId = (id: string) => {
      navigator.clipboard.writeText(id);
      api.success(`${id} 복사`);
    };

    const handleRemove = () => {
      modal.confirm({
        title: `삭제 (${name})`,
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

    return (
      <div key={space.id}>
        <Card title={name}>
          <div className="flex gap-4">
            <div className="flex flex-col flex-1 gap-2">
              <div className="flex items-center gap-2">
                <Button onClick={() => copyId(space.id)}>ID: {space.id}</Button>
              </div>

              <div>
                <Tag>생성일: D+{diffFromNow}</Tag>
                {created.format("YY.MM.DD HH:mm")}
              </div>

              {dueRemovedAt && <Tag color="error">삭제 예정일 {dueRemovedAt}</Tag>}

              <div className="flex items-center gap-2">
                <Tag>{type}</Tag>
                <Tag>언어 {locale}</Tag>
                <Tag>질문 수 {cardOrder}</Tag>
                <Tag>질문 생성 시간 {noticeTime}</Tag>
              </div>

              <div className="flex items-center gap-2">
                <Tag color="red">하트 {coin}</Tag>
                <Tag color="gold">스타 {coinPaid}</Tag>
                <Button
                  type="primary"
                  onClick={() => {
                    setFocused(space.id);
                    setOpenCoin(true);
                  }}
                >
                  코인 지급
                </Button>
              </div>

              <div className="flex items-center gap-2">
                <Tag>방 갯수 {rooms.length}</Tag>
                {rooms.map((room) => (
                  <div key={room.id}>{room.type}</div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Tag>펫이름: {petName}</Tag>
                <Tag>LV. {level}</Tag>
              </div>
              <Button onClick={handleRemove} type="primary">
                공간 삭제
              </Button>
            </div>

            <div className="flex flex-col gap-2 flex-2">
              <div>멤버 {space.profiles.length}</div>
              <div className="grid grid-cols-2">
                {space.profiles.map((profile) => {
                  const { isPremium, isGoldClub, userId } = profile;

                  const isOwenr = userId === ownerId;

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
                      <div className="flex flex-col gap-2">
                        <Button onClick={() => copyId(profile.id)}>ID: {profile.id}</Button>
                        <Button onClick={removePro} type="primary" size="small">
                          프로필 삭제
                        </Button>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>
      </div>
    );
  };

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
      </div>
      <div className="flex flex-col gap-2">{items.map(renderItem)}</div>
      <div className="flex justify-end p-4">
        <Pagination total={totalPage * 10} onChange={setCurrentPage} current={currentPage} showSizeChanger={false} />
      </div>

      <Drawer open={isOpenCreate} onClose={() => setOpenCreate(false)} width={1200}>
        <SpaceSearch />
      </Drawer>

      <Drawer
        open={isOpenCoin}
        onClose={() => {
          setOpenCoin(false);
          setFocused("");
        }}
        width={600}
      >
        <CoinForm
          reload={refetch}
          close={() => {
            setOpenCoin(false);
            setFocused("");
          }}
          spaceId={focused}
        />
      </Drawer>
    </>
  );
}

export default SpaceList;
