# 어드민 기능 토글 메뉴 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `/feature-flags` 화면에서 서버 기능 토글 16개를 보고, 확인 창을 거쳐 켬/끔하고, 조건(플랫폼·flavor·버전 범위)과 설명을 편집한다.

**Architecture:** API 호출은 `src/client/feature-flags.ts`, 폼 값 변환·검증·조건 요약은 순수 모듈 `services/feature-flag-form.ts`(node:test 로 검증)에 둔다. 화면은 목록 표(`FeatureFlagsManager`)와 편집 대화상자(`FeatureFlagEditDialog`) 두 컴포넌트다. 서버 상태는 TanStack Query 키 `['feature-flags']` 하나로 다룬다.

**Tech Stack:** Next.js 16 pages router, React 18, TanStack Query, shadcn/ui(`table`, `switch`, `alert-dialog`, `dialog`, `select`, `input`, `textarea`, `badge`), react-hook-form + zod, dayjs, sonner, node:test(tsx).

**Spec:** `docs/superpowers/specs/2026-11-03-feature-flags-admin-design.md`

## Global Constraints

- 서버 계약은 spec 의 "서버 API" 절 그대로다. 필드 이름을 바꾸지 않는다.
- 메뉴 이름 `기능 토글`, 경로 `/feature-flags`, 시스템 메뉴의 `앱 버전 관리` 바로 아래.
- 앱 기본값 표기: `on` → `켬`, `off` → `끔`, `env` → `빌드 설정`.
- 반영 안내 문구: `저장하면 운영 앱에 최대 30초 안에 반영됩니다. 이 화면은 접속한 리전 서버(운영/중국)의 값만 바꿉니다.`
- versionCode: 빈칸이면 `null`, 아니면 `^\d+$` 이고 1 이상. 최소 ≤ 최대. 설명 최대 191자.
- 수정자·이력·삭제 UI 는 만들지 않는다.
- 이모지 없음. DESIGN.md 토큰·컴포넌트만 쓴다.
- 검증: `npx tsc --noEmit`, `pnpm lint`(새 경고 0), `pnpm test`.

## Review Focus

- 행 없는 키를 편집 저장하면 `enabled: false` 행이 생겨 앱 기본값 `켬` 키가 운영에서 꺼진다 → 저장 전에 경고 확인을 받는다(Task 3 테스트 `needsCreateWarning`).
- 행 없는 키의 스위치를 켜면 조건 없는 `enabled: true` 행이 생긴다 → 확인 창에 "새 행을 만든다"와 조건 요약이 보인다(Task 1 `toToggleParams` 테스트).
- 저장 중 스위치를 연타하면 PUT 이 겹친다 → 요청 중에는 그 행의 스위치·편집 버튼을 막는다(Task 2 단계).
- 서버 행의 `platforms` 가 `['ios','android']` 이면 폼이 `전체`로 보여야 한다(Task 1 `toFormValues` 테스트).
- versionCode 칸에 `' 250 '`, `'250.0'`, `'1e3'`, `'0'` 을 넣으면 저장되지 않아야 한다(Task 1 스키마 테스트).

---

### Task 1: 타입·클라이언트·폼 변환 모듈

**Files:**
- Modify: `src/client/types.ts` (파일 끝에 추가)
- Create: `src/client/feature-flags.ts`
- Create: `src/components/page/feature-flags/services/feature-flag-form.ts`
- Test: `src/components/page/feature-flags/services/feature-flag-form.test.ts`

**Interfaces:**
- Produces (types.ts):
  - `FeatureFlagPlatform = 'ios' | 'android'`, `FeatureFlagFlavor = 'global' | 'huawei'`, `FeatureFlagAppDefault = 'on' | 'off' | 'env'`
  - `FeatureFlagRow`, `FeatureFlagItem = { key; label; appDefault; row: FeatureFlagRow | null }`, `FeatureFlagsResult = { items: FeatureFlagItem[] }`
  - `UpdateFeatureFlagParams = Omit<FeatureFlagRow, 'key' | 'updatedAt'>`
