import { giveTicket } from "@/client/premium";
import { Button, Form, Input, InputNumber, Spin, message } from "antd";
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

  const save = async () => {
    try {
      setLoading(true);

      await giveTicket({
        username,
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
        <Form.Item label="username">
          <Input value={username} disabled />
        </Form.Item>

        <Form.Item label="개수">
          <InputNumber min={1} value={amount} onChange={(e) => setAmount(e ?? 1)} />
        </Form.Item>
        <Form.Item label="메시지 (유저 히스토리에 표시 됨)">
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
