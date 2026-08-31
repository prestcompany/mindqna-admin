# Dashboard Growth Overhaul Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a Vercel-style admin dashboard that shows month-end cumulative users/spaces, monthly deltas, and locale-level breakdowns across a selectable period while reorganizing the full dashboard into clearer tabs.

**Architecture:** Add a dedicated admin analytics endpoint that returns month-bucketed growth aggregates for both users and spaces in one response, including total KPIs and locale breakdowns. On the frontend, replace the current raw-list chart pipeline with a normalized dashboard-growth view model plus reusable KPI, chart, and table sections shared by the Overview, Users, and Spaces tabs. Keep the existing card analytics endpoint, but restyle the Cards tab so the whole dashboard feels like one coherent operating surface.

**Tech Stack:** Next.js pages router, React 18, TypeScript, TanStack Query, Chart.js, Tailwind/Radix UI, dayjs, Framer Motion, NestJS, Prisma, Jest

---

## Assumptions And Guardrails

- `누적` is defined as the month-end cumulative total since product launch, not "cumulative within only the selected range".
- `(+10,000)` is defined as that month's net new value (`delta`) for the same metric.
- v1 will implement `국가별` using existing `locale` fields (`ko`, `en`, `ja`, `zh`, `zhTw`, `es`, `id`). The current schema does not expose a reliable country dimension for both `User` and `Space`.
- Default dashboard window should be the last 12 months, but the operator can switch to a custom range.
- Keep the UI aligned with `/Users/gargoyle92/Documents/frontend/mindqna-admin/AGENTS.md`: white-background-first, Vercel-like restraint, high information density, predictable actions, no gratuitous dark mode.
- Frontend note: this repo does not currently ship with a dedicated UI unit test runner. For frontend tasks, use compile-contract-first development plus targeted lint/type verification and manual QA. Do not add Vitest/Jest to the admin repo in this feature.
- Project-wide TypeScript already has unrelated residual issues called out in `AGENTS.md`. For frontend verification, capture `tsc` output and confirm there are no new errors in modified dashboard files.

## Target API Shape

```ts
type GrowthValue = {
  cumulative: number;
  delta: number;
};

type LocaleGrowthRow = {
  locale: Locale;
  label: string;
  users: GrowthValue;
  spaces: GrowthValue;
};

type DashboardGrowthMonth = {
  month: string; // "2026-01"
  label: string; // "2026.01"
  users: GrowthValue;
  spaces: GrowthValue;
  locales: LocaleGrowthRow[];
};

type DashboardGrowthResponse = {
  summary: {
    users: GrowthValue;
    spaces: GrowthValue;
  };
  months: DashboardGrowthMonth[];
  localeTotals: LocaleGrowthRow[];
};
```

This contract lets the frontend render all of the following from one query:

- top KPI cards
- cumulative trend charts
- monthly delta badges like `200,000 (+10,000)`
- locale leaderboard / comparison table
- Overview, Users, and Spaces tabs without re-fetching multiple endpoints

## Task 1: Add The Backend Dashboard Growth API