- Produces (client): `getFeatureFlags(): Promise<FeatureFlagsResult>` (`GET /feature-flags`), `updateFeatureFlag(key: string, body: UpdateFeatureFlagParams): Promise<FeatureFlagRow>` (`PUT /feature-flags/${encodeURIComponent(key)}`). `app-version.ts` 와 같은 꼴(`@base` client 가 `/admin` 접두사를 붙인다).
- Produces (form module):
  - `type FeatureFlagFormValues = { description: string; platform: 'all' | FeatureFlagPlatform; flavor: 'all' | FeatureFlagFlavor; minVersionCode: string; maxVersionCode: string }`
  - `featureFlagFormSchema: z.ZodType<FeatureFlagFormValues>` — Global Constraints 의 규칙. min>max 오류는 `maxVersionCode` 경로에 `최소 버전이 최대 버전보다 클 수 없습니다.`
  - `toFormValues(row: FeatureFlagRow | null): FeatureFlagFormValues` — 빈 배열·두 값 모두 든 배열은 `'all'`
  - `toUpdateParams(values: FeatureFlagFormValues, enabled: boolean): UpdateFeatureFlagParams` — `'all'` → `[]`, 빈칸 → `null`, 설명 trim
  - `toToggleParams(item: FeatureFlagItem, enabled: boolean): UpdateFeatureFlagParams` — 행이 있으면 기존 조건·설명 유지, 없으면 조건 없음·설명 `''`
  - `displayEnabled(item: FeatureFlagItem): boolean` — 행이 있으면 `row.enabled`, 없으면 `appDefault === 'on'`
  - `summarizeConditions(row: Pick<FeatureFlagRow, 'platforms' | 'flavors' | 'minVersionCode' | 'maxVersionCode'>): string`
  - `APP_DEFAULT_LABEL: Record<FeatureFlagAppDefault, string>`

- [ ] **Step 1: 실패하는 테스트 작성** (`snack-form-values.test.ts` 와 같은 node:test 꼴)

```ts
test('summarizeConditions describes each condition', () => {
  const none = { platforms: [], flavors: [], minVersionCode: null, maxVersionCode: null };
  assert.equal(summarizeConditions(none), '전체 플랫폼 · 전체 flavor · 버전 제한 없음');
  assert.equal(summarizeConditions({ ...none, platforms: ['ios'], flavors: ['huawei'], minVersionCode: 250, maxVersionCode: 260 }), 'iOS · huawei · 250–260');
  assert.equal(summarizeConditions({ ...none, minVersionCode: 250 }), '전체 플랫폼 · 전체 flavor · 250 이상');
  assert.equal(summarizeConditions({ ...none, maxVersionCode: 260 }), '전체 플랫폼 · 전체 flavor · 260 이하');
});

test('toFormValues treats both platforms as all', () => {
  assert.equal(toFormValues(row({ platforms: ['ios', 'android'] })).platform, 'all');
  assert.deepEqual(toFormValues(null), { description: '', platform: 'all', flavor: 'all', minVersionCode: '', maxVersionCode: '' });
});

test('toUpdateParams maps all to empty arrays and blanks to null', () => {
  assert.deepEqual(
    toUpdateParams({ description: ' 메모 ', platform: 'android', flavor: 'all', minVersionCode: '250', maxVersionCode: '' }, true),
    { enabled: true, platforms: ['android'], flavors: [], minVersionCode: 250, maxVersionCode: null, description: '메모' },
  );
});

test('schema rejects malformed version codes, min > max and long descriptions', () => {
  const base = toFormValues(null);
  for (const v of ['0', ' 250 ', '250.0', '1e3', '-1']) {
    assert.equal(featureFlagFormSchema.safeParse({ ...base, minVersionCode: v }).success, false, v);
  }
  const reversed = featureFlagFormSchema.safeParse({ ...base, minVersionCode: '260', maxVersionCode: '250' });
  assert.equal(reversed.success, false);
  assert.deepEqual(reversed.error?.issues[0].path, ['maxVersionCode']);
  assert.equal(featureFlagFormSchema.safeParse({ ...base, description: 'a'.repeat(192) }).success, false);
  assert.equal(featureFlagFormSchema.safeParse({ ...base, minVersionCode: '250', maxVersionCode: '250' }).success, true);
});

test('toToggleParams keeps existing conditions and creates an unconditioned row otherwise', () => {
  const existing = row({ enabled: false, platforms: ['ios'], minVersionCode: 250, description: '메모' });
  assert.deepEqual(toToggleParams(item({ row: existing }), true), { enabled: true, platforms: ['ios'], flavors: [], minVersionCode: 250, maxVersionCode: null, description: '메모' });
  assert.deepEqual(toToggleParams(item({ row: null }), true), { enabled: true, platforms: [], flavors: [], minVersionCode: null, maxVersionCode: null, description: '' });
});

test('displayEnabled falls back to the app default only when there is no row', () => {
  assert.equal(displayEnabled(item({ appDefault: 'on', row: null })), true);
  assert.equal(displayEnabled(item({ appDefault: 'env', row: null })), false);
  assert.equal(displayEnabled(item({ appDefault: 'on', row: row({ enabled: false }) })), false);
});
```

