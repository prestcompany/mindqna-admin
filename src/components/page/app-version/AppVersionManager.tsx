import { getAppVersionPolicies, updateAppVersionPolicy } from '@/client/app-version';
import type { AppPlatform, UpdateAppVersionParams } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PLATFORMS: { key: AppPlatform; label: string }[] = [
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
];

const EMPTY: UpdateAppVersionParams = {
  minVersionCode: 0,
  minVersionName: '',
  latestVersionCode: 0,
  latestVersionName: '',
  forceEnabled: true,
};

function PlatformCard({ platform, label }: { platform: AppPlatform; label: string }) {
  const { data, refetch } = useQuery({
    queryKey: ['app-version'],
    queryFn: getAppVersionPolicies,
  });
  const [form, setForm] = useState<UpdateAppVersionParams>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const row = data?.[platform];
    if (row) {
      setForm({
        minVersionCode: row.minVersionCode,
        minVersionName: row.minVersionName,
        latestVersionCode: row.latestVersionCode,
        latestVersionName: row.latestVersionName,
        forceEnabled: row.forceEnabled,
      });
    }
  }, [data, platform]);

  const save = async () => {
    if (
      form.minVersionCode <= 0 ||
      form.latestVersionCode <= 0 ||
      !form.minVersionName.trim() ||
      !form.latestVersionName.trim()
    ) {
      toast.warning('버전 코드는 양수, 버전 이름은 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      await updateAppVersionPolicy(platform, form);
      await refetch();
      toast.success(`${label} 버전 정책을 저장했습니다.`);
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  const numField = (key: 'minVersionCode' | 'latestVersionCode') => (
    <Input
      type='text'
      inputMode='numeric'
      value={form[key] || ''}
      onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value.replace(/[^\d]/g, '')) }))}
    />
  );
  const textField = (key: 'minVersionName' | 'latestVersionName') => (
    <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder='예: 1.3.13' />
  );

  return (
    <div className='space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-slate-900'>{label}</h3>
        <div className='flex items-center gap-2'>
          <Label htmlFor={`force-${platform}`} className='text-sm text-slate-600'>
            강제 업데이트
          </Label>
          <Switch
            id={`force-${platform}`}
            checked={form.forceEnabled}
            onCheckedChange={(v) => setForm((p) => ({ ...p, forceEnabled: v }))}
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최소 버전 코드 (미만=강제)</Label>
          {numField('minVersionCode')}
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최소 버전 이름</Label>
          {textField('minVersionName')}
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최신 버전 코드 (미만=권장)</Label>
          {numField('latestVersionCode')}
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최신 버전 이름</Label>
          {textField('latestVersionName')}
        </div>
      </div>
      <div className='flex justify-end'>
        <Button type='button' onClick={save} disabled={saving}>
          {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          저장
        </Button>
      </div>
    </div>
  );
}

function AppVersionManager() {
  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {PLATFORMS.map((p) => (
        <PlatformCard key={p.key} platform={p.key} label={p.label} />
      ))}
    </div>
  );
}

export default AppVersionManager;
