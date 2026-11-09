import { updateFeatureFlag } from '@/client/feature-flags';
import type { FeatureFlagItem, FeatureFlagsResult, FeatureFlagAppVersion } from '@/client/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { Loader2 } from 'lucide-react';
import { useForm, useWatch } from 'react-hook-form';
import { toast } from 'sonner';
import {
  currentEnabled,
  FEATURE_FLAG_PUT_KEY,
  type FeatureFlagFormValues,
  featureFlagFormSchema,
  splitLabel,
  toErrorMessage,
  toFormValues,
  toUpdateParams,
} from './services/feature-flag-form';
import { coveredVersions, versionOptions } from './services/app-versions';
import VersionCodeField from './VersionCodeField';

type Option = { value: string; label: string };

const PLATFORM_OPTIONS: Option[] = [
  { value: 'all', label: '전체' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
];

const FLAVOR_OPTIONS: Option[] = [
  { value: 'all', label: '전체' },
  { value: 'global', label: '화웨이 제외' },
  { value: 'huawei', label: '화웨이만' },
];

const SEGMENT_LABEL_CLASS =
  'flex h-9 cursor-pointer items-center justify-center rounded-md border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground';

type SegmentedProps = {
  id: string;
  label: string;
  options: Option[];
  value: string;
  onChange: (value: string) => void;
};

function Segmented({ id, label, options, value, onChange }: SegmentedProps) {
  return (
    <RadioGroup value={value} onValueChange={onChange} aria-label={label} className='grid grid-cols-3 gap-2'>
      {options.map((opt) => (
        <div key={opt.value}>
          <RadioGroupItem value={opt.value} id={`${id}-${opt.value}`} className='peer sr-only' />
          <Label htmlFor={`${id}-${opt.value}`} className={SEGMENT_LABEL_CLASS}>
            {opt.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  );
}

/** 지금 고른 조건이 이미 나와 있는 버전 중 어디까지 닿는지 바로 보여 준다. */
function VersionGuide({ versions, values }: { versions: FeatureFlagAppVersion[]; values: FeatureFlagFormValues }) {
  if (!versions.length) {
    return <p className='text-xs text-muted-foreground'>아직 확인된 버전이 없습니다. 버전 코드를 직접 입력하세요.</p>;
  }
  // 입력 중인 잘못된 코드는 계산하지 않는다. 오류는 칸 아래에 나온다.
  const parsed = featureFlagFormSchema.safeParse(values);
  if (!parsed.success) return null;
  const covered = coveredVersions(versions, toUpdateParams(parsed.data, true));
  const newest = covered[0];
  const oldest = covered[covered.length - 1];
  return (
    <p aria-live='polite' className='text-xs text-muted-foreground tabular-nums'>
      {!covered.length
        ? '지금 나와 있는 버전 중에는 대상이 없습니다. 새 버전이 나오면 적용됩니다.'
        : covered.length === 1
          ? `${newest.name} (${newest.code}) 버전이 대상입니다.`
          : `${oldest.name} (${oldest.code}) ~ ${newest.name} (${newest.code}) 버전이 대상입니다.`}
    </p>
  );
}

type FeatureFlagEditDialogProps = {
  /** 닫히는 동안에도 제목이 비지 않게 마지막으로 연 기능을 계속 받는다. */
  item: FeatureFlagItem | null;
  /** 최근 90일 동안 앱에서 확인한 버전. 버전 목록과 대상 버전 안내에 쓴다. */
  versions: FeatureFlagAppVersion[];
  open: boolean;
  /** 이 기능의 PUT 이 진행 중이면 닫지 않는다. 닫고 다시 열거나 스위치를 누르면 쓰기가 겹친다. */
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (key: string) => void;
};

type FeatureFlagEditFormProps = {
  item: FeatureFlagItem;
  versions: FeatureFlagAppVersion[];
  onCancel: () => void;
  onSaved: (key: string) => void;
};

function FeatureFlagEditForm({ item, versions, onCancel, onSaved }: FeatureFlagEditFormProps) {
  const queryClient = useQueryClient();
  const name = splitLabel(item.label).name;
  const form = useForm<FeatureFlagFormValues>({
    resolver: zodResolver(featureFlagFormSchema),
    defaultValues: toFormValues(item),
  });
  const options = versionOptions(versions);
  const watched = useWatch({ control: form.control }) as FeatureFlagFormValues;

  const save = useMutation({
    mutationKey: FEATURE_FLAG_PUT_KEY,
    mutationFn: ({ key, values }: { key: string; values: FeatureFlagFormValues }) => {
      // 켬/끔은 목록 스위치에서만 바꾼다. 창을 연 뒤에 바뀌었을 수 있어 최신 목록 값을 보낸다.
      const enabled = currentEnabled(queryClient.getQueryData<FeatureFlagsResult>(['feature-flags']), item);
      return updateFeatureFlag(key, toUpdateParams(values, enabled));
    },
    onSuccess: async () => {
      toast.success(`${name} 대상을 저장했습니다. 30초 안에 앱에 반영됩니다.`);
      await queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      onSaved(item.key);
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => save.mutate({ key: item.key, values }))} className='space-y-5'>
        <FormField
          control={form.control}
          name='platform'
          render={({ field }) => (
            <FormItem>
              <FormLabel>플랫폼</FormLabel>
              <FormControl>
                <Segmented
                  id='platform'
                  label='플랫폼'
                  options={PLATFORM_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name='flavor'
          render={({ field }) => (
            <FormItem>
              <FormLabel>스토어</FormLabel>
              <FormControl>
                <Segmented
                  id='flavor'
                  label='스토어'
                  options={FLAVOR_OPTIONS}
                  value={field.value}
                  onChange={field.onChange}
                />
              </FormControl>
            </FormItem>
          )}
        />

        <fieldset className='space-y-2'>
          <legend className='text-sm font-medium text-foreground'>앱 버전</legend>
          <div className='grid grid-cols-2 gap-3'>
            <FormField
              control={form.control}
              name='minVersionCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-normal text-muted-foreground'>부터</FormLabel>
                  <FormControl>
                    <VersionCodeField
                      id='minVersionCode'
                      label='앱 버전 부터'
                      value={field.value}
                      onChange={field.onChange}
                      versions={options}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name='maxVersionCode'
              render={({ field }) => (
                <FormItem>
                  <FormLabel className='text-xs font-normal text-muted-foreground'>까지</FormLabel>
                  <FormControl>
                    <VersionCodeField
                      id='maxVersionCode'
                      label='앱 버전 까지'
                      value={field.value}
                      onChange={field.onChange}
                      versions={options}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </div>
          <VersionGuide versions={versions} values={watched} />
        </fieldset>

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>메모</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder='바꾼 이유 (선택)' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <DialogFooter className='items-center gap-2 sm:justify-between'>
          <span className='text-xs text-muted-foreground tabular-nums'>
            {item.row ? `마지막 변경 ${dayjs(item.row.updatedAt).format('YYYY-MM-DD HH:mm')}` : ''}
          </span>
          <div className='flex gap-2'>
            <Button type='button' variant='outline' onClick={onCancel} disabled={save.isPending}>
              취소
            </Button>
            <Button type='submit' disabled={save.isPending}>
              {save.isPending ? <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' /> : null}
              저장
            </Button>
          </div>
        </DialogFooter>
      </form>
    </Form>
  );
}

function FeatureFlagEditDialog({ item, versions, open, busy, onOpenChange, onSaved }: FeatureFlagEditDialogProps) {
  const label = item ? splitLabel(item.label) : null;

  return (
    <Dialog open={open} onOpenChange={(next) => (next || !busy) && onOpenChange(next)}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle>{label?.name} 대상</DialogTitle>
          <DialogDescription>{label?.hint ?? '이 기능을 받을 사용자를 고릅니다.'}</DialogDescription>
        </DialogHeader>
        {/* key 로 다시 마운트해 다른 기능을 열 때 이전 입력이 남지 않게 한다. */}
        {item ? (
          <FeatureFlagEditForm
            key={item.key}
            item={item}
            versions={versions}
            onCancel={() => onOpenChange(false)}
            onSaved={onSaved}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

export default FeatureFlagEditDialog;
