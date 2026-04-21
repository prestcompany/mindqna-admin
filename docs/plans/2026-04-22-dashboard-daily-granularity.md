# Dashboard Daily Granularity Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Extend the admin dashboard so operators can switch between the existing month-based growth view and a new calendar-based day view without mixing the meaning of monthly and daily metrics.

**Architecture:** Keep the dashboard on one surface, but explicitly separate `month` and `day` aggregation modes in both the API and UI. Extend the existing dashboard growth endpoint with a `granularity` query parameter and return generic time buckets so the frontend can render either month-based or day-based charts from the same endpoint while updating KPI copy, presets, and date controls to match the chosen mode.

**Tech Stack:** Next.js pages router, React 18, TypeScript, TanStack Query, dayjs, react-day-picker, Tailwind/Radix UI, Chart.js, NestJS, Prisma, Jest

---

## Assumptions And Guardrails

- Keep the current dashboard behavior as the default first load: `month` mode with `최근 6개월`.
- Add a second mode: `day` mode with `최근 30일` as the default day-based window.
- Do not reuse monthly labels in day mode. Monthly terms such as `월말 누적`, `월간 순증` must become day-accurate terms such as `종료일 기준 누적`, `일간 순증`.
- Do not bolt a day-range calendar onto the current monthly endpoint semantics. Backend aggregation and frontend copy must change together.
- Reuse the existing date-range picker component at `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/ui/DatePickerWithRange.tsx` for day mode rather than inventing a new calendar widget.
- Keep `locale` as the comparison dimension. This feature does not introduce a new country taxonomy.
- Preserve the current top `전체 누적 현황` cards as global summary values that remain independent from month/day growth filters.

## Proposed API Contract

Replace the month-only response shape with a generic bucket contract while keeping one endpoint:

```ts
type DashboardGrowthGranularity = 'month' | 'day';

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

type DashboardGrowthBucket = {
  key: string; // "2026-04" for month, "2026-04-22" for day
  label: string; // "2026.04" or "2026.04.22"
  users: GrowthValue;
  spaces: GrowthValue;
  locales: LocaleGrowthRow[];
};

type DashboardGrowthResponse = {
  granularity: DashboardGrowthGranularity;
  summary: {
    users: GrowthValue;
    spaces: GrowthValue;
  };
  buckets: DashboardGrowthBucket[];
  localeTotals: LocaleGrowthRow[];
};
```

This keeps one network path while giving the frontend enough information to render either a month-based or day-based dashboard correctly.

## Task 1: Add Backend Granularity Contract And Tests

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/types/analytics.types.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/analytics.service.spec.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/admin.controller.ts`

**Step 1: Write the failing tests**

Add service tests for:

1. default monthly mode still returns month buckets
2. day mode returns day buckets inside the requested date range
3. day mode fills missing days with `delta: 0` and carries cumulative totals forward
4. locale totals remain correct in both granularities

Example spec shape:

```ts
it('builds daily cumulative growth with locale breakdowns', async () => {
  const result = await service.getDashboardGrowth({
    startedAt: '2026-04-01',
    endedAt: '2026-04-03',
    locale: [Locale.ko],
    granularity: 'day',
  });

  expect(result.granularity).toBe('day');
  expect(result.buckets[0]).toEqual(
    expect.objectContaining({
      key: '2026-04-01',
      users: { cumulative: 101, delta: 1 },
      spaces: { cumulative: 51, delta: 1 },
    }),
  );
});
```

**Step 2: Run test to verify it fails**

Run:

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" yarn test src/admin/analytics/analytics.service.spec.ts
```

Expected: `FAIL` because `granularity`, `buckets`, and daily aggregation do not exist yet.

**Step 3: Add minimal type contract**

Update `analytics.types.ts`:

```ts
export type DashboardGrowthGranularity = 'month' | 'day';

export type GetAnalyticsParams = {
  startedAt?: string;
  endedAt?: string;
  locale?: Locale[];
  spaceType?: SpaceType[];
  granularity?: DashboardGrowthGranularity;
};
```

Change `DashboardGrowthMonth` to `DashboardGrowthBucket`, and add `granularity` to `DashboardGrowthResponse`.

Update the admin controller query signature:

```ts
@TypedRoute.Get('/analytics/dashboard-growth')
async getDashboardGrowth(
  @TypedQuery() query: {
    startedAt?: string;
    endedAt?: string;
    locale?: Locale[];
    granularity?: DashboardGrowthGranularity;
  },
): Promise<DashboardGrowthResponse> {
  return this.analyticsService.getDashboardGrowth(query);
}
```

**Step 4: Run test to confirm type-level failures are gone but logic still fails**

Run the same Jest command.

Expected: still `FAIL`, but now on aggregation logic rather than missing properties.

**Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/analytics/types/analytics.types.ts src/admin/analytics/analytics.service.spec.ts src/admin/admin.controller.ts
git commit -m "test(analytics): define dashboard granularity contract"
```

## Task 2: Implement Backend Day And Month Aggregation

**Files:**
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/analytics.service.ts`
- Modify: `/Users/gargoyle92/Documents/backend/mindqna-server/src/admin/analytics/analytics.service.spec.ts`

**Step 1: Implement the failing logic minimally**

Inside `getDashboardGrowth`, branch on `granularity`:

- `month`: keep current month-bucket logic
- `day`: use `startOf('day')` / `endOf('day')`, group by day, fill missing days

Add helpers:

```ts
function getRangeBounds(params: GetAnalyticsParams) {
  const granularity = params.granularity ?? 'month';
  const end = params.endedAt
    ? dayjs(params.endedAt)[granularity === 'month' ? 'endOf' : 'endOf'](granularity === 'month' ? 'month' : 'day')
    : dayjs()[granularity === 'month' ? 'endOf' : 'endOf'](granularity === 'month' ? 'month' : 'day');
  const start = params.startedAt
    ? dayjs(params.startedAt)[granularity === 'month' ? 'startOf' : 'startOf'](granularity === 'month' ? 'month' : 'day')
    : granularity === 'month'
      ? end.subtract(5, 'month').startOf('month')
      : end.subtract(29, 'day').startOf('day');

  return { granularity, start, end };
}
```

Use raw SQL grouping:

```sql
DATE_FORMAT(createdAt, '%Y-%m-01')
DATE_FORMAT(createdAt, '%Y-%m-%d')
```

Do the same for `Space` creation dates joined with `SpaceInfo`.

**Step 2: Build generic buckets**

Refactor the existing `buildDashboardGrowthResponse` flow so it can accept:

- the bucket list (`month` or `day`)
- baseline rows before the first bucket
- per-bucket rows within the selected range

Return:

```ts
return {
  granularity,
  summary: {
    users: latestBucket ? latestBucket.users : createGrowthValue(0, 0),
    spaces: latestBucket ? latestBucket.spaces : createGrowthValue(0, 0),
  },
  buckets,
  localeTotals,
};
```

**Step 3: Run tests**

Run:

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" yarn test src/admin/analytics/analytics.service.spec.ts
```

Expected: `PASS`.

**Step 4: Run backend build**

Run:

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" yarn build
```

Expected: build succeeds.

**Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/analytics/analytics.service.ts src/admin/analytics/analytics.service.spec.ts
git commit -m "feat(analytics): support daily dashboard buckets"
```

## Task 3: Add Frontend Granularity State And API Wiring

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/dashboard.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/hooks/useAnalytics.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/types/growth.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/Dashboard.tsx`

**Step 1: Update client types**

Change the dashboard client response to match the backend:

```ts
export type DashboardGrowthGranularity = 'month' | 'day';

export interface DashboardGrowthBucket {
  key: string;
  label: string;
  users: GrowthValue;
  spaces: GrowthValue;
  locales: LocaleGrowthRow[];
}

export interface DashboardGrowthResponse {
  granularity: DashboardGrowthGranularity;
  summary: {
    users: GrowthValue;
    spaces: GrowthValue;
  };
  buckets: DashboardGrowthBucket[];
  localeTotals: LocaleGrowthRow[];
}
```

**Step 2: Pass `granularity` into the query**

Add dashboard state in `Dashboard.tsx`:

```ts
const [granularity, setGranularity] = useState<DashboardGrowthGranularity>('month');
```

Extend the query object:

```ts
const query = useMemo(
  () => ({
    startedAt: safeStartedAt.format('YYYY-MM-DD'),
    endedAt: safeEndedAt.format('YYYY-MM-DD'),
    locale: selectedLocales.length === DASHBOARD_LOCALES.length ? undefined : selectedLocales,
    granularity,
  }),
  [safeEndedAt, safeStartedAt, selectedLocales, granularity],
);
```

Update `useDashboardGrowthAnalytics` to accept and forward `granularity`.

**Step 3: Verify TypeScript**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
npx tsc --noEmit --pretty false --project tsconfig.json
```

Expected: no new dashboard-related errors.

**Step 4: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/dashboard.ts src/hooks/useAnalytics.ts src/components/page/dashboard/types/growth.ts src/components/page/dashboard/Dashboard.tsx
git commit -m "feat(dashboard): add growth granularity state"
```

## Task 4: Build The Month/Day Filter UX

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/sections/DashboardFilterBar.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/ui/DatePickerWithRange.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/Dashboard.tsx`

**Step 1: Add a mode toggle**

At the top of the filter area, add:

```tsx
<div className='flex gap-2'>
  <Button ... onClick={() => setGranularity('month')}>월별 보기</Button>
  <Button ... onClick={() => setGranularity('day')}>일별 보기</Button>