**Files:**
- Create: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/analytics.service.spec.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/analytics.service.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/types/analytics.types.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/admin.controller.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/test-utils/create-prisma-service.mock.ts`

**Step 1: Write the failing test**

Create `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/analytics.service.spec.ts` with service-level coverage for:

1. month-end cumulative math
2. locale breakdown math
3. empty month gap filling
4. controller-facing response shape

Use the existing admin spec style (`Test.createTestingModule`, mocked service dependencies, no real DB).

```ts
it('builds month-end cumulative growth with locale breakdowns', async () => {
  databaseManager.read.mockImplementation(async (cb) => cb(prisma as any));

  prisma.$queryRaw
    .mockResolvedValueOnce([
      { locale: Locale.ko, count: BigInt(190000) },
      { locale: Locale.en, count: BigInt(10000) },
    ])
    .mockResolvedValueOnce([
      { monthStart: new Date('2026-01-01T00:00:00.000Z'), locale: Locale.ko, count: BigInt(6000) },
      { monthStart: new Date('2026-01-01T00:00:00.000Z'), locale: Locale.en, count: BigInt(4000) },
      { monthStart: new Date('2026-02-01T00:00:00.000Z'), locale: Locale.ko, count: BigInt(5000) },
    ])
    .mockResolvedValueOnce([{ locale: Locale.ko, count: BigInt(78000) }])
    .mockResolvedValueOnce([
      { monthStart: new Date('2026-01-01T00:00:00.000Z'), locale: Locale.ko, count: BigInt(800) },
      { monthStart: new Date('2026-02-01T00:00:00.000Z'), locale: Locale.ko, count: BigInt(700) },
    ]);

  const result = await service.getDashboardGrowth({
    startedAt: '2026-01-01',
    endedAt: '2026-02-28',
    locale: [Locale.ko, Locale.en],
  });

  expect(result.summary).toEqual({
    users: { cumulative: 215000, delta: 5000 },
    spaces: { cumulative: 79500, delta: 700 },
  });
  expect(result.months[0]).toEqual(
    expect.objectContaining({
      month: '2026-01',
      users: { cumulative: 210000, delta: 10000 },
      spaces: { cumulative: 78800, delta: 800 },
    }),
  );
  expect(result.localeTotals).toContainEqual(
    expect.objectContaining({
      locale: Locale.ko,
      users: { cumulative: 201000, delta: 11000 },
      spaces: { cumulative: 79500, delta: 1500 },
    }),
  );
});
```

Also add a second test that requests `2026-01-01` through `2026-03-31` with no February rows and asserts the service still returns a `2026-02` month object with `delta: 0` and unchanged cumulative values.

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
yarn test admin/analytics/analytics.service.spec.ts --runInBand
```

Expected: `FAIL` because `getDashboardGrowth` does not exist yet and the new response types are missing.

**Step 3: Write minimal implementation**

Add a new API route and service method:

```ts
@TypedRoute.Get('/analytics/dashboard-growth')
async getDashboardGrowth(
  @TypedQuery() query: { startedAt?: string; endedAt?: string; locale?: Locale[] },
): Promise<DashboardGrowthResponse> {
  return this.analyticsService.getDashboardGrowth(query);
}
```

Inside `AnalyticsService`, normalize the range to month boundaries and use four read queries:

1. user baseline counts before the first month, grouped by locale
2. user monthly deltas within the range, grouped by month + locale
3. space baseline counts before the first month, grouped by locale
4. space monthly deltas within the range, grouped by month + locale

Use `$queryRaw` for the grouped month queries, because Prisma `groupBy` cannot bucket dates into calendar months cleanly.

```ts
async getDashboardGrowth(params: GetAnalyticsParams): Promise<DashboardGrowthResponse> {
  const locales = params.locale?.length ? params.locale : Object.values(Locale);
  const startMonth = dayjs(params.startedAt ?? dayjs().subtract(11, 'month').format('YYYY-MM-DD')).startOf('month');
  const endMonth = dayjs(params.endedAt ?? dayjs().format('YYYY-MM-DD')).endOf('month');

  return this.databaseManager.read(async (prisma) => {
    const [userBaselineRows, userMonthlyRows, spaceBaselineRows, spaceMonthlyRows] = await Promise.all([
      prisma.$queryRaw<UserBaselineRow[]>`...`,
      prisma.$queryRaw<UserMonthlyRow[]>`...`,
      prisma.$queryRaw<SpaceBaselineRow[]>`...`,
      prisma.$queryRaw<SpaceMonthlyRow[]>`...`,
    ]);

    return buildDashboardGrowthResponse({
      locales,
      startMonth,
      endMonth,
      userBaselineRows,
      userMonthlyRows,
      spaceBaselineRows,
      spaceMonthlyRows,
    });
  });
}
```

Implementation rules:

- fill every month in the requested range, even when the count is `0`
- compute cumulative values month-by-month from the baseline
- expose both overall totals and per-locale totals
- return locale rows in a stable order matching the `locales` filter
- remove debug `console.log` usage from analytics endpoints while touching these files

Update `create-prisma-service.mock.ts` to include:

```ts
$queryRaw: jest.fn(),
```

Add new TypeScript interfaces to `analytics.types.ts` for `DashboardGrowthResponse`, `DashboardGrowthMonth`, and `GrowthValue`.