`row(partial)`·`item(partial)` 은 테스트 파일 안의 작은 팩토리다(기본값: key `wallet.offerwall.tnk`, 조건 없음, `updatedAt: '2026-11-03T06:00:00.000Z'`).

- [ ] **Step 2: 실패 확인** — `pnpm exec tsx --test src/components/page/feature-flags/services/feature-flag-form.test.ts` → 모듈이 없어 FAIL
- [ ] **Step 3: types·client·form 모듈 구현** — 위 Interfaces 그대로. 정규식 `^\d+$` 뒤 `Number(v) >= 1`.
- [ ] **Step 4: 통과 확인** — 같은 명령 PASS, `npx tsc --noEmit` 통과
- [ ] **Step 5: 커밋** — `feat(feature-flags): add client and form helpers`

### Task 2: 메뉴·페이지·목록과 켬/끔 확인

**Files:**
- Modify: `src/components/layout/main-menu.tsx` (`app-version` 항목 다음, 아이콘 `ToggleRight`)
- Modify: `src/components/layout/route-labels.ts` (`'feature-flags': '기능 토글'`)
- Create: `src/pages/feature-flags/index.tsx` (`src/pages/app-version/index.tsx` 와 같은 꼴)
- Create: `src/components/page/feature-flags/FeatureFlagsManager.tsx`

**Interfaces:**
- Consumes: Task 1 의 `getFeatureFlags`, `updateFeatureFlag`, `toToggleParams`, `displayEnabled`, `summarizeConditions`, `APP_DEFAULT_LABEL`
- Produces: `FeatureFlagsManager` 가 `FeatureFlagEditDialog`(Task 3)를 `{ item: FeatureFlagItem | null; onOpenChange(open: boolean): void }` 로 연다. Task 2 에서는 편집 버튼과 상태만 두고 대화상자 연결은 Task 3 에서 한다.

- [ ] **Step 1: 메뉴·라벨·페이지 추가** — 사이드바에 `기능 토글`이 `앱 버전 관리` 아래에 보이고 `/feature-flags` 가 열린다.
- [ ] **Step 2: 목록 구현** — `useQuery({ queryKey: ['feature-flags'], queryFn: getFeatureFlags })`. 위에 Global Constraints 의 반영 안내. 표 열: 키(`font-mono`, 아래 `label`, 행이 있으면 `description`), 상태(스위치 + 행 없으면 `앱 기본값: {APP_DEFAULT_LABEL}` 뱃지), 조건(행 있으면 `summarizeConditions(row)`, 없으면 `-`), 수정 시각(`dayjs(updatedAt).format('YYYY-MM-DD HH:mm')`, 없으면 `-`), 편집 버튼. 로딩·오류 상태는 다른 목록 화면과 같은 꼴.
- [ ] **Step 3: 켬/끔 확인 창** — 스위치 `onCheckedChange` 는 바로 저장하지 않고 `{ item, next }` 를 상태에 담아 `AlertDialog` 를 연다. 본문: 키, `켬으로`/`끔으로`, 조건 요약(행이 없으면 `행이 없어 조건 없이 새로 만듭니다.`), `저장 즉시 운영 앱에 반영됩니다(최대 30초).` 확인 시 `useMutation` 으로 `updateFeatureFlag(item.key, toToggleParams(item, next))`, 성공하면 `invalidateQueries(['feature-flags'])` + `toast.success`, 실패하면 서버 메시지 `toast.error`. 취소하면 요청 없음. 스위치는 항상 `displayEnabled(item)` 을 그리므로 실패·취소 시 서버 값 그대로다.
- [ ] **Step 4: 연타 방지** — mutation 이 진행 중인 키의 스위치와 편집 버튼은 `disabled`.
- [ ] **Step 5: 확인** — `npx tsc --noEmit`, `pnpm lint` 새 경고 0. 서버가 아직 없으면 `pnpm dev` 로 화면이 뜨고 오류 상태가 깨지지 않는지만 본다.
- [ ] **Step 6: 커밋** — `feat(feature-flags): add feature flag list with confirmed toggles`

