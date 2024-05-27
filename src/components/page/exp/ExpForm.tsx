import { createRule, updateRule } from "@/client/rule";
import { AppRule } from "@/client/types";
import { Button, Form, Input, InputNumber, Spin, message } from "antd";
import { useEffect, useState } from "react";

type Props = {
  init?: AppRule;
  reload: () => Promise<any>;
  close: () => void;
};

function ExpForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [key, setKey] = useState("");
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setKey(init.key);
    setValue(init.value);
  }, [init]);

  const save = async () => {
    try {
      setLoading(true);

      if (focusedId) {
        await updateRule({
          id: focusedId,
          key,
          value,
          isActive: true,
        });
      } else {
        await createRule({
          key,
          value,
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
        <Form.Item label="key">
          <Input value={key} onChange={(e) => setKey(e.target.value)} />
        </Form.Item>
        <Form.Item label="value">
          <InputNumber value={value} onChange={(value) => setValue(value ?? 0)} />
        </Form.Item>

        <Button onClick={save} size="large" type="primary">
          저장
        </Button>
      </Form>
    </>
  );
}

export default ExpForm;