**Step 4: Run test to verify it passes**

Run:

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
yarn test admin/analytics/analytics.service.spec.ts --runInBand
```

Expected: `PASS` and no snapshots.

**Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/analytics/analytics.service.spec.ts src/admin/analytics/analytics.service.ts src/admin/analytics/types/analytics.types.ts src/admin/admin.controller.ts src/admin/test-utils/create-prisma-service.mock.ts
git commit -m "feat: add dashboard growth analytics endpoint"
```

## Task 2: Wire The Frontend Data Contract And View Model

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/dashboard.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useAnalytics.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/Dashboard.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/types/growth.ts`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/utils/growth-mappers.ts`

**Step 1: Write the failing type contract**

Update `Dashboard.tsx` so the page shell expects a new hook and a normalized view model before those files exist:

```ts
const { data, isLoading } = useDashboardGrowthAnalytics(query);
const dashboard = buildDashboardGrowthViewModel(data);

dashboard.kpis.users.value;
dashboard.overviewTrend.datasets;
dashboard.localeLeaderboard[0]?.label;
```

This should force the compiler to fail until the new client types, hook, and mapper are in place.

**Step 2: Run type check to verify it fails**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-tsc.log || true
rg "src/components/page/dashboard/Dashboard.tsx|src/hooks/useAnalytics.ts|src/client/dashboard.ts|src/components/page/dashboard/types/growth.ts|src/components/page/dashboard/utils/growth-mappers.ts" /tmp/mindqna-dashboard-tsc.log
```

Expected: errors mentioning missing `useDashboardGrowthAnalytics`, missing response types, or missing `buildDashboardGrowthViewModel`.

**Step 3: Write minimal implementation**

Add a new client method and query hook:

```ts
export async function getDashboardGrowthAnalytics(by: {
  startedAt?: string;
  endedAt?: string;
  locale?: string[];
}) {
  const res = await client.get<DashboardGrowthResponse>('/analytics/dashboard-growth', { params: by });
  return res.data;
}
```

```ts
function useDashboardGrowthAnalytics(by: Props) {
  return useQuery({
    queryKey: ['analytics/dashboard-growth', by],
    queryFn: () => getDashboardGrowthAnalytics(by),
  });
}
```

In `growth.ts`, define frontend-safe types for:

- KPI card rows
- chart series
- locale leaderboard rows
- month labels and delta formatters

In `growth-mappers.ts`, add pure helpers to:

- map locale code to label (`ko -> 한국어`, etc.)
- convert API months into chart data
- build KPI strings like `200,000 (+10,000)`
- expose reusable structures for Overview, Users, and Spaces tabs

Keep the helper API small:

```ts
export function buildDashboardGrowthViewModel(data?: DashboardGrowthResponse): DashboardGrowthViewModel
export function formatMetricWithDelta(cumulative: number, delta: number): string
export function getLocaleLabel(locale: Locale): string
```

**Step 4: Run verification to verify it passes**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-tsc.log || true
rg "src/components/page/dashboard/Dashboard.tsx|src/hooks/useAnalytics.ts|src/client/dashboard.ts|src/components/page/dashboard/types/growth.ts|src/components/page/dashboard/utils/growth-mappers.ts" /tmp/mindqna-dashboard-tsc.log
yarn next lint --file src/components/page/dashboard/Dashboard.tsx --file src/hooks/useAnalytics.ts --file src/client/dashboard.ts
```

Expected:

- `rg` prints nothing for the touched dashboard/client files
- `next lint` passes for the listed files

**Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/dashboard.ts src/hooks/useAnalytics.ts src/components/page/dashboard/Dashboard.tsx src/components/page/dashboard/types/growth.ts src/components/page/dashboard/utils/growth-mappers.ts
git commit -m "feat: wire dashboard growth data model"
```

## Task 3: Rebuild The Dashboard Shell, Filters, And Tab Structure

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/Dashboard.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/OverviewTab.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/sections/DashboardHero.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/sections/DashboardFilterBar.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/sections/DashboardMetricCard.tsx`

**Step 1: Write the failing type contract**

