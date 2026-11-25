import { Input } from '@/components/ui/input';
import { useState } from 'react';

/**
 * 쓰는 동안은 글 그대로 두고, 칸을 떠나거나 Enter 를 누르면 parse 로 확정한다(숫자가 아니면 null → 되돌림).
 * 바로 반영하면 '-'·'0.' 같은 쓰는 중의 글이 되돌려지거나 0 이 들어간다.
 * type=number 를 쓰지 않는다. SVG 에서 읽은 소수 5자리 값이 step 에 맞지 않아 브라우저가 폼 저장을 막는다.
 */
function SlotNumberInput({
  id,
  value,
  parse,
  onCommit,
}: {
  id: string;
  value: number;
  parse: (text: string) => number | null;
  onCommit: (n: number) => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const commit = () => {
    if (text === null) return;
    const n = parse(text);
    if (n !== null) onCommit(n);
    setText(null);
  };
  return (
    <Input
      id={id}
      type='text'
      inputMode='decimal'
      className='tabular-nums'
      value={text ?? String(value)}
      onFocus={() => setText(String(value))}
      onChange={(e) => setText(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          commit();
        }
      }}
    />
  );
}

export default SlotNumberInput;
