import { RoomCategory, RoomTemplate, createRoom, updateRoom } from "@/client/room";
import { Button, Form, Input, InputNumber, Radio, Spin, message } from "antd";
import { useEffect, useState } from "react";

export const categoryOptions = [
  { label: "다락방", value: "rooftop" },
  { label: "실내", value: "inner" },
  { label: "야외", value: "outer" },
];

type Props = {
  init?: RoomTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

function RoomForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<RoomCategory>("inner");
  const [price, setPrice] = useState(0);
  const [isPaid, setIsPaid] = useState(false);

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setName(init.type);
    setCategory(init.category);
    setPrice(init.price);
    setIsPaid(init.isPaid);

    setIsActive(init.isActive);
  }, [init]);

  const premiumOptions = [
    { label: "스타", value: true },
    { label: "하트", value: false },
  ];

  const activeOptions = [
    { label: "활성화", value: true },
    { label: "비활성화", value: false },
  ];

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateRoom({
          id: focusedId,
          name,
          category,
          isPaid,
          price,
          isActive,
        });
      } else {
        await createRoom({
          name,
          category,
          isPaid,
          price,
        });
      }

      await reload();
      close();
    } catch (err) {
      message.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      <Spin spinning={isLoading} fullscreen />
      <Form>
        <Form.Item label="이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>

        <Form.Item label="카테고리">
          <Radio.Group
            options={categoryOptions}
            optionType="button"
            buttonStyle="solid"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </Form.Item>

        <div className="flex items-center gap-6">
          <Form.Item label="코인 타입">
            <Radio.Group
              options={premiumOptions}
              optionType="button"
              buttonStyle="solid"
              value={isPaid}
              onChange={(e) => setIsPaid(e.target.value)}
            />
          </Form.Item>
          <Form.Item label="가격">
            <InputNumber min={0} value={price} onChange={(v) => setPrice(v ? v : 0)} />
          </Form.Item>
        </div>

        <Form.Item label="활성화">
          <Radio.Group
            options={activeOptions}
            optionType="button"
            buttonStyle="solid"
            value={isActive}
            onChange={(e) => setIsActive(e.target.value)}
            disabled={!focusedId}
          />
        </Form.Item>

        <Button onClick={save} size="large" type="primary">
          저장
        </Button>
      </Form>
    </>
  );
}

export default RoomForm;
