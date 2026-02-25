# Admin Design System Flexibility Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** shadcn 기반으로 토큰/테마를 표준화하고, 런타임에서 Vercel/Supabase/Cloudflare 스타일로 유연하게 전환 가능한 어드민 디자인 시스템을 구축한다.

**Architecture:** 기존 `components/ui`(shadcn primitive)는 유지하고, `theme provider + semantic tokens + pattern layer`를 추가한다. 페이지는 한 번에 전부 바꾸지 않고, 공통 셸/헤더/필터 패턴부터 단계적으로 마이그레이션한다. 페이지 헤더 메타는 라우트 기반 fallback을 추가해 레거시 선언과 공존시킨다.

**Tech Stack:** Next.js Pages Router, React 18, TypeScript, Tailwind CSS, shadcn/ui (Radix), Lucide

---

### Task 1: Theme Token Contract 정의

**Files:**

- Modify: `src/styles/globals.css`
- Modify: `tailwind.config.js`

**Step 1: semantic color token 확장**

- `globals.css`에 기존 토큰을 유지하면서 `--success`, `--warning`, `--info` 계열 토큰을 추가한다.
- `:root` 기본 테마를 “neutral trust SaaS” 기준으로 정리한다.

**Step 2: 테마 프리셋 selector 추가**

- `[data-admin-theme='vercel']`, `[data-admin-theme='supabase']`, `[data-admin-theme='cloudflare']` 블록을 추가한다.
- 각 블록에서 `--primary`, `--ring`, `--chart-*` 등 핵심 토큰을 덮어쓰도록 구성한다.

**Step 3: Tailwind semantic color 매핑 확장**

- `tailwind.config.js`의 `extend.colors`에 `success`, `warning`, `info` 색상을 추가한다.

**Step 4: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS. 현재 환경에서는 Node/ICU 오류 발생 가능(known blocker).

**Step 5: Commit**

```bash
git add src/styles/globals.css tailwind.config.js
git commit -m "feat: add flexible semantic theme tokens"
```

### Task 2: Runtime Theme Provider + Persist

**Files:**

- Create: `src/lib/design-system/theme-provider.tsx`
- Modify: `src/pages/_app.tsx`

**Step 1: 테마 타입/옵션 정의**

- `AdminTheme = 'vercel' | 'supabase' | 'cloudflare'`
- 옵션 라벨/설명 상수를 export한다.

**Step 2: Provider 구현**

- `AdminThemeProvider`에서 현재 테마 상태를 관리한다.
- `document.documentElement`에 `data-admin-theme`를 반영한다.
- `localStorage`(`mindbridge-admin-theme`)로 persist/restore 한다.

**Step 3: Hook 구현**

- `useAdminTheme()` 훅으로 현재 테마와 변경 함수를 노출한다.

**Step 4: 앱 루트 연결**

- `_app.tsx`의 기존 Provider 체인 바깥(또는 최상위)에서 `AdminThemeProvider`로 감싼다.

**Step 5: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

**Step 6: Commit**

```bash
git add src/lib/design-system/theme-provider.tsx src/pages/_app.tsx
git commit -m "feat: add runtime admin theme provider"
```

### Task 3: Header Theme Switcher 도입

**Files:**

- Create: `src/components/layout/theme-switcher.tsx`
- Modify: `src/components/layout/header.tsx`

**Step 1: ThemeSwitcher 컴포넌트 추가**

- shadcn `Select`를 사용해 테마 선택 UI를 만든다.
- `useAdminTheme()`로 현재 테마/변경 함수에 연결한다.

**Step 2: Header에 배치**

- 사용자 프로필 드롭다운 왼쪽에 스위처를 배치한다.
- 모바일에서도 깨지지 않도록 `w-[140px]` 내외 고정폭 + responsive class 적용.

**Step 3: 접근성 라벨 추가**

- Select trigger에 `aria-label`을 부여한다.
- 기존 icon-only 버튼에도 필요한 aria-label을 추가한다.

**Step 4: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

**Step 5: Commit**

```bash
git add src/components/layout/theme-switcher.tsx src/components/layout/header.tsx
git commit -m "feat: add header theme switcher"
```

