import { giveTicket } from "@/client/premium";
import { Button, Form, Input, InputNumber, Radio, Spin, message } from "antd";
import { useState } from "react";

type LocaleFormProps = {
  username: string;
  reload: () => Promise<any>;
  close: () => void;
};

function TicketForm({ username, reload, close }: LocaleFormProps) {
  const [isLoading, setLoading] = useState(false);

  const [amount, setAmount] = useState(1);
  const [meta, setMetaMessage] = useState("");
  const [type, setType] = useState<"per" | "sub">("sub");
  const [dueDayNum, setDueDayNum] = useState<number>(7);

  const categoriOptions = [
    { label: "영구", value: "per" },
    { label: "기간", value: "sub" },
  ];

  const save = async () => {
    try {
      setLoading(true);

      await giveTicket({
        username,
        amount,
        message: meta,
        dueDayNum: type === "sub" ? dueDayNum : undefined,
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
        <Form.Item label="username">
          <Input value={username} disabled />
        </Form.Item>
        <Form.Item label="영구/기간">
          <Radio.Group
            options={categoriOptions}
            optionType="button"
            buttonStyle="solid"
            value={type}
            onChange={(e) => setType(e.target.value)}
          />
        </Form.Item>

        {type === "sub" && (
          <Form.Item label="기간 (day)">
            <InputNumber min={1} value={dueDayNum} onChange={(e) => setDueDayNum(e ?? 1)} />
          </Form.Item>
        )}

        <Form.Item label="개수">
          <InputNumber min={1} value={amount} onChange={(e) => setAmount(e ?? 1)} />
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

export default TicketForm;
