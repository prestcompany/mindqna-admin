import { createLocale, updateLocale } from '@/client/locale';
import { Locale, LocaleWord } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

type LocaleFormProps = {
  init?: LocaleWord;
  reload: () => Promise<any>;
  close: () => void;
};

function LocaleForm({ init, reload, close }: LocaleFormProps) {
  const [isLoading, setLoading] = useState(false);
  const [focusedId, setFocusedId] = useState<number>();
  const [locales, setLocales] = useState<Locale[]>(['ko', 'en', 'ja', 'zh']);
  const [key, setKey] = useState('');
  const [value, setValue] = useState('');
  const [valueKo, setValueKo] = useState('');
  const [valueEn, setValueEn] = useState('');
  const [valueJa, setValueJa] = useState('');
  const [valueZh, setValueZh] = useState('');
  const [valueZhTw, setValueZhTw] = useState('');
  const [valueEs, setValueEs] = useState('');
  const [valueId, setValueId] = useState('');

  useEffect(() => {
    if (!init) return;

    setFocusedId(init.id);
    setLocales([init.locale]);
    setKey(init.key);
    setValue(init.value);
  }, [init]);

  const localeOptions: { label: string; value: Locale }[] = [
    { label: 'ko', value: 'ko' },
    { label: 'en', value: 'en' },
    { label: 'ja', value: 'ja' },
    { label: 'zh', value: 'zh' },
    { label: 'zhTw', value: 'zhTw' as Locale },
    { label: 'es', value: 'es' as Locale },
    { label: 'id', value: 'id' as Locale },
  ];

  const toggleLocale = (locale: Locale, checked: boolean) => {
    if (checked) {
      setLocales((prev) => [...prev, locale]);
    } else {
      setLocales((prev) => prev.filter((l) => l !== locale));
    }
  };

  const save = async () => {
    try {
      setLoading(true);
      if (focusedId) {
        await updateLocale({
          id: focusedId,
          key,
          locale: locales[0],
          value,
        });
      } else {
        if (locales.includes('ko'))
          await createLocale({
            key,
            locale: 'ko',
            value: valueKo,
          });
        if (locales.includes('en'))
          await createLocale({
            key,
            locale: 'en',
            value: valueEn,
          });
        if (locales.includes('ja'))
          await createLocale({
            key,
            locale: 'ja',
            value: valueJa,
          });
        if (locales.includes('zh'))
          await createLocale({
            key,
            locale: 'zh',
            value: valueZh,
          });
        if (locales.includes('zhTw' as Locale))
          await createLocale({
            key,
            locale: 'zhTw' as Locale,
            value: valueZhTw,
          });
        if (locales.includes('es' as Locale))
          await createLocale({
            key,
            locale: 'es' as Locale,
            value: valueEs,
          });
        if (locales.includes('id' as Locale))
          await createLocale({
            key,
            locale: 'id' as Locale,
            value: valueId,
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
          <Label>locale</Label>
          <div className='flex flex-wrap gap-3'>
            {localeOptions.map((opt) => (
              <div key={opt.value} className='flex items-center gap-2'>
                <Checkbox
                  id={`locale-${opt.value}`}
                  checked={locales.includes(opt.value)}
                  onCheckedChange={(checked) => toggleLocale(opt.value, !!checked)}
                  disabled={!!focusedId}
                />
                <Label htmlFor={`locale-${opt.value}`}>{opt.label}</Label>
              </div>
            ))}
          </div>
        </div>
        <div className='space-y-2'>
          <Label>key</Label>
          <Input value={key} onChange={(e) => setKey(e.target.value)} />
        </div>
        {focusedId ? (
          <div className='space-y-2'>
            <Label>value</Label>
            <Input value={value} onChange={(e) => setValue(e.target.value)} />
          </div>
        ) : (
          <>
            <div className='space-y-2'>
              <Label>ko</Label>
              <Input value={valueKo} onChange={(e) => setValueKo(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>en</Label>
              <Input value={valueEn} onChange={(e) => setValueEn(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>ja</Label>
              <Input value={valueJa} onChange={(e) => setValueJa(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>zh</Label>
              <Input value={valueZh} onChange={(e) => setValueZh(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>zhTw</Label>
              <Input value={valueZhTw} onChange={(e) => setValueZhTw(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>es</Label>
              <Input value={valueEs} onChange={(e) => setValueEs(e.target.value)} />
            </div>
            <div className='space-y-2'>
              <Label>id</Label>
              <Input value={valueId} onChange={(e) => setValueId(e.target.value)} />
            </div>
          </>
        )}

        <Button onClick={save} size='lg'>
          저장
        </Button>
      </div>
    </>
  );
}

export default LocaleForm;
