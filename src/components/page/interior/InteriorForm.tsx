import { createInteriorTemplate, updateInteriorTemplate } from "@/client/interior";
import { createLocale } from "@/client/locale";
import { ImgItem, InteriorTemplate, InteriorTemplateType } from "@/client/types";
import { Button, Form, Image, Input, InputNumber, Radio, Spin, message } from "antd";
import { useEffect, useState } from "react";
import AssetsDrawer from "../assets/AssetsDrawer";

type InteriorFormProps = {
  init?: InteriorTemplate;
};

function InteriorForm({ init }: InteriorFormProps) {
  const [isLoading, setLoading] = useState(false);

  const [focusedId, setFocusedId] = useState<number | undefined>(undefined);
  const [image, setImage] = useState<ImgItem>();
  const [name, setName] = useState("");
  const [type, setType] = useState<InteriorTemplateType>("item");
  const [category, setCategory] = useState("furniture");
  const [room, setRoom] = useState("room");
  const [isPremium, setIsPremium] = useState(true);
  const [price, setPrice] = useState(0);
  const [width, setWidth] = useState(1);
  const [height, setHeight] = useState(1);
  const [coords, setCoords] = useState<{ x: number; y: number }[]>([
    { x: 0, y: 5 },
    { x: 1, y: 5 },
    { x: 2, y: 5 },
    { x: 3, y: 5 },
    { x: 4, y: 5 },
    { x: 5, y: 5 },
    { x: 6, y: 5 },
    { x: 0, y: 7 },
    { x: 1, y: 7 },
    { x: 2, y: 7 },
    { x: 3, y: 7 },
    { x: 4, y: 7 },
    { x: 5, y: 7 },
    { x: 6, y: 7 },
    { x: 0, y: 6 },
    { x: 1, y: 6 },
    { x: 2, y: 6 },
    { x: 3, y: 6 },
    { x: 4, y: 6 },
    { x: 5, y: 6 },
    { x: 6, y: 6 },
    { x: 0, y: 8 },
    { x: 1, y: 8 },
    { x: 2, y: 8 },
    { x: 3, y: 8 },
    { x: 4, y: 8 },
    { x: 5, y: 8 },
    { x: 6, y: 8 },
    { x: 0, y: 9 },
    { x: 1, y: 9 },
    { x: 2, y: 9 },
    { x: 3, y: 9 },
    { x: 4, y: 9 },
    { x: 5, y: 9 },
    { x: 6, y: 9 },
    { x: 0, y: 10 },
    { x: 1, y: 10 },
    { x: 2, y: 10 },
    { x: 3, y: 10 },
    { x: 4, y: 10 },
    { x: 5, y: 10 },
    { x: 6, y: 10 },
    { x: 0, y: 11 },
    { x: 1, y: 11 },
    { x: 2, y: 11 },
    { x: 3, y: 11 },
    { x: 4, y: 11 },
    { x: 5, y: 11 },
    { x: 6, y: 11 },
    { x: 0, y: 12 },
    { x: 1, y: 12 },
    { x: 2, y: 12 },
    { x: 3, y: 12 },
    { x: 4, y: 12 },
    { x: 5, y: 12 },
    { x: 6, y: 12 },
  ]);

  const [valueKo, setValueKo] = useState("");
  const [valueEn, setValueEn] = useState("");
  const [valueJa, setValueJa] = useState("");
  const [valueZh, setValueZh] = useState("");

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    if (init.img) {
      setImage(init.img);
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
    { label: "벽지", value: "wall" },
    { label: "바닥", value: "floor" },
    { label: "이벤트", value: "event" },
  ];

  const categoriOptions = [
    { label: "가구", value: "furniture" },
    { label: "벽지", value: "wall" },
    { label: "바닥", value: "floor" },
  ];

  const premiumOptions = [
    { label: "스타", value: true },
    { label: "하트", value: false },
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
        await createLocale({
          key: name,
          locale: "ko",
          value: valueKo,
        });
        await createLocale({
          key: name,
          locale: "en",
          value: valueEn,
        });
        await createLocale({
          key: name,
          locale: "ja",
          value: valueJa,
        });
        await createLocale({
          key: name,
          locale: "zh",
          value: valueZh,
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
        <Form.Item label="이미지">
          <div className="flex flex-col items-center gap-2">
            {image && <Image width={200} height={200} src={image.uri} alt="img" style={{ objectFit: "contain" }} />}
            <AssetsDrawer onClick={setImage} />
          </div>
        </Form.Item>

        <Form.Item label="이름">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Form.Item>
        {!focusedId && (
          <>
            <Form.Item label="ko">
              <Input value={valueKo} onChange={(e) => setValueKo(e.target.value)} />
            </Form.Item>
            <Form.Item label="en">
              <Input value={valueEn} onChange={(e) => setValueEn(e.target.value)} />
            </Form.Item>
            <Form.Item label="ja">
              <Input value={valueJa} onChange={(e) => setValueJa(e.target.value)} />
            </Form.Item>
            <Form.Item label="zh">
              <Input value={valueZh} onChange={(e) => setValueZh(e.target.value)} />
            </Form.Item>
          </>
        )}

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
          <Radio.Group
            options={categoriOptions}
            optionType="button"
            buttonStyle="solid"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </Form.Item>
        <Form.Item label="룸 타입">
          <Input value={room} onChange={(e) => setRoom(e.target.value)} />
          <div className="flex items-center gap-2">
            <div>room: 따뜻한 방</div>
            <div>princess: 공주방</div>
            <div>kitchen: 부엌</div>
            <div>rooftop: 다락방</div>
            <div>garden: 마당</div>
          </div>
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
