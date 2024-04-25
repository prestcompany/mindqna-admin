import { createBubble, updateBubble } from "@/client/bubble";
import { BubbleType, Locale, PetBubble } from "@/client/types";
import { Button, Form, Input, InputNumber, Radio, Spin, message } from "antd";
import { useEffect, useState } from "react";

type Props = {
  init?: PetBubble;
};

function BubbleForm({ init }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [locale, setLocale] = useState<Locale>("ko");
  const [_message, setMessage] = useState("");
  const [type, setType] = useState<BubbleType>("general");
  const [level, setLevel] = useState(0);

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setLocale(init.locale);
    setMessage(init.message);
    setType(init.type);
    setLevel(init.level);
  }, [init]);

  const localeOptions = [
    { label: "ko", value: "ko" },
    { label: "en", value: "en" },
    { label: "ja", value: "ja" },
    { label: "zh", value: "zh" },
  ];

  const typeOptions = [
    { label: "공통", value: "general" },
    { label: "오전", value: "day" },
    { label: "오후", value: "night" },
    { label: "커스텀", value: "custom" },
  ];

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateBubble({
          id: focusedId,
          locale,
          message: _message,
          level,
          type,
        });
      } else {
        await createBubble({
          locale,
          message: _message,
          level,
          type,
        });
      }

      window.location.reload();
    } catch (err) {
      message.error(`${err}`);
      setLoading(false);
    }
  };

  return (
    <>
      <Spin spinning={isLoading} fullscreen />
      <Form>
        <Form.Item label="locale">
          <Radio.Group
            options={localeOptions}
            optionType="button"
            buttonStyle="solid"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="메시지">
          <Input value={_message} onChange={(e) => setMessage(e.target.value)} />
        </Form.Item>
        <Form.Item label="타입">
          <Radio.Group
            options={typeOptions}
            optionType="button"
            buttonStyle="solid"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="레벨 (0: all)">
          <InputNumber min={0} value={level} onChange={(e) => setLevel(e ?? 0)} />
        </Form.Item>

        <Button onClick={save} size="large" type="primary">
          저장
        </Button>
      </Form>
    </>
  );
}

export default BubbleForm;
