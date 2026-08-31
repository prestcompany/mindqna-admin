import type { PushTargetFilter } from '@/client/push';
import type { CreatePushParams } from '@/client/push';

/** Local copy so the payload builder does not import a component. */
function isEmptyFilter(f: PushTargetFilter): boolean {
  return !f.spaceTypes?.length && !f.spaceLocales?.length && f.minCardCount == null && f.minPetLevel == null;
}
import type { Locale } from '@/client/types';

export type PushFormValues = {
  sendMode: 'now' | 'schedule';
  /** datetime-local value, e.g. 2026-08-25T10:00. Empty when sendMode is 'now'. */
  pushAt: string;
  target: 'ALL' | 'USER';
  locale: string;
  /** Space conditions for a broadcast. Empty object means no narrowing. */
  filter: PushTargetFilter;
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

function isAbsoluteUrl(value: string): boolean {
  // The URL constructor silently percent-encodes a space rather than refusing it, so the raw
  // string is checked for whitespace separately — `https://a.example/b c.png` is a typo.
  if (/\s/.test(value)) return false;
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * Mirrors PushService.buildData so the operator hears about a bad URL before the request goes
 * out. Not cosmetic: imgUrl reaches FCM as notification.imageUrl, and a malformed one makes
 * every send in the batch fail with messaging/invalid-argument.
 *
 * imgUrl must be http(s) because FCM fetches it itself. link only has to be absolute — the
 * app resolves it as a deep link, and the rest of the product sends mindqna://<path> there.
 * Both are optional, so empty stays valid.
 */
export function pushUrlError(values: Pick<PushFormValues, 'link' | 'imgUrl'>): string | null {
  const link = values.link.trim();
  const imgUrl = values.imgUrl.trim();

  if (link && !isAbsoluteUrl(link)) return '링크는 https:// 또는 mindqna:// 로 시작하는 절대 URL이어야 합니다';
  if (imgUrl && !(isAbsoluteUrl(imgUrl) && /^https?:$/.test(new URL(imgUrl).protocol))) {
    return '이미지 URL은 https:// 로 시작하는 절대 URL이어야 합니다';
  }
  return null;
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
    // Only a broadcast carries conditions; a per-user send already names its recipients.
    // An empty object would reach the server as a filter, and the server refuses one.
    filter: isBroadcast && !isEmptyFilter(values.filter) ? values.filter : undefined,
    link: optional(values.link),
    imgUrl: optional(values.imgUrl),
  };
}
