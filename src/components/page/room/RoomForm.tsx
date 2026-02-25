import { RoomCategory, RoomTemplate, createRoom, updateRoom } from "@/client/room";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export const categoryOptions = [
  { label: "다락방", value: "rooftop" },
  { label: "실내", value: "inner" },
  { label: "야외", value: "outer" },
];

type Props = {
  init?: RoomTemplate;
  reload: () => Promise<any>;
  close: () => void;
};

function RoomForm({ init, reload, close }: Props) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();

  const [name, setName] = useState("");
  const [category, setCategory] = useState<RoomCategory>("inner");
  const [price, setPrice] = useState(0);
  const [isPaid, setIsPaid] = useState(false);

  const [isActive, setIsActive] = useState(false);

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setName(init.type);
    setCategory(init.category);
    setPrice(init.price);
    setIsPaid(init.isPaid);

    setIsActive(init.isActive);
  }, [init]);

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateRoom({
          id: focusedId,
          name,
          category,
          isPaid,
          price,
          isActive,
        });
      } else {
        await createRoom({
          name,
          category,
          isPaid,
          price,
        });
      }

      await reload();
      close();
    } catch (err) {
      toast.error(`${err}`);
    }
    setLoading(false);
  };

  return (
    <>
      {isLoading && <div className='fixed inset-0 z-50 flex items-center justify-center bg-background/80'><div className='animate-spin rounded-full h-8 w-8 border-b-2 border-primary' /></div>}
      <div className='space-y-4'>
        <div className='space-y-2'>
          <Label>이름</Label>
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </div>

        <div className='space-y-2'>
          <Label>카테고리</Label>
          <RadioGroup
            value={category}
            onValueChange={(v) => setCategory(v as RoomCategory)}
            className='flex flex-wrap gap-4'
          >
            {categoryOptions.map((opt) => (
              <div key={opt.value} className='flex items-center gap-2'>
                <RadioGroupItem value={opt.value} id={`cat-${opt.value}`} />
                <Label htmlFor={`cat-${opt.value}`}>{opt.label}</Label>
              </div>
            ))}
          </RadioGroup>
        </div>

        <div className='flex items-center gap-6'>
          <div className='space-y-2'>
            <Label>코인 타입</Label>
            <RadioGroup
              value={String(isPaid)}
              onValueChange={(v) => setIsPaid(v === 'true')}
              className='flex gap-4'
            >
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='true' id='paid-true' />
                <Label htmlFor='paid-true'>스타</Label>
              </div>
              <div className='flex items-center gap-2'>
                <RadioGroupItem value='false' id='paid-false' />
                <Label htmlFor='paid-false'>하트</Label>
              </div>
            </RadioGroup>
          </div>
          <div className='space-y-2'>
            <Label>가격</Label>
            <Input
              type='number'
              min={0}
              value={price}
              onChange={(e) => setPrice(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className='space-y-2'>
          <Label>활성화</Label>
          <RadioGroup
            value={String(isActive)}
            onValueChange={(v) => setIsActive(v === 'true')}
            className='flex gap-4'
            disabled={!focusedId}
          >
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='true' id='active-true' />
              <Label htmlFor='active-true'>활성화</Label>
            </div>
            <div className='flex items-center gap-2'>
              <RadioGroupItem value='false' id='active-false' />
              <Label htmlFor='active-false'>비활성화</Label>
            </div>
          </RadioGroup>
        </div>

        <Button onClick={save} size="lg">
          저장
        </Button>
      </div>
    </>
  );
}

export default RoomForm;
