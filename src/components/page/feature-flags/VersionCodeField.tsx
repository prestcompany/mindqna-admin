import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useState } from 'react';
import type { VersionOption } from './services/app-versions';

const NONE = 'none';
const CUSTOM = 'custom';

type VersionCodeFieldProps = {
  id: string;
  /** 스크린 리더용 이름. 화면의 라벨은 바깥 FormLabel 이 맡는다. */
  label: string;
  value: string;
  onChange: (value: string) => void;
  versions: VersionOption[];
};

/**
 * 나와 있는 버전 중에서 고르거나, 아직 사용자가 없는 다음 버전은 코드를 직접 넣는다.
 * 고를 버전이 없으면(집계 전) 입력칸만 보인다.
 */
function VersionCodeField({ id, label, value, onChange, versions }: VersionCodeFieldProps) {
  const known = versions.some((v) => String(v.code) === value);
  const [custom, setCustom] = useState(value !== '' && !known);

  if (!versions.length) {
    return (
      <Input
        id={id}
        aria-label={label}
        inputMode='numeric'
        placeholder='제한 없음'
        className='tabular-nums'
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    );
  }

  const selectValue = custom ? CUSTOM : value === '' ? NONE : value;

  return (
    <div className='space-y-2'>
      <Select
        value={selectValue}
        onValueChange={(next) => {
          if (next === CUSTOM) {
            setCustom(true);
            return;
          }
          setCustom(false);
          onChange(next === NONE ? '' : next);
        }}
      >
        <SelectTrigger id={id} aria-label={label} className='tabular-nums'>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={NONE}>제한 없음</SelectItem>
          {versions.map((v) => (
            <SelectItem key={v.code} value={String(v.code)} className='tabular-nums'>
              {v.name} ({v.code})
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM}>코드 직접 입력</SelectItem>
        </SelectContent>
      </Select>
      {custom ? (
        <Input
          aria-label={`${label} 버전 코드`}
          inputMode='numeric'
          placeholder='버전 코드'
          className='tabular-nums'
          value={value}
          onChange={(e) => onChange(e.target.value)}
          autoFocus
        />
      ) : null}
    </div>
  );
}

export default VersionCodeField;
