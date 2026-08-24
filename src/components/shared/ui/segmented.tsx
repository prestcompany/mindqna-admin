import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { cn } from '@/lib/utils';

/**
 * A small set of mutually exclusive options, shown as one object: a track with the chosen
 * option raised out of it.
 *
 * Use this for two or three options that are the same KIND of thing — 전체 / 개인,
 * 즉시 / 예약, 지급 / 회수. The track says "these are alternatives, pick one" before the
 * labels are even read, which loose radio dots do not; dots read as an unbounded list that
 * happens to have two entries today.
 *
 * For more options, or options that are values rather than modes (languages, positions),
 * use chips or a select instead — a track stops working once it has to wrap.
 */
export function Segmented<T extends string>({
  name,
  value,
  onChange,
  options,
  disabled,
  className,
}: {
  /** Group name; combined with each option's value to link input and label. */
  name: string;
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string }[];
  disabled?: boolean;
  className?: string;
}) {
  return (
    <RadioGroup
      value={value}
      onValueChange={(next) => onChange(next as T)}
      disabled={disabled}
      className={cn(
        'inline-grid auto-cols-fr grid-flow-col gap-1 rounded-lg border border-border bg-muted/60 p-1',
        className,
      )}
    >
      {options.map((option) => (
        <div key={option.value}>
          <RadioGroupItem value={option.value} id={`${name}-${option.value}`} className='peer sr-only' />
          {/* peer-* only reaches siblings of the input, so the checked style lives here. */}
          <Label
            htmlFor={`${name}-${option.value}`}
            className={cn(
              'flex h-8 cursor-pointer items-center justify-center rounded-md px-4',
              'text-sm font-medium text-muted-foreground transition-colors duration-fast',
              'peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-1',
              'peer-data-[state=checked]:bg-card peer-data-[state=checked]:text-foreground',
              'peer-data-[state=checked]:shadow-sm',
            )}
          >
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}
