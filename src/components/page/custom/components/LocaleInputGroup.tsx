import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import React from 'react';
import { LocaleTexts } from '../types';

interface LocaleInputGroupProps {
  locale: LocaleTexts;
  onLocaleChange: (updates: Partial<LocaleTexts>) => void;
}

const LocaleInputGroup: React.FC<LocaleInputGroupProps> = ({ locale, onLocaleChange }) => {
  const locales = [
    { key: 'ko' as keyof LocaleTexts, placeholder: '한국어 (ko)' },
    { key: 'en' as keyof LocaleTexts, placeholder: 'English (en)' },
    { key: 'ja' as keyof LocaleTexts, placeholder: '日本語 (ja)' },
    { key: 'zh' as keyof LocaleTexts, placeholder: '中文(简体) (zh)' },
    { key: 'zhTw' as keyof LocaleTexts, placeholder: '中文(繁體) (zhTw)' },
    { key: 'es' as keyof LocaleTexts, placeholder: 'Español (es)' },
    { key: 'id' as keyof LocaleTexts, placeholder: 'Bahasa Indonesia (id)' },
  ];

  return (
    <div className='grid grid-cols-1 gap-3 sm:grid-cols-2'>
      {locales.map(({ key, placeholder }) => (
        <div key={key} className='space-y-1.5'>
          <Label htmlFor={`locale-${key}`} className='text-xs font-medium text-muted-foreground'>
            {key}
          </Label>
          <Input
            id={`locale-${key}`}
            placeholder={placeholder}
            value={locale[key] ?? ''}
            onChange={(e) => onLocaleChange({ [key]: e.target.value })}
          />
        </div>
      ))}
    </div>
  );
};

export default LocaleInputGroup;
