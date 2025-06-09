import { Form, Input } from 'antd';
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
    <>
      {locales.map(({ key, placeholder }) => (
        <Form.Item key={key} name={key} rules={[{ required: true, message: `${placeholder}는 필수입니다.` }]}>
          <Input
            placeholder={placeholder}
            value={locale[key] ?? ''}
            onChange={(e) => onLocaleChange({ [key]: e.target.value })}
          />
        </Form.Item>
      ))}
    </>
  );
};

export default LocaleInputGroup;
