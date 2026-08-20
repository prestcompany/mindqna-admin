import type { CreatePushParams } from '@/client/push';
import type { Locale } from '@/client/types';

export type PushFormValues = {
  sendMode: 'now' | 'schedule';
  /** datetime-local value, e.g. 2026-08-25T10:00. Empty when sendMode is 'now'. */
  pushAt: string;
  target: 'ALL' | 'USER';
  locale: string;
  userNames: string;
  title: string;
  message: string;
  link: string;
  imgUrl: string;
};

/** Mirrors the server's parseUserNames so the "N명 인식됨" counter matches what is stored. */
export function parseUserNamesInput(raw: string): string[] {
  const parsed = raw
    .split(',')
    .map((name) => name.trim())
    .filter((name) => name.length > 0);
  return Array.from(new Set(parsed));
}

function optional(value: string): string | undefined {
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function toCreatePushParams(values: PushFormValues): CreatePushParams {
  const isNow = values.sendMode === 'now';
  const isBroadcast = values.target === 'ALL';

  return {
    title: values.title.trim(),
    message: values.message.trim(),
    target: values.target,
    sendNow: isNow,
    // The server stamps the time when sendNow is true, so the client clock never enters the data.
    pushAt: isNow ? undefined : new Date(values.pushAt).toISOString(),
    // A per-user send ignores locale; sending one would put a value in the column that means nothing.
    locale: isBroadcast ? (values.locale as Locale) : undefined,
    userNames: isBroadcast ? undefined : parseUserNamesInput(values.userNames),
    link: optional(values.link),
    imgUrl: optional(values.imgUrl),
  };
}