Stop aliasing `UserTab` as the Overview tab and switch the dashboard to the final tab structure:

```ts
<Tabs defaultValue='overview'>
  <TabsTrigger value='overview'>개요</TabsTrigger>
  <TabsTrigger value='users'>가입자</TabsTrigger>
  <TabsTrigger value='spaces'>공간</TabsTrigger>
  <TabsTrigger value='cards'>질문</TabsTrigger>
</Tabs>
```

Reference the new files immediately:

```ts
<DashboardHero ... />
<DashboardFilterBar ... />
<OverviewTab dashboard={dashboard} />
```

**Step 2: Run type check to verify it fails**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-shell-tsc.log || true
rg "DashboardHero|DashboardFilterBar|DashboardMetricCard|OverviewTab" /tmp/mindqna-dashboard-shell-tsc.log
```

Expected: missing component/type errors.

**Step 3: Write minimal implementation**

Implement a new shell that matches the repo's admin UI rules:

- white primary surface with subtle top gradient only as accent
- sticky filter bar under the hero header
- compact KPI-first layout for fast scan
- predictable action positions and no full-screen gimmicks

`DashboardHero.tsx` responsibilities:

- title and supporting description
- "last updated" timestamp
- two-line summary of the current range

`DashboardFilterBar.tsx` responsibilities:

- preset chips: `최근 6개월`, `최근 12개월`, `올해`, `직접 선택`
- locale multi-select or chip toggles for visible locales
- existing `DatePickerWithRange` reused for custom ranges

`Dashboard.tsx` responsibilities:

- own the selected range and locale filters
- use `startTransition` when changing presets so chart rerenders do not feel sticky
- use `useDeferredValue` for the query object if chart rerenders feel heavy
- render the new tab structure and pass the normalized view model down

`DashboardMetricCard.tsx` responsibilities:

- show `label`, `formatted value`, and delta text in one compact component
- support a small accent pill like `전월 대비`
- keep visuals white-first with thin borders and muted accents

**Step 4: Run verification to verify it passes**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-shell-tsc.log || true
rg "src/components/page/dashboard/Dashboard.tsx|src/components/page/dashboard/tabs/OverviewTab.tsx|src/components/page/dashboard/sections/DashboardHero.tsx|src/components/page/dashboard/sections/DashboardFilterBar.tsx|src/components/page/dashboard/sections/DashboardMetricCard.tsx" /tmp/mindqna-dashboard-shell-tsc.log
yarn next lint --file src/components/page/dashboard/Dashboard.tsx --file src/components/page/dashboard/tabs/OverviewTab.tsx --file src/components/page/dashboard/sections/DashboardHero.tsx --file src/components/page/dashboard/sections/DashboardFilterBar.tsx --file src/components/page/dashboard/sections/DashboardMetricCard.tsx
```

Expected:

- no dashboard-shell-specific TypeScript errors in the captured log
- `next lint` passes for the new shell files

**Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/dashboard/Dashboard.tsx src/components/page/dashboard/tabs/OverviewTab.tsx src/components/page/dashboard/sections/DashboardHero.tsx src/components/page/dashboard/sections/DashboardFilterBar.tsx src/components/page/dashboard/sections/DashboardMetricCard.tsx
git commit -m "feat: rebuild dashboard shell"
```

## Task 4: Implement The Overview, Users, And Spaces Growth Visuals

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/OverviewTab.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/UserTab.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/SpaceTab.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/charts/GrowthComboChart.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/charts/LocaleShareChart.tsx`
- Create: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tables/LocaleGrowthTable.tsx`

**Step 1: Write the failing type contract**

Move the tabs to the new shared props model before the chart/table files exist:

```ts
<GrowthComboChart series={dashboard.userTrend} />
<LocaleShareChart rows={dashboard.spaceLocaleRows} />
<LocaleGrowthTable rows={dashboard.userLocaleRows} metric='users' />
```

Add props to `OverviewTab`, `UserTab`, and `SpaceTab` so they accept the normalized dashboard view model instead of raw `startedAt` / `endedAt` pairs.

**Step 2: Run type check to verify it fails**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-growth-tsc.log || true
rg "GrowthComboChart|LocaleShareChart|LocaleGrowthTable|src/components/page/dashboard/tabs/UserTab.tsx|src/components/page/dashboard/tabs/SpaceTab.tsx|src/components/page/dashboard/tabs/OverviewTab.tsx" /tmp/mindqna-dashboard-growth-tsc.log
```

