/**
 * Banner publish period and stats helpers.
 *
 * Operators think in KST, the server stores UTC. Korea has had no daylight saving since
 * 1988, so KST is a fixed +09:00 and the conversion is plain arithmetic — no timezone
 * database, and the result does not depend on the browser's own timezone.
 */

const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** The longest range the stats endpoint accepts, inclusive of both ends. */
export const MAX_STATS_DAYS = 366;
export const DEFAULT_STATS_DAYS = 30;

const pad = (n: number) => String(n).padStart(2, '0');

/** Wall-clock parts of an instant as seen in KST. */
function kstParts(date: Date) {
  const shifted = new Date(date.getTime() + KST_OFFSET_MS);
  return {
    y: shifted.getUTCFullYear(),
    m: pad(shifted.getUTCMonth() + 1),
    d: pad(shifted.getUTCDate()),
    hh: pad(shifted.getUTCHours()),
    mm: pad(shifted.getUTCMinutes()),
  };
}

/**
 * `YYYY-MM-DDTHH:mm` read as KST → ISO UTC string. An empty value means "no limit" and
 * becomes null; an unparseable one also becomes null rather than sending garbage.
 */
export function kstInputToIso(value: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const [, y, m, d, hh, mm] = match.map(Number);
  const utc = Date.UTC(y, m - 1, d, hh, mm) - KST_OFFSET_MS;
  return Number.isNaN(utc) ? null : new Date(utc).toISOString();
}

/** ISO UTC → `YYYY-MM-DDTHH:mm` in KST, the shape DatePicker `withTime` holds. */
export function isoToKstInput(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const { y, m, d, hh, mm } = kstParts(date);
  return `${y}-${m}-${d}T${hh}:${mm}`;
}

/** ISO UTC → `YYYY.MM.DD HH:mm` in KST for display. */
export function formatKstDateTime(iso: string | null | undefined): string {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const { y, m, d, hh, mm } = kstParts(date);
  return `${y}.${m}.${d} ${hh}:${mm}`;
}

/** The KST calendar date of an instant, `YYYY-MM-DD`. */
export function kstDateOf(date: Date): string {
  const { y, m, d } = kstParts(date);
  return `${y}-${m}-${d}`;
}

/**
 * A `YYYY-MM-DD` date as-is, or the KST date of a full ISO instant. `statsSince` is read
 * through this so either shape from the server compares as a KST day.
 */
export function toKstDate(value: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : kstDateOf(date);
}

/** Shift a `YYYY-MM-DD` date by whole days. */
export function addDays(date: string, days: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const next = new Date(Date.UTC(y, m - 1, d) + days * DAY_MS);
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

/** Inclusive day count of a `YYYY-MM-DD` range. */
export function daysInRange(from: string, to: string): number {
  const [fy, fm, fd] = from.split('-').map(Number);
  const [ty, tm, td] = to.split('-').map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / DAY_MS) + 1;
}

export type BannerStatus = 'inactive' | 'scheduled' | 'live' | 'ended';

export const BANNER_STATUS_LABEL: Record<BannerStatus, string> = {
  inactive: '비활성',
  scheduled: '예약',
  live: '게시 중',
  ended: '종료',
};

/**
 * What the app is doing with this banner right now. The switch wins: an inactive banner is
 * 비활성 whatever its period says. Otherwise the period decides, start inclusive and end
 * exclusive, and an empty bound means no limit on that side.
 */
export function bannerStatus(
  banner: { isActive: boolean; startAt?: string | null; endAt?: string | null },
  now: Date,
): BannerStatus {
  if (!banner.isActive) return 'inactive';
  const t = now.getTime();
  if (banner.startAt && t < new Date(banner.startAt).getTime()) return 'scheduled';
  if (banner.endAt && t >= new Date(banner.endAt).getTime()) return 'ended';
  return 'live';
}

/**
 * Mirrors the server's 400 for an inverted period, on the form's KST input values. Only
 * judged when both bounds are set — either side alone is a valid open-ended period.
 */
export function periodError(startInput: string, endInput: string): string | null {
  const start = kstInputToIso(startInput);
  const end = kstInputToIso(endInput);
  if (!start || !end) return null;
  return new Date(start).getTime() < new Date(end).getTime() ? null : '게시 종료는 게시 시작보다 늦어야 해요.';
}

export type StatsRange = { from: string; to: string };

/**
 * The range the stats sheet opens on: the banner's own period, cut off at today. The end
 * is exclusive, so an end at exactly KST midnight belongs to the day before. A banner with
 * no start opens on the 30 days up to its end (or today); one that has not started yet
 * opens on the last 30 days. The result never exceeds the endpoint's 366-day cap.
 */
export function defaultStatsRange(banner: { startAt?: string | null; endAt?: string | null }, now: Date): StatsRange {
  const today = kstDateOf(now);
  const end = banner.endAt ? kstDateOf(new Date(new Date(banner.endAt).getTime() - 1)) : today;
  const to = end < today ? end : today;
  const start = banner.startAt ? kstDateOf(new Date(banner.startAt)) : null;

  if (!start) return { from: addDays(to, -(DEFAULT_STATS_DAYS - 1)), to };
  if (start > to) return { from: addDays(today, -(DEFAULT_STATS_DAYS - 1)), to: today };

  const earliest = addDays(to, -(MAX_STATS_DAYS - 1));
  return { from: start < earliest ? earliest : start, to };
}

/** The endpoint's own limits, checked before asking so the sheet can say why. */
export function statsRangeError(range: StatsRange): string | null {
  if (range.from > range.to) return '시작일이 종료일보다 늦어요.';
  if (daysInRange(range.from, range.to) > MAX_STATS_DAYS) return `기간은 최대 ${MAX_STATS_DAYS}일까지 볼 수 있어요.`;
  return null;
}

/**
 * Daily views and clicks only exist from `statsSince`. Returns that day when the range
 * starts before it (or when there is none yet), so the sheet can say so; null otherwise.
 */
export function viewsClicksNotice(from: string, statsSince: string | null): string | null {
  if (!statsSince) return '노출·클릭 일별 집계가 아직 시작되지 않았어요.';
  const since = toKstDate(statsSince);
  return from < since ? `노출·클릭은 ${since.replace(/-/g, '.')}부터 집계돼요.` : null;
}

/** A ratio (0.0123) as a percentage (1.23%); null — no views — shows as a dash. */
export function formatCtr(ctr: number | null): string {
  if (ctr == null || !Number.isFinite(ctr)) return '-';
  return `${(ctr * 100).toFixed(2)}%`;
}
