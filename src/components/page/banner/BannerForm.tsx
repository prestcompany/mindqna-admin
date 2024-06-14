import { Banner, createBanner, updateBanner } from "@/client/banner";
import { Locale } from "@/client/types";
import { Button, Form, Image, Input, Radio, Spin, message } from "antd";
import { useEffect, useState } from "react";
import AssetsDrawer from "../assets/AssetsDrawer";

export const locationOptions = [
  { label: "홈-우체통-하단", value: "main_bottom" },
  { label: "홈-네비게이터-하단", value: "main_right_small" },
  { label: "알림-헤더-하단", value: "push_top" },
  { label: "지갑-무료충전소-상단", value: "wallet_charge_top" },
  { label: "지갑-무료충전소-하단", value: "wallet_charge" },
];

type Props = {
  init?: Banner;
  reload: () => Promise<any>;
  close: () => void;
};

function BannerForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [imageUri, setImageUri] = useState<string>("");
  const [locale, setLocale] = useState<Locale>("ko");
  const [location, setLocation] = useState("");
  const [_name, setName] = useState("");
  const [link, setLink] = useState("");
  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!init) return;

    setImageUri(init.imgUri ?? "");
    setFocusedId(init.id);
    setLocale(init.locale);
    setLocation(init.location);
    setName(init.name);
    setLink(init.link);
    setIsActive(init.isActive);
  }, [init]);

  const localeOptions = [
    { label: "ko", value: "ko" },
    { label: "en", value: "en" },
    { label: "ja", value: "ja" },
    { label: "zh", value: "zh" },
  ];

  const activeOptions = [
    { label: "활성화", value: true },
    { label: "비활성화", value: false },
  ];

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateBanner({
          id: focusedId,
          locale,
          img: imageUri,
          link,
          location,
          name: _name,
          isActive,
        });
      } else {
        await createBanner({
          locale,
          img: imageUri,
          link,
          location,
          name: _name,
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
        <Form.Item label="이미지">
          <div className="flex flex-col items-center gap-2">
            {imageUri && <Image width={200} height={200} src={imageUri} alt="img" style={{ objectFit: "contain" }} />}
            <AssetsDrawer onClick={(img) => setImageUri(img.uri)} />
          </div>
        </Form.Item>
        <Form.Item label="locale">
          <Radio.Group
            options={localeOptions}
            optionType="button"
            buttonStyle="solid"
            value={locale}
            onChange={(e) => setLocale(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="이름">
          <Input value={_name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        <Form.Item label="위치">
          <Radio.Group options={locationOptions} value={location} onChange={(e) => setLocation(e.target.value)} />
        </Form.Item>
        <Form.Item label="링크">
          <Input value={link} onChange={(e) => setLink(e.target.value)} />
        </Form.Item>
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

export default BannerForm;
