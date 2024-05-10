import { giveCoin } from "@/client/premium";
import { Button, Form, Input, InputNumber, Radio, Spin, message } from "antd";
import { useState } from "react";

type LocaleFormProps = {
  spaceId: string;
  reload: () => Promise<any>;
  close: () => void;
};

function CoinForm({ spaceId, reload, close }: LocaleFormProps) {
  const [isLoading, setLoading] = useState(false);

  const [amount, setAmount] = useState(1);
  const [isStar, setStar] = useState(false);
  const [meta, setMetaMessage] = useState("");

  const premiumOptions = [
    { label: "스타", value: true },
    { label: "하트", value: false },
  ];

  const save = async () => {
    try {
      setLoading(true);

      await giveCoin({
        spaceId,
        isStar,
        amount,
        message: meta,
      });
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
        <Form.Item label="공간 ID">
          <Input value={spaceId} disabled />
        </Form.Item>

        <Form.Item label="개수">
          <InputNumber min={1} value={amount} onChange={(e) => setAmount(e ?? 1)} />
        </Form.Item>

        <Form.Item label="코인 타입">
          <Radio.Group
            options={premiumOptions}
            optionType="button"
            buttonStyle="solid"
            value={isStar}
            onChange={(e) => setStar(e.target.value)}
          />
        </Form.Item>

        <Form.Item label="locale key">
          <Input value={meta} onChange={(e) => setMetaMessage(e.target.value)} />
        </Form.Item>

        <Button onClick={save} size="large" type="primary">
          저장
        </Button>
      </Form>
    </>
  );
}

export default CoinForm;