</div>
```

**Step 2: Split presets by mode**

Month mode presets:

- `최근 6개월`
- `최근 12개월`
- `올해`
- `월 범위 선택`

Day mode presets:

- `최근 7일`
- `최근 30일`
- `최근 90일`
- `직접 선택`

**Step 3: Reuse the calendar picker in day mode**

Render `DatePickerWithRange` only when `granularity === 'day'`.

Month mode continues to render the current `Select`-based month pickers.

**Step 4: Make range resets intentional**

When switching modes:

- `month` -> reset to `최근 6개월`
- `day` -> reset to `최근 30일`

Use helpers:

```ts
function getRangeFromGranularityPreset(granularity, preset) { ... }
```

**Step 5: Run frontend lint**

Run:

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npx next lint --file src/components/page/dashboard/Dashboard.tsx --file src/components/page/dashboard/sections/DashboardFilterBar.tsx --file src/components/ui/DatePickerWithRange.tsx
```

Expected: `No ESLint warnings or errors`.

**Step 6: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/dashboard/Dashboard.tsx src/components/page/dashboard/sections/DashboardFilterBar.tsx src/components/ui/DatePickerWithRange.tsx
git commit -m "feat(dashboard): add day range filter mode"
```

## Task 5: Make KPI, Chart, And Copy Dynamic By Granularity

**Files:**
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/utils/growth-mappers.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/types/growth.ts`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/OverviewTab.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/UserTab.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/tabs/SpaceTab.tsx`
- Modify: `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/components/page/dashboard/charts/GrowthComboChart.tsx`

**Step 1: Rename view-model internals from month-specific to bucket-specific**

Examples:

```ts
labels: buckets.map((bucket) => bucket.label)
periods: buckets.map((bucket) => bucket.key)
```

Avoid month-specific property names in the mapper.

**Step 2: Make KPI copy mode-aware**

Month mode:

- `종료 월 누적 가입자`
- `종료 월 가입자 순증`
- `종료 월 누적 공간`
- `종료 월 공간 순증`

Day mode:

- `종료일 기준 누적 가입자`
- `종료일 가입자 순증`
- `종료일 기준 누적 공간`
- `종료일 공간 순증`

**Step 3: Update chart descriptions**

Month mode:

- `월별 순증과 월말 누적`

Day mode:

- `일별 순증과 종료일 기준 누적`

**Step 4: Update section helper text**

Make these descriptions reflect the selected mode so the UI never says `월말` while the chart is actually daily.

**Step 5: Verify manually**

Manual QA checklist:

1. `월별 보기` 첫 진입이 `최근 6개월`로 보이는지 확인
2. `일별 보기` 전환 시 `최근 30일` 캘린더 범위가 보이는지 확인
3. KPI 라벨이 월/일 모드에 맞게 바뀌는지 확인
4. 차트 X축이 월/일 라벨에 맞게 바뀌는지 확인
5. 로케일 필터와 중앙 로딩 오버레이가 월/일 모드 모두에서 동작하는지 확인

**Step 6: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/dashboard/utils/growth-mappers.ts src/components/page/dashboard/types/growth.ts src/components/page/dashboard/tabs/OverviewTab.tsx src/components/page/dashboard/tabs/UserTab.tsx src/components/page/dashboard/tabs/SpaceTab.tsx src/components/page/dashboard/charts/GrowthComboChart.tsx
git commit -m "feat(dashboard): adapt growth copy for daily mode"
```

## Task 6: Full Verification And Cleanup

**Files:**
- Review only; no required file creation

**Step 1: Run backend verification**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" yarn test src/admin/analytics/analytics.service.spec.ts
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" yarn build
```

Expected: both pass.

**Step 2: Run frontend verification**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" npx next lint --file src/components/page/dashboard/Dashboard.tsx --file src/components/page/dashboard/sections/DashboardFilterBar.tsx --file src/components/ui/DatePickerWithRange.tsx --file src/components/page/dashboard/utils/growth-mappers.ts --file src/components/page/dashboard/tabs/OverviewTab.tsx --file src/components/page/dashboard/tabs/UserTab.tsx --file src/components/page/dashboard/tabs/SpaceTab.tsx --file src/components/page/dashboard/charts/GrowthComboChart.tsx --file src/client/dashboard.ts --file src/hooks/useAnalytics.ts --file src/components/page/dashboard/types/growth.ts
PATH="/Users/gargoyle92/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin:$PATH" yarn build
```

Expected: lint passes, build passes, only pre-existing unrelated warnings remain if any.

**Step 3: Final manual QA**

Check:

1. month mode default load
2. day mode switch
3. locale filter in both modes
4. loading overlay in both modes
5. question tab unaffected
6. top global summary still independent from growth mode

**Step 4: Final commits**

If verification required small fixes, commit them with focused messages such as:

```bash
git commit -m "fix(dashboard): align daily growth labels"
git commit -m "fix(analytics): fill empty daily buckets"
```

Do not squash unrelated frontend polish into the backend analytics commit.