### Task 3: 편집 대화상자

**Files:**
- Create: `src/components/page/feature-flags/FeatureFlagEditDialog.tsx`
- Modify: `src/components/page/feature-flags/FeatureFlagsManager.tsx` (편집 버튼 연결)
- Modify: `src/components/page/feature-flags/services/feature-flag-form.ts`, 테스트 파일

**Interfaces:**
- Consumes: `featureFlagFormSchema`, `toFormValues`, `toUpdateParams`, `updateFeatureFlag`
- Produces: `needsCreateWarning(item: FeatureFlagItem): boolean` — `item.row === null`

- [ ] **Step 1: 실패하는 테스트**

```ts
test('editing a key without a row needs a create warning', () => {
  assert.equal(needsCreateWarning(item({ row: null })), true);
  assert.equal(needsCreateWarning(item({ row: row({}) })), false);
});
```

- [ ] **Step 2: 실패 확인** — `pnpm exec tsx --test src/components/page/feature-flags/services/feature-flag-form.test.ts` FAIL
- [ ] **Step 3: 구현** — `needsCreateWarning` 추가. 대화상자: 제목은 키, 부제는 `label`. `useForm({ resolver: zodResolver(featureFlagFormSchema), values: toFormValues(item.row) })`. 필드: 설명(`Textarea`, `maxLength` 없이 스키마로 191자 오류), 플랫폼 `Select`(전체/iOS/Android), flavor `Select`(전체/global/huawei), 최소·최대 versionCode `Input inputMode='numeric'`(빈칸 = 제한 없음 안내). 저장 시 `updateFeatureFlag(item.key, toUpdateParams(values, item.row?.enabled ?? false))`. `needsCreateWarning(item)` 이면 저장 버튼 위에 경고 문구 `이 키는 아직 서버 행이 없습니다. 저장하면 꺼진 상태로 새로 만들어져, 앱 기본값({APP_DEFAULT_LABEL})이 아닌 꺼짐으로 바뀝니다.` 와 체크박스 `이해했습니다`를 두고, 체크해야 저장 버튼이 켜진다. 성공 시 `invalidateQueries(['feature-flags'])`, 닫기, `toast.success`. 실패 시 서버 메시지 토스트, 대화상자 유지.
- [ ] **Step 4: 통과 확인** — `pnpm test` PASS, `npx tsc --noEmit`, `pnpm lint` 새 경고 0
- [ ] **Step 5: 커밋** — `feat(feature-flags): edit flag conditions and description`

### Task 4: 서버와 붙여 확인하고 PR

- [ ] **Step 1: 서버 준비 확인** — mindqna-server 의 feature-flags 브랜치가 로컬(`http://localhost:3000`)이나 dev 에 떠 있어야 한다. 없으면 이 Task 는 서버 배포 뒤로 미루고 PR 은 draft 로 연다.
- [ ] **Step 2: 화면 확인**(`pnpm dev`, 포트 4000) — 16개 키가 보이는지, 행 없는 키 뱃지, 스위치 취소 시 네트워크 요청 없음, 켬 확인 뒤 수정 시각 갱신, 편집 저장 뒤 조건 요약 갱신, 최소 > 최대·`0` 입력 시 오류 문구, 행 없는 키 편집 시 경고·체크박스.
- [ ] **Step 3: PR** — base `main`. 본문에 spec·서버 PR 링크, 서버가 먼저 배포돼야 한다는 점, admin-china 도 같은 화면으로 중국 서버 값을 바꾼다는 점을 적는다.
