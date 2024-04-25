import { createInteriorTemplate, updateInteriorTemplate } from "@/client/interior";
import { ImgItem, InteriorTemplate, InteriorTemplateType } from "@/client/types";
import useAssets from "@/hooks/useAssets";
import { Button, Form, Image, Input, InputNumber, Radio, Spin, message } from "antd";
import { useEffect, useState } from "react";
import AssetsDrawer from "../assets/AssetsDrawer";

type InteriorFormProps = {
  init?: InteriorTemplate;
};

function InteriorForm({ init }: InteriorFormProps) {
  const { imgs } = useAssets();
  const [isLoading, setLoading] = useState(false);

  const [focusedId, setFocusedId] = useState<number | undefined>(undefined);
  const [image, setImage] = useState<ImgItem>();
  const [name, setName] = useState("");
  const [type, setType] = useState<InteriorTemplateType>("item");
  const [category, setCategory] = useState("");
  const [room, setRoom] = useState("room");
  const [isPremium, setIsPremium] = useState(true);
  const [price, setPrice] = useState(0);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [coords, setCoords] = useState<{ x: number; y: number }[]>([]);

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    if (init.img) {
      setImage(imgs.find((img) => img.id === init.img.id));
    }
    setName(init.name);
    setType(init.type);
    setCategory(init.category);
    setRoom(init.room);
    setIsPremium(init.isPaid);
    setPrice(init.price);
    setWidth(init.width);
    setHeight(init.height);
    setCoords(findMismatchedCoordsXY(convertCoordinates(init.disablePositions), coordOptions));
  }, [init]);

  const coordOptions = Array.from({ length: 7 * 13 }, (_, index) => ({
    x: index % 7,
    y: Math.floor(index / 7),
  })).map((coord) => ({ label: `(${coord.x},${coord.y})`, value: coord }));

  const typeOptions = [
    { label: "아이템", value: "item" },
    { label: "이벤트", value: "event" },
  ];

  const premiumOptions = [
    { label: "유료", value: true },
    { label: "무료", value: false },
  ];

  const save = async () => {
    if (!image) return;
    try {
      setLoading(true);
      if (focusedId) {
        await updateInteriorTemplate({
          id: focusedId,
          imgId: image.id,
          room,
          name,
          category,
          disablePositions: findMismatchedCoords(coords, coordOptions),
          height,
          isPaid: isPremium,
          price,
          type: "item",
          width,
        });
      } else {
        await createInteriorTemplate({
          imgId: image.id,
          room,
          name,
          category,
          disablePositions: findMismatchedCoords(coords, coordOptions),
          height,
          isPaid: isPremium,
          price,
          type: "item",
          width,
        });
      }

      setLoading(false);
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
        <Form.Item label="이미지">
          <div className="flex flex-col items-center gap-2">
            {image && <Image width={200} height={200} src={image.uri} alt="img" style={{ objectFit: "contain" }} />}
            <AssetsDrawer onClick={setImage} />
          </div>
        </Form.Item>
        <Form.Item label="이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
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
        <Form.Item label="카테고리">
          <Input value={category} onChange={(e) => setCategory(e.target.value)} />
        </Form.Item>
        <Form.Item label="룸 타입">
          <Input value={room} onChange={(e) => setRoom(e.target.value)} />
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
          <div className="flex">
            <div className="flex flex-col mt-[46px] mr-4">
              {Array(13)
                .fill(0)
                .map((v, idx) => {
                  const handlePress = () => {
                    if (coords.some((item) => item.y === idx)) setCoords((prev) => prev.filter(({ y }) => y !== idx));
                    else
                      setCoords((prev) => [
                        ...prev,
                        ...coordOptions.filter((item) => item.value.y === idx).map((item) => item.value),
                      ]);
                  };
                  return (
                    <Button onClick={handlePress} key={idx} className="flex-1">
                      all
                    </Button>
                  );
                })}
            </div>
            <div>
              <div className="grid grid-cols-7 mb-4">
                {Array(7)
                  .fill(0)
                  .map((v, idx) => {
                    const handlePress = () => {
                      if (coords.some((item) => item.x === idx)) setCoords((prev) => prev.filter(({ x }) => x !== idx));
                      else
                        setCoords((prev) => [
                          ...prev,
                          ...coordOptions.filter((item) => item.value.x === idx).map((item) => item.value),
                        ]);
                    };
                    return (
                      <Button onClick={handlePress} key={idx}>
                        all
                      </Button>
                    );
                  })}
              </div>
              <div className="grid grid-cols-7">
                {coordOptions.map((option, index) => {
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
                      style={{ backgroundColor: isSelected ? "skyblue" : option.value.y >= 5 ? "beige" : undefined }}
                    >
                      {option.label}
                    </Button>
                  );
                })}
              </div>
            </div>
          </div>
        </Form.Item>
        <Button onClick={save} size="large" type="primary">
          저장
        </Button>
      </Form>
    </>
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

function findMismatchedCoordsXY(
  coords: { x: number; y: number }[],
  coordOptions: { label: string; value: { x: number; y: number } }[]
) {
  const mismatchedValues: { x: number; y: number }[] = [];

  coordOptions.forEach((option) => {
    const matchedOption = coords.find((coord) => option.value.x === coord.x && option.value.y === coord.y);

    if (!matchedOption) {
      mismatchedValues.push(option.value);
    }
  });

  return mismatchedValues;
}

function convertCoordinates(input: string) {
  const coordinates = input.split(" ").map((coord) => {
    const [x, y] = coord
      .replace(/[^\d,]/g, "")
      .split(",")
      .map((value) => parseInt(value));
    return { x, y };
  });
  return coordinates;
}