### Task 4: Core Status Component 토큰화

**Files:**

- Modify: `src/components/ui/badge.tsx`
- Modify: `src/components/ui/StatCard.tsx`

**Step 1: Badge variant를 semantic token 기반으로 변경**

- `success/warning/info`를 `bg-success text-success-foreground` 등으로 바꾼다.

**Step 2: StatCard change color 토큰화**

- `text-green-500`/`text-red-500`를 semantic class로 전환한다.

**Step 3: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

### Task 5: Page Header 계약 정상화 (레거시 공존)

**Files:**

- Create: `src/components/layout/route-labels.ts`
- Modify: `src/components/layout/breadcrumb.tsx`
- Modify: `src/components/layout/default-layout.tsx`

**Step 1: 라우트 라벨 상수 분리**

- breadcrumb에서 사용하는 라벨 맵을 `route-labels.ts`로 이동한다.

**Step 2: pageHeader fallback resolver 추가**

- `default-layout.tsx`에서 `Page.pageHeader`가 올바른 객체가 아니면 라우트 기반 제목을 자동 계산한다.

**Step 3: 기존 페이지 import와 공존 확인**

- 기존 `pageHeader` 잘못 import 페이지도 깨지지 않도록 한다.

**Step 4: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

### Task 6: Navigation 접근성 정리

**Files:**

- Modify: `src/components/layout/nav/nav-menu.tsx`
- Modify: `src/components/layout/nav/nav.module.css`
- Modify: `src/components/layout/menu-btn.tsx`
- Modify: `src/components/page/login/login-form.tsx`

**Step 1:** `<a onClick>` 패턴을 `<button type='button'>`으로 전환

**Step 2:** 메뉴/토글/로그아웃 관련 icon 버튼에 `aria-label` 보강

**Step 3:** CSS selector를 `a, button` 공통 스타일로 정리

**Step 4: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

### Task 7: Pattern Layer(필터/페이지 섹션) 신설

**Files:**

- Create: `src/components/patterns/filter-toolbar.tsx`
- Create: `src/components/patterns/page-section.tsx`
- Modify: `src/components/page/user/components/UserFilterBar.tsx`
- Modify: `src/components/page/space/components/SpaceFilterBar.tsx`

**Step 1:** 패턴 컴포넌트 생성

- 반복되는 카드형 필터 레이아웃과 우측 액션 슬롯을 공통화한다.

**Step 2:** User/Space 필터바를 pattern으로 마이그레이션

- 하드코딩된 gray 계열 색을 semantic token 중심으로 축소한다.

**Step 3: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

### Task 8: Pilot Page 마이그레이션 (Assets)

**Files:**

- Modify: `src/pages/resource/assets.tsx`
- Modify: `src/components/page/assets/AssetsList.tsx`

**Step 1:** 페이지 컨테이너를 semantic token 기반으로 재정렬

**Step 2:** 검색/빈 상태/카드 hover를 토큰/상태 클래스에 맞게 정돈

**Step 3:** `window.location.reload()` 제거하고 query refetch 패턴으로 전환

**Step 4: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

### Task 9: 품질 정리

**Files:**

- Modify: `src/hooks/useChartData.ts`
- Modify: `src/hooks/useAnalytics.ts`
- Modify: `src/client/game.ts`
- Modify: `src/components/page/custom/hooks/useAnimationFile.ts`

**Step 1:** 디버그 `console.log` 정리

**Step 2:** 필요 시 `toast` 또는 개발 플래그 기반 로깅으로 대체

**Step 3: 확인**
Run: `npm run lint`
Expected: 환경 이슈가 없으면 PASS.

---

## Verification Matrix

- Lint: `npm run lint`
- Type safety: `npx tsc --noEmit`
- Manual spot check:
  - Header theme switching and persistence
  - Breadcrumb/title rendering
  - User/Space filter bar layout consistency
  - Assets page card/list interactions

## Known Blocker

현재 개발 환경에서 Node 런타임이 `libicui18n.74.dylib` 누락으로 실행 실패한다. 코드 변경은 진행하되, 자동 검증 명령 결과는 blocker로 리포트한다.
