import { Locale } from '@/client/types';

export const LOCALE_OPTIONS: { label: Locale; value: Locale }[] = [
  { label: 'ko', value: 'ko' },
  { label: 'en', value: 'en' },
  { label: 'ja', value: 'ja' },
  { label: 'zh', value: 'zh' },
  { label: 'zhTw', value: 'zhTw' },
  { label: 'es', value: 'es' },
  { label: 'id', value: 'id' },
];

/**
 * Display names for a control that shows ONE locale at a time — a select, a summary line.
 *
 * Chip grids keep the raw codes: seven chips of "한국어 / 영어 / 일본어 …" wrap where
 * "ko / en / ja" fits one row, and in a grid the codes are being compared against each
 * other rather than read. A select shows a single value with nothing to compare it to, so
 * it has to say what the value means.
 */
export const LOCALE_DISPLAY_NAME: Record<string, string> = {
  ko: '한국어',
  en: 'English',
  ja: '日本語',
  zh: '简体中文',
  zhTw: '繁體中文',
  es: 'Español',
  id: 'Bahasa Indonesia',
};
