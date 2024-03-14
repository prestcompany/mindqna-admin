import { createCardTemplate } from "@/client/card";
import { CardTemplateType, SpaceType } from "@/client/types";
import { Button, Checkbox, Divider, Form, Input, Radio, message } from "antd";
import { useState } from "react";

function CardForm() {
  const [isLoading, setLoading] = useState(false);
  const [messageApi, contextHolder] = message.useMessage();

  const optionsLocale: { label: string; value: string }[] = [
    { label: "ko", value: "ko" },
    { label: "en", value: "en" },
    { label: "ja", value: "ja" },
    { label: "zh", value: "zh" },
  ];

  const optionsType: { label: string; value: CardTemplateType }[] = [
    {
      label: "basic",
      value: "basic",
    },
    {
      label: "bonus",
      value: "bonus",
    },
    // {
    //   label: "랜덤",
    //   value: "random",
    // },
  ];

  const optionsSpaceType: { label: string; value: SpaceType }[] = [
    { label: "alone", value: "alone" },
    { label: "couple", value: "couple" },
    { label: "family", value: "family" },
    { label: "friends", value: "friends" },
  ];

  const [locale, setLocale] = useState(optionsLocale[0].value);
  const [name, setName] = useState("");
  const [type, setType] = useState<CardTemplateType>(optionsType[0].value);
  const [spaceTypes, setSpaceTypes] = useState<SpaceType[]>([]);

  const checkAll = optionsSpaceType.length === spaceTypes.length;
  const indeterminate = spaceTypes.length > 0 && spaceTypes.length < optionsSpaceType.length;

  const disabled = !locale || !name || !type || spaceTypes.length <= 0;

  const clearAll = () => {
    setLocale(optionsLocale[0].value);
    setName("");
    setType(optionsType[0].value);
    setSpaceTypes([]);
  };

  const handleSubmit = async () => {
    if (disabled) return;
    try {
      setLoading(true);
      await createCardTemplate({ name, locale, type, spaceTypes });
      messageApi.success({
        content: "성공",
      });
      clearAll();
    } catch (err) {
      messageApi.error({
        content: `실패 ${err}`,
      });
    }
    setLoading(false);
  };

  return (
    <div>
      {contextHolder}
      <Form>
        <Form.Item label="언어">
          <Radio.Group
            options={optionsLocale}
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
        <Form.Item label="이름">
          <Input placeholder="질문" value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        <Form.Item label="질문 타입">
          <Radio.Group
            options={optionsType}
            value={type}
            onChange={(e) => setType(e.target.value)}
            optionType="button"
            buttonStyle="solid"
          />
        </Form.Item>
        <Form.Item label="공간 타입">
          <Checkbox
            indeterminate={indeterminate}
            checked={checkAll}
            onChange={(e) => setSpaceTypes(e.target.checked ? optionsSpaceType.map((option) => option.value) : [])}
          >
            all
          </Checkbox>
          <Divider type="vertical" />
          <Checkbox.Group
            options={optionsSpaceType}
            value={spaceTypes}
            onChange={(checked) => setSpaceTypes(checked)}
          />
        </Form.Item>
        <Form.Item>
          <Button onClick={handleSubmit} type="primary" htmlType="submit" disabled={disabled} loading={isLoading}>
            저장
          </Button>
        </Form.Item>
      </Form>
    </div>
  );
}

export default CardForm;
