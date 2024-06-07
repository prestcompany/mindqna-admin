import { getSpace, removeProfile, removeSpace } from "@/client/space";
import { Space } from "@/client/types";
import { useQuery } from "@tanstack/react-query";
import { Button, Card, Drawer, Image, Input, Modal, Tag, message } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import CoinForm from "./CoinForm";

function SpaceSearch() {
  const [modal, holder] = Modal.useModal();
  const [api, contextHolder] = message.useMessage();
  const [id, setId] = useState("");

  const [isOpenCoin, setOpenCoin] = useState(false);
  const [focused, setFocused] = useState<Space | undefined>(undefined);

  const { data, refetch } = useQuery({ queryKey: ["space"], queryFn: () => getSpace(id), enabled: false });

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
              <Button
                type="primary"
                onClick={() => {
                  setOpenCoin(true);
                  setFocused(data);
                }}
              >
                코인 지급
              </Button>
              <Button onClick={handleRemove}>공간 삭제</Button>
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Input placeholder="아이디로 검색" value={id} onChange={(e) => setId(e.target.value)} />
          <Button onClick={() => refetch()} type="primary">
            검색
          </Button>
        </div>
        {data && renderItem(data)}
      </div>

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
    </>
  );
}

export default SpaceSearch;
