import { createLocale, updateLocale } from "@/client/locale";
import { Locale, LocaleWord } from "@/client/types";
import { Button, Form, Input, Radio, Spin, message } from "antd";
import { useEffect, useState } from "react";

type LocaleFormProps = {
  init?: LocaleWord;
};

function LocaleForm({ init }: LocaleFormProps) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [locale, setLocale] = useState<Locale>("ko");
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setLocale(init.locale);
    setKey(init.key);
    setValue(init.value);
  }, [init]);

  const localeOptions = [
    { label: "ko", value: "ko" },
    { label: "en", value: "en" },
    { label: "ja", value: "ja" },
    { label: "zh", value: "zh" },
  ];

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateLocale({
          id: focusedId,
          key,
          locale,
          value,
        });
      } else {
        await createLocale({
          key,
          locale,
          value,
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
        <Form.Item label="key">
          <Input value={key} onChange={(e) => setKey(e.target.value)} />
        </Form.Item>
        <Form.Item label="value">
          <Input value={value} onChange={(e) => setValue(e.target.value)} />
        </Form.Item>

        <Button onClick={save} size="large" type="primary">
          저장
        </Button>
      </Form>
    </>
  );
}

export default LocaleForm;
