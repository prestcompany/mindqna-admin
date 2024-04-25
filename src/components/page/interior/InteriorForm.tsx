import { createInteriorTemplate } from "@/client/interior";
import { FileType, getBase64 } from "@/lib/img";
import { Button, Form, Input, InputNumber, Radio, Upload, UploadProps, message } from "antd";
import ImgCrop from "antd-img-crop";
import { RcFile } from "antd/es/upload";
import { LoaderIcon, Plus } from "lucide-react";
import { useState } from "react";

function InteriorForm() {
  const [loading, setLoading] = useState(false);
  const [image, setImage] = useState<RcFile>();
  const [imageUrl, setImageUrl] = useState<string>();
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [isPremium, setIsPremium] = useState(true);
  const [price, setPrice] = useState(0);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [coords, setCoords] = useState<{ x: number; y: number }[]>([]);

  const coordOptions = Array.from({ length: 7 * 13 }, (_, index) => ({
    x: index % 7,
    y: Math.floor(index / 7),
  })).map((coord) => ({ label: `(${coord.x},${coord.y})`, value: coord }));

  const premiumOptions = [
    { label: "유료", value: true },
    { label: "무료", value: false },
  ];

  const handleChange: UploadProps["onChange"] = (info) => {
    if (info.file.status === "uploading") {
      setLoading(true);
      return;
    }
    if (info.file.status === "done") {
      console.log(info.file);
      setImage(info.file.originFileObj);
      getBase64(info.file.originFileObj as FileType, (url) => {
        setLoading(false);
        setImageUrl(url);
      });
    }
  };

  const uploadButton = (
    <button
      className="flex flex-col items-center justify-center"
      style={{ border: 0, background: "none" }}
      type="button"
    >
      {loading ? <LoaderIcon /> : <Plus />}
      <div style={{ marginTop: 8 }}>Upload</div>
    </button>
  );

  const beforeUpload = (file: FileType) => {
    const isJpgOrPng = file.type === "image/jpeg" || file.type === "image/png";
    if (!isJpgOrPng) {
      message.error("You can only upload JPG/PNG file!");
    }
    const isLt2M = file.size / 1024 / 1024 < 2;
    if (!isLt2M) {
      message.error("Image must smaller than 2MB!");
    }
    return isJpgOrPng && isLt2M;
  };

  const save = async () => {
    try {
      if (!imageUrl || !image) return;

      await createInteriorTemplate({
        img: image,
        name,
        category,
        disablePositions: findMismatchedCoords(coords, coordOptions),
        height,
        isPaid: isPremium,
        price,
        type: "item",
        width,
      });
    } catch (err) {}
  };

  return (
    <Form>
      <Form.Item label="이미지">
        <ImgCrop fillColor="transparent" quality={1}>
          <Upload
            // listType="picture-card"
            className="avatar-uploader"
            showUploadList={false}
            beforeUpload={beforeUpload}
            onChange={handleChange}
          >
            {imageUrl ? <img src={imageUrl} alt="avatar" style={{ width: "100%" }} /> : uploadButton}
          </Upload>
        </ImgCrop>
      </Form.Item>
      <Form.Item label="이름">
        <Input value={name} onChange={(e) => setName(e.target.value)} />
      </Form.Item>
      <Form.Item label="카테고리">
        <Input value={category} onChange={(e) => setCategory(e.target.value)} />
      </Form.Item>
      <div className="flex items-center gap-6">
        <Form.Item label="코인 타입">
          <Radio.Group
            options={premiumOptions}
            optionType="button"
            buttonStyle="solid"
            value={isPremium}
            onChange={(e) => setIsPremium(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="가격">
          <InputNumber min={0} value={price} onChange={(v) => setPrice(v ? v : 0)} />
        </Form.Item>
      </div>
      <div className="flex gap-4">
        <Form.Item label="width">
          <InputNumber min={1} max={7} value={width} onChange={(v) => setWidth(v ? v : 1)} />
        </Form.Item>
        <Form.Item label="height">
          <InputNumber min={1} max={13} value={height} onChange={(v) => setHeight(v ? v : 1)} />
        </Form.Item>
      </div>
      <Form.Item label="배치 가능 좌표">
        <div className="grid grid-cols-7">
          {coordOptions.map((option) => {
            const isSelected = coords.some(({ x, y }) => x === option.value.x && y === option.value.y);

            const handlePress = () => {
              if (isSelected)
                setCoords((prev) => prev.filter(({ x, y }) => x !== option.value.x || y !== option.value.y));
              else setCoords((prev) => [...prev, option.value]);
            };
            return (
              <Button
                onClick={handlePress}
                key={option.label}
                style={{ backgroundColor: isSelected ? "skyblue" : option.value.y > 5 ? "beige" : undefined }}
              >
                {option.label}
              </Button>
            );
          })}
        </div>
      </Form.Item>
      <Button onClick={save}>저장</Button>
    </Form>
  );
}

export default InteriorForm;

function findMismatchedCoords(
  coords: { x: number; y: number }[],
  coordOptions: { label: string; value: { x: number; y: number } }[]
): string {
  const mismatchedLabels: string[] = [];

  coordOptions.forEach((option) => {
    const matchedOption = coords.find((coord) => option.value.x === coord.x && option.value.y === coord.y);

    if (!matchedOption) {
      mismatchedLabels.push(option.label);
    }
  });

  return mismatchedLabels.join(" ");
}
