import { updateFeatureFlag } from '@/client/feature-flags';
import type { FeatureFlagItem } from '@/client/types';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import {
  APP_DEFAULT_LABEL,
  type FeatureFlagCreateValues,
  featureFlagCreateSchema,
  featureFlagFormSchema,
  initialEnabled,
  toErrorMessage,
  toFormValues,
  toUpdateParams,
} from './services/feature-flag-form';

const PLATFORM_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'ios', label: 'iOS' },
  { value: 'android', label: 'Android' },
];

const FLAVOR_OPTIONS = [
  { value: 'all', label: '전체' },
  { value: 'global', label: 'global' },
  { value: 'huawei', label: 'huawei' },
];

const ENABLED_OPTIONS = [
  { value: 'on', label: '켬' },
  { value: 'off', label: '끔' },
];

const SEGMENT_LABEL_CLASS =
  'flex h-9 cursor-pointer items-center justify-center rounded-lg border border-border bg-background px-3 text-sm font-medium transition-colors hover:bg-muted peer-focus-visible:ring-2 peer-focus-visible:ring-ring peer-focus-visible:ring-offset-2 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary peer-data-[state=checked]:text-primary-foreground';

type FeatureFlagEditDialogProps = {
  item: FeatureFlagItem | null;
  onOpenChange: (open: boolean) => void;
};

function FeatureFlagEditForm({ item, onDone }: { item: FeatureFlagItem; onDone: () => void }) {
  const queryClient = useQueryClient();
  const isNew = !item.row;
  const form = useForm<FeatureFlagCreateValues>({
    // 행이 있으면 켬/끔은 목록 스위치에서만 바꾸므로 enabled 를 검증하지 않는다.
    resolver: zodResolver(isNew ? featureFlagCreateSchema : featureFlagFormSchema),
    defaultValues: { ...toFormValues(item.row), enabled: initialEnabled(item) },
  });

  const save = useMutation({
    mutationFn: (values: FeatureFlagCreateValues) =>
      updateFeatureFlag(item.key, toUpdateParams(values, item.row?.enabled ?? values.enabled === true)),
    onSuccess: async () => {
      toast.success(`${item.key} 을(를) 저장했습니다.`);
      await queryClient.invalidateQueries({ queryKey: ['feature-flags'] });
      onDone();
    },
    onError: (err) => toast.error(toErrorMessage(err)),
  });

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit((values) => save.mutate(values))} className='space-y-4'>
        {isNew ? (
          <FormField
            control={form.control}
            name='enabled'
            render={({ field }) => (
              <FormItem>
                <FormLabel>만들 때 상태</FormLabel>
                <FormControl>
                  <RadioGroup
                    value={field.value === null ? '' : field.value ? 'on' : 'off'}
                    onValueChange={(v) => field.onChange(v === 'on')}
                    className='grid grid-cols-2 gap-2'
                  >
                    {ENABLED_OPTIONS.map((opt) => (
                      <div key={opt.value}>
                        <RadioGroupItem value={opt.value} id={`enabled-${opt.value}`} className='peer sr-only' />
                        <Label htmlFor={`enabled-${opt.value}`} className={SEGMENT_LABEL_CLASS}>
                          {opt.label}
                        </Label>
                      </div>
                    ))}
                  </RadioGroup>
                </FormControl>
                <FormDescription>
                  이 키는 아직 서버 행이 없습니다.{' '}
                  {item.appDefault === 'env'
                    ? '앱 기본값이 빌드 설정이라 직접 골라 주세요. 운영 빌드는 켬입니다.'
                    : `앱 기본값(${APP_DEFAULT_LABEL[item.appDefault]})으로 채워 두었습니다.`}
                </FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : null}

        <FormField
          control={form.control}
          name='description'
          render={({ field }) => (
            <FormItem>
              <FormLabel>설명</FormLabel>
              <FormControl>
                <Textarea rows={2} placeholder='운영 메모' {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className='grid grid-cols-2 gap-4'>
          <FormField
            control={form.control}
            name='platform'
            render={({ field }) => (
              <FormItem>
                <FormLabel>플랫폼</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PLATFORM_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='flavor'
            render={({ field }) => (
              <FormItem>
                <FormLabel>flavor</FormLabel>
                <Select value={field.value} onValueChange={field.onChange}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {FLAVOR_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name='minVersionCode'
            render={({ field }) => (
              <FormItem>
                <FormLabel>최소 versionCode</FormLabel>
                <FormControl>
                  <Input inputMode='numeric' placeholder='제한 없음' {...field} />
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
                <FormLabel>최대 versionCode</FormLabel>
                <FormControl>
                  <Input inputMode='numeric' placeholder='제한 없음' {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <p className='text-xs text-muted-foreground'>
          versionCode 를 비워 두면 그쪽 제한이 없습니다. 둘 다 포함 범위입니다.
        </p>

        <DialogFooter>
          <Button type='button' variant='outline' onClick={onDone} disabled={save.isPending}>
            취소
          </Button>
          <Button type='submit' disabled={save.isPending}>
            {save.isPending ? <Loader2 className='h-4 w-4 animate-spin' aria-hidden='true' /> : null}
            저장
          </Button>
        </DialogFooter>
      </form>
    </Form>
  );
}

function FeatureFlagEditDialog({ item, onOpenChange }: FeatureFlagEditDialogProps) {
  return (
    <Dialog open={!!item} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-lg'>
        <DialogHeader>
          <DialogTitle className='font-mono'>{item?.key}</DialogTitle>
          <DialogDescription>{item?.label}</DialogDescription>
        </DialogHeader>
        {/* key 로 다시 마운트해 다른 행을 열 때 이전 입력이 남지 않게 한다. */}
        {item ? <FeatureFlagEditForm key={item.key} item={item} onDone={() => onOpenChange(false)} /> : null}
      </DialogContent>
    </Dialog>
  );
}

export default FeatureFlagEditDialog;