Expected: missing component and prop errors.

**Step 3: Write minimal implementation**

Use shared layout rules across the three tabs:

- Overview tab:
  - 4 KPI cards: cumulative users, user delta, cumulative spaces, space delta
  - one combined trend panel
  - one locale leaderboard table
  - one quick insight card for top-growth locale
- Users tab:
  - cumulative line + delta bars by month
  - locale comparison table
  - optional share chart by locale
- Spaces tab:
  - same structure as Users tab for predictable scanning

Visual rules:

- display the metric headline in the requested style, for example `200,000 (+10,000)`
- use non-purple accent colors first: zinc, slate, emerald, sky, amber
- keep legends readable and tooltips concise
- use `truncate + tooltip` for long locale labels only if a new label source is introduced later
- avoid row expand; keep comparisons in a flat table

`GrowthComboChart.tsx` should render:

- bars for monthly `delta`
- line for `cumulative`
- shared tooltip showing both values for the hovered month

`LocaleGrowthTable.tsx` should render:

- locale label
- current cumulative users/spaces
- range delta
- share or rank column

**Step 4: Run verification to verify it passes**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-growth-tsc.log || true
rg "src/components/page/dashboard/tabs/OverviewTab.tsx|src/components/page/dashboard/tabs/UserTab.tsx|src/components/page/dashboard/tabs/SpaceTab.tsx|src/components/page/dashboard/charts/GrowthComboChart.tsx|src/components/page/dashboard/charts/LocaleShareChart.tsx|src/components/page/dashboard/tables/LocaleGrowthTable.tsx" /tmp/mindqna-dashboard-growth-tsc.log
yarn next lint --file src/components/page/dashboard/tabs/OverviewTab.tsx --file src/components/page/dashboard/tabs/UserTab.tsx --file src/components/page/dashboard/tabs/SpaceTab.tsx --file src/components/page/dashboard/charts/GrowthComboChart.tsx --file src/components/page/dashboard/charts/LocaleShareChart.tsx --file src/components/page/dashboard/tables/LocaleGrowthTable.tsx
```

Expected:

- no new TypeScript errors for the touched growth-tab files
- `next lint` passes for the listed files

**Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/dashboard/tabs/OverviewTab.tsx src/components/page/dashboard/tabs/UserTab.tsx src/components/page/dashboard/tabs/SpaceTab.tsx src/components/page/dashboard/charts/GrowthComboChart.tsx src/components/page/dashboard/charts/LocaleShareChart.tsx src/components/page/dashboard/tables/LocaleGrowthTable.tsx
git commit -m "feat: add dashboard growth tabs"
```

## Task 5: Align The Cards Tab, Remove Legacy Dashboard Code, And Verify End-To-End

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/CardTab.tsx`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/charts/UserChart.tsx`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/charts/SpaceChart.tsx`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/charts/SpaceTypeChart.tsx`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tables/UserTable.tsx`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tables/SpaceTable.tsx`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useChartData.ts`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/types/index.ts`
- Delete: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/utils/countFunctions.ts`

**Step 1: Write the failing cleanup check**

After migrating Users and Spaces tabs to the new architecture, delete the old imports and search for stragglers:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
rg -n "useChartData|UserChart|SpaceChart|SpaceTypeChart|UserTable|SpaceTable|countSameCreatedAt|countItemsWithSameKey" src
```

Expected: references still exist before cleanup.

**Step 2: Run verification to confirm cleanup is needed**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-cleanup-tsc.log || true
rg "useChartData|UserChart|SpaceChart|SpaceTypeChart|UserTable|SpaceTable" /tmp/mindqna-dashboard-cleanup-tsc.log
```

Expected: stale imports or deleted-symbol errors until cleanup is finished.

**Step 3: Write minimal implementation**

Polish `CardTab.tsx` so it visually matches the new dashboard:

- same section spacing and card chrome as Overview/Users/Spaces
- same heading hierarchy and description tone
- keep existing card analytics data source intact
- remove outdated comments and noisy warning phrasing where possible

Then remove the now-unused legacy dashboard files listed above.

Before deleting, confirm the new tabs do not import them anymore.

**Step 4: Run full verification to verify it passes**

Run:

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
yarn test admin/analytics/analytics.service.spec.ts --runInBand

cd /Users/gargoyle92/Documents/frontend/mindqna-admin
rg -n "useChartData|UserChart|SpaceChart|SpaceTypeChart|UserTable|SpaceTable|countSameCreatedAt|countItemsWithSameKey" src
./node_modules/.bin/tsc --noEmit --pretty false > /tmp/mindqna-dashboard-final-tsc.log || true
rg "src/components/page/dashboard|src/client/dashboard.ts|src/hooks/useAnalytics.ts" /tmp/mindqna-dashboard-final-tsc.log
yarn next lint --file src/components/page/dashboard/Dashboard.tsx --file src/components/page/dashboard/tabs/OverviewTab.tsx --file src/components/page/dashboard/tabs/UserTab.tsx --file src/components/page/dashboard/tabs/SpaceTab.tsx --file src/components/page/dashboard/tabs/CardTab.tsx --file src/client/dashboard.ts --file src/hooks/useAnalytics.ts
```

Expected:

- backend analytics spec passes
- `rg` finds no legacy dashboard symbol usage in `src`
- the captured TypeScript log contains no new errors for modified dashboard/client files
- `next lint` passes for the dashboard/client files

Manual QA checklist:

1. Open `/dashboard/analytics`.
2. Confirm the default window shows the most recent 12 months.
3. Confirm KPI cards show the combined format, for example `200,000 (+10,000)`.
4. Change presets between `최근 6개월`, `최근 12개월`, and `올해`.
5. Toggle at least two locales and confirm both charts and tables respond.
6. Switch across `개요`, `가입자`, `공간`, `질문` and confirm the filter bar and visual system stay consistent.
7. Confirm Cards tab still loads existing data and no legacy chart components remain.

Optional final check if the branch is otherwise green:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
yarn build
```

If `yarn build` fails, only accept failures that were already known unrelated backlog items from `AGENTS.md`. Do not ship new dashboard-specific build failures.

**Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/dashboard/tabs/CardTab.tsx src/components/page/dashboard/Dashboard.tsx src/components/page/dashboard/tabs/OverviewTab.tsx src/components/page/dashboard/tabs/UserTab.tsx src/components/page/dashboard/tabs/SpaceTab.tsx src/components/page/dashboard/charts/GrowthComboChart.tsx src/components/page/dashboard/charts/LocaleShareChart.tsx src/components/page/dashboard/tables/LocaleGrowthTable.tsx src/components/page/dashboard/sections/DashboardHero.tsx src/components/page/dashboard/sections/DashboardFilterBar.tsx src/components/page/dashboard/sections/DashboardMetricCard.tsx src/components/page/dashboard/types/growth.ts src/components/page/dashboard/utils/growth-mappers.ts src/client/dashboard.ts src/hooks/useAnalytics.ts
git rm src/components/page/dashboard/charts/UserChart.tsx src/components/page/dashboard/charts/SpaceChart.tsx src/components/page/dashboard/charts/SpaceTypeChart.tsx src/components/page/dashboard/tables/UserTable.tsx src/components/page/dashboard/tables/SpaceTable.tsx src/hooks/useChartData.ts src/components/page/dashboard/types/index.ts src/components/page/dashboard/utils/countFunctions.ts
git commit -m "refactor: align dashboard tabs and remove legacy charts"
```

## Notes For The Implementer

- Do not reuse the old `useChartData` raw-list approach. The new endpoint exists specifically so the frontend can stop rebuilding analytics from raw `users` and `spaces` arrays.
- Do not add new global design tokens for this feature. Keep the visual changes local to dashboard components unless a truly shared primitive emerges.
- Do not widen scope into real country detection in this feature. If the product later needs true country breakdowns, that should be a separate backend data-source project.
- Keep the diff honest: backend correctness first, frontend view model second, shell third, visuals fourth, cleanup last.
