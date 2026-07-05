# Linear 벤치마크 UI/UX 개선 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 컬러 팔레트를 유지한 채 밀도·모션·상태표현·키보드 인터랙션을 Linear 수준으로 끌어올리고, "인앱 결제 관리" 화면을 파일럿으로 적용한다.

**Architecture:** DESIGN.md 개정(Phase 0) → 전역 토큰(tailwind duration, reduced-motion) → 공통 컴포넌트 4종(DataTable/AdminSideSheetContent/Badge dot/FilterBar) 개선 → ⌘K 커맨드 팔레트 신설 → 파일럿 화면 적용. 공통 컴포넌트 변경은 전 화면에 자동 반영되므로 비파괴 변경으로 한정한다.

**Tech Stack:** Next.js 13(pages) + shadcn/ui + Tailwind + TanStack Query. 신규 의존성: `cmdk` (shadcn Command)

**Spec:** `docs/superpowers/specs/2026-07-04-linear-benchmark-uiux-design.md`

**실행 구성(컨트롤러 노트):** 구현 서브에이전트 = `opus`, 태스크 리뷰어 = `fable`.

## Global Constraints

- **컬러 불변**: slate 팔레트, near-black primary, soft 뱃지 색상값(50/700) 유지. 새 색 도입 금지
- 검증 게이트: `npx tsc --noEmit` + `npm run lint` — 신규 에러/경고 0 (기존 6건 `react-hooks/exhaustive-deps` 경고는 무관 파일)
- `text-slate-400` 텍스트 금지(아이콘/데코만), 본문 텍스트 `slate-500` 이상, 색 단독 금지(dot은 항상 텍스트 라벨 병행)
- 히트영역: 툴바/인라인 컨트롤 최소 `h-8`(32px), 주요 액션 버튼 `h-9`(36px) — Task 1에서 DESIGN.md에 개정 반영
- 모션: enter `ease-out` / exit `ease-in`, exit는 enter보다 짧게. 레이아웃 시프트 유발 scale hover 금지
- 커밋 메시지는 repo 스타일(`feat|fix|refactor|docs(scope): ...`) + 끝에 `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`
- repo: `/Users/gargoyle92/Documents/frontend/mindqna-admin`, 브랜치 `develop`

---

### Task 1: DESIGN.md 개정 (Phase 0)

**Files:**
- Modify: `DESIGN.md`

**Interfaces:**
- Produces: 이후 모든 태스크의 디자인 기준. 코드 변경 없음

- [x] **Step 1: §2.3 뱃지 표에 dot 변형 행 추가**

`### 2.3 액센트 & 뱃지 변형` 표 아래(soft 행들 다음)에 추가:

```markdown
| `dotSuccess`/`dotDanger`/`dotWarning`/`dotNeutral`/`dotInfo` | 색 점 + 중립 텍스트 | **상태값**(활성/만료/성공/실패/구독상태) 전용. 배경칠 없음 — soft 뱃지보다 시각 소음 낮음 |

> **soft vs dot 사용 규칙**: 카테고리/종류 태그(플랫폼, 타입, 재화 종류)는 soft, **상태값은 dot**을 기본으로 한다. dot은 항상 텍스트 라벨을 병행한다(색 단독 금지).
```

- [x] **Step 2: §4 밀도·곡률 개정**

`## 4. 간격 · 그리드 · 곡률 · 깊이`의 곡률 항목을 다음으로 교체:

```markdown
- **곡률 위계**: 카드 `rounded-lg`(10, `--radius` 정합) > 칩/입력 `rounded-md`(8) > 알약/아바타 `rounded-full`. (기존 `rounded-xl` 카드는 파일럿/확산 단계에서 순차 전환)
- **테이블 밀도**: 행 패딩 `py-2`(행높이 ≈36px), 헤더 `h-9` 소문자 라벨(`text-xs font-medium text-slate-500`, 대문자 변환 금지).
```

- [x] **Step 3: 모션 절 신설**

`## 4` 섹션 끝에 추가:

```markdown
### 4.1 모션 토큰
| 토큰 | 값 | 용도 |
|---|---|---|
| `duration-fast` | 120ms | hover/press 색·불투명도, 리스트 행 hover |
| `duration-base` | 160ms | 팝오버/드롭다운/툴팁 fade+scale |
| `duration-slow` | 200ms | 시트/모달 진입 (퇴장 ≈140ms — enter보다 짧게) |

- easing: enter `ease-out`, exit `ease-in`. `prefers-reduced-motion` 전역 존중.
- 임의 duration 값 사용 금지 — 위 3단 토큰만 사용.
```

- [x] **Step 4: §6 히트영역 규칙 개정**

`- **터치/히트영역**: 인터랙션 요소 최소 36px(\`h-9\`), 가능하면 44px. 인라인 복사 버튼은 패딩으로 히트영역 확보 + hover 피드백.` 를 다음으로 교체:

```markdown
- **히트영역(데스크톱 포인터 기준)**: 툴바/필터/인라인 컨트롤 최소 32px(`h-8`), 주요 액션 버튼 36px(`h-9`). 터치 44px 규칙은 터치 지원 화면 한정. 인라인 복사 버튼은 패딩으로 히트영역 확보 + hover 피드백. 칩 내부 제거(X) 버튼 등 마이크로 컨트롤은 예외적으로 24px(`h-6`)까지 허용하되 여백으로 히트영역을 보강한다.
```

- [x] **Step 5: §7 Do/Don't에 추가**

```markdown
- ✅ 상태값은 dot 뱃지, 카테고리는 soft 뱃지 / ❌ 상태·카테고리 구분 없이 배경칠 뱃지 남발
- ✅ 모션은 3단 토큰(fast/base/slow)만 / ❌ 임의 duration 혼용
```

- [x] **Step 6: 커밋**

```bash
git add DESIGN.md
git commit -m "docs(design): adopt Linear benchmark rules — dot badges, density, motion tokens, pointer hit areas"
```

---

### Task 2: 전역 모션 토큰 + reduced-motion

**Files:**
- Modify: `tailwind.config.js` (theme.extend)
- Modify: `src/styles/globals.css`

**Interfaces:**
- Produces: Tailwind 클래스 `duration-fast`(120ms) / `duration-base`(160ms) / `duration-slow`(200ms) — Task 4/5/9가 사용

- [x] **Step 1: tailwind.config.js에 duration 토큰 추가**

`theme.extend` 객체 안(예: `colors` 다음 레벨)에 추가:

```js
transitionDuration: {
  fast: '120ms',
  base: '160ms',
  slow: '200ms',
},
```

- [x] **Step 2: globals.css에 reduced-motion 전역 규칙 추가**

파일 끝에 추가:

```css
/* 모션 민감 사용자: 전역 모션 최소화 (DESIGN.md §4.1) */
@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
```

- [x] **Step 3: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add tailwind.config.js src/styles/globals.css
git commit -m "feat(design): add motion duration tokens and reduced-motion guard"
```

---

### Task 3: Badge dot 변형 + 상태 헬퍼 확장

**Files:**
- Modify: `src/components/ui/badge.tsx` (variants에 dot 5종 추가)
- Modify: `src/components/shared/purchase/purchase-status.ts` (dotVariant 반환 추가)

**Interfaces:**
- Produces: Badge `variant` 값 `dotNeutral | dotSuccess | dotWarning | dotDanger | dotInfo`; `resolveStatus(record): { label; variant; dotVariant: 'dotSuccess' | 'dotDanger' | 'dotNeutral' }` — Task 9가 사용

- [x] **Step 1: badge.tsx variants에 dot 5종 추가** (`tonePink` 다음)

```ts
dotNeutral:
  "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-slate-700 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-slate-400 before:content-['']",
dotSuccess:
  "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-slate-700 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-emerald-500 before:content-['']",
dotWarning:
  "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-slate-700 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-amber-500 before:content-['']",
dotDanger:
  "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-slate-700 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-rose-500 before:content-['']",
dotInfo:
  "gap-1.5 border-transparent bg-transparent px-1 py-0.5 text-[13px] font-medium text-slate-700 before:h-1.5 before:w-1.5 before:shrink-0 before:rounded-full before:bg-sky-500 before:content-['']",
```

(dot은 데코 요소이므로 `bg-slate-400` 허용 — DESIGN.md §2.2의 "텍스트 금지" 규칙과 충돌 없음. 텍스트는 `text-slate-700`.)

- [x] **Step 2: purchase-status.ts 확장** — 전체 교체:

```ts
import dayjs from 'dayjs';

// 이 이전 결제건은 isSuccess 미기록 → 성공으로 간주(레거시 데이터 보정)
export const LEGACY_SUCCESS_BEFORE = '2024-06-01';

export type PurchaseStatusDotVariant = 'dotSuccess' | 'dotDanger' | 'dotNeutral';

export function resolveStatus(record: { isExpired: boolean; isSuccess: boolean; createdAt: string }): {
  label: string;
  variant: 'softSuccess' | 'softDanger' | 'softNeutral';
  dotVariant: PurchaseStatusDotVariant;
} {
  if (record.isExpired) return { label: '만료', variant: 'softNeutral', dotVariant: 'dotNeutral' };
  const isSuccess = record.isSuccess || dayjs(record.createdAt).isBefore(LEGACY_SUCCESS_BEFORE);
  return isSuccess
    ? { label: '성공', variant: 'softSuccess', dotVariant: 'dotSuccess' }
    : { label: '실패', variant: 'softDanger', dotVariant: 'dotDanger' };
}
```

- [x] **Step 3: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint` (기존 호출부는 `variant`만 쓰므로 하위 호환)

```bash
git add src/components/ui/badge.tsx src/components/shared/purchase/purchase-status.ts
git commit -m "feat(design): add dot badge variants for status values"
```

---

### Task 4: DataTable 밀도·헤더·hover·키보드 (공통, 전 화면 영향)

**Files:**
- Modify: `src/components/shared/ui/data-table.tsx`
- Modify: `src/components/page/user/UserList.tsx` (onRow의 중복 `className: 'cursor-pointer'` 제거)
- Modify: `src/components/page/space/SpaceSearch.tsx` (동일)
- Modify: `src/components/page/space/SpaceList.tsx` (동일)

**Interfaces:**
- Consumes: Task 2의 `duration-fast`
- Produces: 시각/키보드 변화만 — props API 불변 (onRow 시그니처 그대로)

- [x] **Step 1: 헤더 스타일 변경** (TableHead className, 현재 218행 부근)

`'h-10 overflow-hidden whitespace-nowrap text-ellipsis text-xs font-semibold uppercase tracking-wide text-slate-500'` →

```
'h-9 overflow-hidden whitespace-nowrap text-ellipsis text-xs font-medium text-slate-500'
```

- [x] **Step 2: 셀 밀도 변경** (TableCell className, 현재 250행 부근)

`'max-w-0 overflow-hidden py-3 text-sm tabular-nums text-slate-700'` → `'max-w-0 overflow-hidden py-2 text-sm tabular-nums text-slate-700'`

- [x] **Step 3: 행 hover·키보드 접근** — 데이터 행 `<TableRow>`(현재 241-245행)를 다음으로 교체:

```tsx
<TableRow
  data-state={row.getIsSelected() && 'selected'}
  onClick={rowProps?.onClick}
  tabIndex={rowProps?.onClick ? 0 : undefined}
  onKeyDown={
    rowProps?.onClick
      ? (event) => {
          if (event.target !== event.currentTarget) return;
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            rowProps.onClick?.();
          }
        }
      : undefined
  }
  className={cn(
    'group transition-colors duration-fast',
    rowProps?.onClick &&
      'cursor-pointer hover:bg-slate-50 focus-visible:bg-slate-50 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ring',
    rowProps?.className,
  )}
>
```

(`event.target !== event.currentTarget` 가드: 셀 안 복사 버튼 등 중첩 인터랙션의 키 입력이 행 활성화로 새지 않게 — UserSearch/SpaceResultCard 수정과 동일한 원칙. **className은 기존 `||` 단락 대신 병합** — 기존 소비자가 `className: 'cursor-pointer'`를 넘겨도 hover/focus 스타일이 유지된다.) (리뷰 반영: role='button'은 tr의 테이블 시맨틱을 파괴하므로 제거 — tabIndex+onKeyDown만으로 키보드 활성화 지원.)

- [x] **Step 3b: 중복 className 콜사이트 정리**

`UserList.tsx`, `SpaceSearch.tsx`, `SpaceList.tsx`의 `onRow={(...) => ({ onClick: ..., className: 'cursor-pointer' })}`에서 `className: 'cursor-pointer'` 항목을 제거한다(이제 onClick만으로 자동 적용되어 중복).

참고(확산 단계 과제로 기록): 클릭 불가 행은 `table.tsx`의 기본 `hover:bg-muted/50`이 유지되어 클릭 가능 행(`hover:bg-slate-50`)과 회색조가 미세하게 다르다 — 파일럿에서는 허용, 확산 시 통일 검토.

- [x] **Step 4: 페이지네이션 컴팩트화** — 하단 4개 `<Button variant='outline' size='sm' ...>`에 `className='h-8 w-8 p-0'` 추가

- [x] **Step 5: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/components/shared/ui/data-table.tsx
git commit -m "feat(design): densify DataTable rows, lowercase headers, keyboard row activation"
```

---

### Task 5: 시트 컴팩트화 + 모션 토큰 적용 (공통)

**Files:**
- Modify: `src/components/shared/ui/admin-side-sheet-content.tsx`
- Modify: `src/components/ui/sheet.tsx` (34행 duration 클래스)

**Interfaces:**
- Consumes: Task 2의 `duration-slow`
- Produces: 시각 변화만 — props API 불변

- [x] **Step 1: admin-side-sheet-content.tsx 헤더/본문 컴팩트화**

- SheetHeader: `'sticky top-0 z-20 border-b bg-background/95 px-6 py-4 ...'` → `px-5 py-3` (나머지 유지)
- SheetTitle: `'pr-8 text-base font-semibold tracking-tight'` → `'pr-8 text-sm font-semibold tracking-tight'`
- SheetDescription: `'pr-8'` → `'pr-8 text-xs'`
- 본문 div: `'flex-1 px-6 py-5'` → `'flex-1 px-5 py-4'`

- [x] **Step 2: sheet.tsx 모션 토큰 + easing 적용** (34행)

`data-[state=closed]:duration-300 data-[state=open]:duration-500` → `data-[state=closed]:duration-[140ms] data-[state=open]:duration-slow data-[state=open]:ease-out data-[state=closed]:ease-in`

동시에 같은 클래스 문자열의 `transition ease-in-out`에서 `ease-in-out`을 제거한다(위 data-state별 easing이 대신함) — 스펙 §3.2 "enter ease-out / exit ease-in" 구현.

- [x] **Step 3: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/components/shared/ui/admin-side-sheet-content.tsx src/components/ui/sheet.tsx
git commit -m "feat(design): compact side sheet header and apply motion tokens to sheet transitions"
```

---

### Task 6: FilterBar / FilterChips 공통 컴포넌트

**Files:**
- Create: `src/components/shared/ui/filter-bar.tsx`

**Interfaces:**
- Produces (Task 9가 사용):
  - `FilterBar({ children, chips?, onRemoveChip?, className? })` — 컴팩트 툴바 컨테이너 + 적용 필터 칩 영역
  - `FilterChips({ chips: FilterChipItem[]; onRemove(key) })`, `type FilterChipItem = { key: string; label: string }`
  - `FILTER_CONTROL_CLASS = 'h-8 text-[13px]'` — 툴바 컨트롤 공통 클래스

- [x] **Step 1: 컴포넌트 작성** (기존 `SpaceActiveFilterChips` 칩 마크업을 일반화 — 원본은 유지, 확산 단계에서 교체)

```tsx
import { cn } from '@/lib/utils';
import { X } from 'lucide-react';
import type { ReactNode } from 'react';

export const FILTER_CONTROL_CLASS = 'h-8 text-[13px]';

export interface FilterChipItem {
  key: string;
  label: string;
}

export function FilterChips({ chips, onRemove }: { chips: FilterChipItem[]; onRemove: (key: string) => void }) {
  if (!chips.length) return null;
  return (
    <div className='flex flex-wrap items-center gap-1.5'>
      {chips.map((chip) => (
        <span
          key={chip.key}
          className='inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white py-0.5 pl-2.5 pr-1 text-xs font-medium text-slate-600'
        >
          {chip.label}
          <button
            type='button'
            aria-label={`${chip.label} 필터 제거`}
            onClick={() => onRemove(chip.key)}
            className='-my-1 inline-flex h-6 w-6 items-center justify-center rounded-full text-slate-500 transition-colors duration-fast hover:bg-slate-100 hover:text-slate-700'
          >
            <X className='h-3 w-3' />
          </button>
        </span>
      ))}
    </div>
  );
}

interface FilterBarProps {
  children: ReactNode;
  chips?: FilterChipItem[];
  onRemoveChip?: (key: string) => void;
  className?: string;
}

export function FilterBar({ children, chips, onRemoveChip, className }: FilterBarProps) {
  return (
    <div className='space-y-2 py-3'>
      <div className={cn('flex flex-wrap items-center gap-2', className)}>{children}</div>
      {chips && chips.length > 0 && onRemoveChip ? <FilterChips chips={chips} onRemove={onRemoveChip} /> : null}
    </div>
  );
}
```

- [x] **Step 2: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/components/shared/ui/filter-bar.tsx
git commit -m "feat(design): add compact FilterBar and FilterChips shared components"
```

---

### Task 7: ⌘K 커맨드 팔레트

**Files:**
- Modify: `package.json` (cmdk 설치)
- Create: `src/components/ui/command.tsx` (shadcn Command)
- Modify: `src/components/layout/main-menu.tsx` (메뉴 배열 export)
- Create: `src/components/shared/command-palette/CommandPalette.tsx`
- Modify: `src/components/layout/default-layout.tsx` (전역 마운트)

**Interfaces:**
- Consumes: `IMenu`(`src/components/layout/nav/index.tsx:12` — `{ id?, name, link?: { path, query? }, submenu?, ... }` — 정확한 필드명은 파일에서 확인), `getUser`(client/user), `searchSpaces`(client/space:82), `useDebouncedValue` 훅
- Produces: `⌘K`/`Ctrl+K`로 열리는 전역 팔레트. 유저 선택 → `/user/list?username=`, 스페이스 선택 → `/space/list?spaceId=`(Task 8이 딥링크 구현)

- [x] **Step 1: cmdk 설치**

Run: `npm install cmdk`
Expected: package.json dependencies에 cmdk 추가

- [x] **Step 2: `src/components/ui/command.tsx` 생성** (shadcn 표준 — Dialog는 기존 `@/components/ui/dialog` 재사용)

```tsx
import * as React from 'react';
import { type DialogProps } from '@radix-ui/react-dialog';
import { Command as CommandPrimitive } from 'cmdk';
import { Search } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';

const Command = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive>
>(({ className, ...props }, ref) => (
  <CommandPrimitive
    ref={ref}
    className={cn('flex h-full w-full flex-col overflow-hidden rounded-lg bg-popover text-popover-foreground', className)}
    {...props}
  />
));
Command.displayName = CommandPrimitive.displayName;

interface CommandDialogProps extends DialogProps {
  shouldFilter?: boolean;
}

const CommandDialog = ({ children, shouldFilter, ...props }: CommandDialogProps) => {
  return (
    <Dialog {...props}>
      {/* [&>button]:hidden — Dialog 기본 우상단 X가 입력줄과 겹치므로 숨김(ESC/오버레이로 닫힘) */}
      <DialogContent className='overflow-hidden p-0 [&>button]:hidden'>
        <DialogTitle className='sr-only'>커맨드 팔레트</DialogTitle>
        <Command
          shouldFilter={shouldFilter}
          className='[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-slate-500 [&_[cmdk-group]]:px-2 [&_[cmdk-input]]:h-11 [&_[cmdk-item]]:px-2 [&_[cmdk-item]]:py-2'
        >
          {children}
        </Command>
      </DialogContent>
    </Dialog>
  );
};

const CommandInput = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Input>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Input>
>(({ className, ...props }, ref) => (
  <div className='flex items-center border-b px-3'>
    <Search className='mr-2 h-4 w-4 shrink-0 text-slate-500' />
    <CommandPrimitive.Input
      ref={ref}
      className={cn(
        'flex h-10 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-slate-500 disabled:cursor-not-allowed disabled:opacity-50',
        className,
      )}
      {...props}
    />
  </div>
));
CommandInput.displayName = CommandPrimitive.Input.displayName;

const CommandList = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.List>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.List>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.List
    ref={ref}
    className={cn('max-h-[320px] overflow-y-auto overflow-x-hidden', className)}
    {...props}
  />
));
CommandList.displayName = CommandPrimitive.List.displayName;

const CommandEmpty = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Empty>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Empty>
>((props, ref) => (
  <CommandPrimitive.Empty ref={ref} className='py-6 text-center text-sm text-slate-500' {...props} />
));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;

const CommandGroup = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Group>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Group>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Group
    ref={ref}
    className={cn('overflow-hidden py-1.5 text-foreground [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs', className)}
    {...props}
  />
));
CommandGroup.displayName = CommandPrimitive.Group.displayName;

const CommandSeparator = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Separator ref={ref} className={cn('-mx-1 h-px bg-border', className)} {...props} />
));
CommandSeparator.displayName = CommandPrimitive.Separator.displayName;

const CommandItem = React.forwardRef<
  React.ElementRef<typeof CommandPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof CommandPrimitive.Item>
>(({ className, ...props }, ref) => (
  <CommandPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex cursor-pointer select-none items-center rounded-md text-sm outline-none transition-colors duration-fast data-[disabled='true']:pointer-events-none data-[selected='true']:bg-slate-100 data-[selected='true']:text-slate-900 data-[disabled='true']:opacity-50",
      className,
    )}
    {...props}
  />
));
CommandItem.displayName = CommandPrimitive.Item.displayName;

export { Command, CommandDialog, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem, CommandSeparator };
```

- [x] **Step 3: main-menu.tsx 메뉴 배열 export**

`const systemMenu: IMenu[] = [...]` 정의 이후, 컴포넌트 정의 앞에 추가 (배열 이름 4개는 파일에서 확인: `overviewMenu`, `managementMenu`, `contentMenu`, `systemMenu`):

```tsx
// 커맨드 팔레트 등 외부에서 메뉴 트리를 소비할 수 있도록 export
export const allAdminMenus: IMenu[] = [...overviewMenu, ...managementMenu, ...contentMenu, ...systemMenu];
```

- [x] **Step 4: CommandPalette 작성** — `src/components/shared/command-palette/CommandPalette.tsx`

```tsx
import { searchSpaces } from '@/client/space';
import { getUser } from '@/client/user';
import { allAdminMenus } from '@/components/layout/main-menu';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import useDebouncedValue from '@/hooks/useDebouncedValue';
import { useQuery } from '@tanstack/react-query';
import { Building2, User } from 'lucide-react';
import { useRouter } from 'next/router';
import { useEffect, useMemo, useState } from 'react';

type MenuEntry = { id: string; name: string; path: string; group: string };

function flattenMenus(): MenuEntry[] {
  const entries: MenuEntry[] = [];
  for (const menu of allAdminMenus) {
    if (menu.link?.path) {
      entries.push({ id: menu.id ?? menu.link.path, name: menu.name, path: menu.link.path, group: '' });
    }
    for (const sub of menu.submenu ?? []) {
      if (sub.link?.path) {
        entries.push({ id: sub.id ?? sub.link.path, name: sub.name, path: sub.link.path, group: menu.name });
      }
    }
  }
  return entries;
}

function CommandPalette() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const debounced = useDebouncedValue(query, 300);
  const keyword = debounced.trim();

  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const menuEntries = useMemo(flattenMenus, []);

  // shouldFilter={false}(비동기 결과 혼합 시 cmdk 기본 필터가 스페이스/유저 항목을 잘못 걸러냄)
  // → 메뉴는 keyword로 수동 필터링한다.
  const filteredMenus = useMemo(() => {
    if (!keyword) return menuEntries;
    const lowered = keyword.toLowerCase();
    return menuEntries.filter((entry) => `${entry.group} ${entry.name}`.toLowerCase().includes(lowered));
  }, [menuEntries, keyword]);

  // URL 경로에 그대로 들어가는 값이므로 username 형태로 게이트(경로 파괴 문자·불필요한 404 방지)
  const isUsernameLike = /^[A-Za-z0-9._-]{2,}$/.test(keyword);

  const userLookup = useQuery({
    queryKey: ['cmdk-user', keyword],
    queryFn: () => getUser(keyword),
    enabled: open && isUsernameLike,
    retry: false,
  });

  const spaceLookup = useQuery({
    queryKey: ['cmdk-space', keyword],
    queryFn: () => searchSpaces({ page: 1, name: keyword }),
    enabled: open && keyword.length >= 2,
    retry: false,
  });

  const isSearching = userLookup.isFetching || spaceLookup.isFetching;

  const go = (path: string) => {
    setOpen(false);
    setQuery('');
    router.push(path);
  };

  const spaceItems = (spaceLookup.data?.items ?? []).slice(0, 5);

  return (
    <CommandDialog open={open} onOpenChange={setOpen} shouldFilter={false}>
      <CommandInput value={query} onValueChange={setQuery} placeholder='메뉴 이동 · 유저/스페이스 검색 (2자 이상)' />
      <CommandList>
        {isSearching ? <div className='px-3 py-2 text-xs text-slate-500'>검색 중…</div> : null}
        <CommandEmpty>결과가 없습니다.</CommandEmpty>
        {filteredMenus.length > 0 ? (
          <CommandGroup heading='메뉴'>
            {filteredMenus.map((entry) => (
              <CommandItem key={entry.id} value={`${entry.group} ${entry.name}`} onSelect={() => go(entry.path)}>
                {entry.group ? <span className='mr-1 text-slate-500'>{entry.group} ·</span> : null}
                {entry.name}
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}
        {userLookup.data ? (
          <>
            <CommandSeparator />
            <CommandGroup heading='유저'>
              <CommandItem
                value={`user ${userLookup.data.username}`}
                onSelect={() => go(`/user/list?username=${encodeURIComponent(userLookup.data.username)}`)}
              >
                <User className='mr-2 h-4 w-4 text-slate-500' />
                유저 상세 열기: {userLookup.data.username}
              </CommandItem>
            </CommandGroup>
          </>
        ) : null}
        {spaceItems.length > 0 ? (
          <>
            <CommandSeparator />
            <CommandGroup heading='스페이스'>
              {spaceItems.map((space) => (
                <CommandItem
                  key={space.id}
                  value={`space ${space.id}`}
                  onSelect={() => go(`/space/list?spaceId=${encodeURIComponent(space.id)}`)}
                >
                  <Building2 className='mr-2 h-4 w-4 text-slate-500' />
                  <span className='truncate'>스페이스 열기: {space.id}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}
      </CommandList>
    </CommandDialog>
  );
}

export default CommandPalette;
```

구현 참고: `Space` 타입에 표시용 이름 필드가 있으면(`client/types.ts`의 `Space` 확인, `SpaceResultCard.tsx`의 접근자 참조) `{space.id}` 대신 `이름 (id 앞 8자)` 형태로 표시를 개선한다. 없으면 id 그대로.

- [x] **Step 5: default-layout.tsx에 전역 마운트**

import 추가 후, DefaultLayout 반환 JSX 최상위(예: `<Header ...>` 형제 위치)에 `<CommandPalette />` 1회 렌더:

```tsx
import CommandPalette from '@/components/shared/command-palette/CommandPalette';
```

- [x] **Step 6: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add package.json package-lock.json src/components/ui/command.tsx src/components/shared/command-palette/ src/components/layout/main-menu.tsx src/components/layout/default-layout.tsx
git commit -m "feat(shell): add global cmd+k command palette with menu, user and space search"
```

---

### Task 8: SpaceList `?spaceId=` 딥링크

**Files:**
- Modify: `src/components/page/space/SpaceList.tsx`

**Interfaces:**
- Consumes: `getSpace(id)`(`src/client/space.ts:64`), 기존 `detailTarget`/`SpaceDetailSheet`(285행: `open={!!detailTarget} space={detailTarget} onClose={() => setDetailTarget(null)}`)
- Produces: `/space/list?spaceId=<id>` 진입 시 해당 스페이스 상세 시트 자동 오픈 — Task 7의 스페이스 그룹 목적지

- [x] **Step 1: 딥링크 처리 추가** (UserList Task 11과 동일 패턴 — 재오픈/수동선택 가드 포함)

```tsx
const router = useRouter();
const deepLinkSpaceId = typeof router.query.spaceId === 'string' ? router.query.spaceId : undefined;
const consumedDeepLinkRef = useRef<string | null>(null);

const { data: deepLinkSpace } = useQuery({
  queryKey: ['space-deeplink', deepLinkSpaceId],
  queryFn: () => getSpace(deepLinkSpaceId as string),
  enabled: !!deepLinkSpaceId,
  retry: false,
});

useEffect(() => {
  if (!deepLinkSpace || !deepLinkSpaceId) return;
  if (consumedDeepLinkRef.current === deepLinkSpaceId) return;
  consumedDeepLinkRef.current = deepLinkSpaceId;
  if (!detailTarget) {
    setDetailTarget(deepLinkSpace as Space);
  }
}, [deepLinkSpace, deepLinkSpaceId, detailTarget]);

const closeDetail = () => {
  setDetailTarget(null);
  if (deepLinkSpaceId) {
    router.replace({ pathname: router.pathname }, undefined, { shallow: true });
  }
};
```

- 285행의 `onClose={() => setDetailTarget(null)}` → `onClose={closeDetail}`
- 파일 내 다른 곳에서 `setDetailTarget(null)`로 시트를 닫는 경로가 있으면 모두 `closeDetail()`로 교체 (UserList 리뷰에서 나온 닫힘 경로 일관성 원칙)
- import 추가: `useRouter`(next/router), `useQuery`(@tanstack/react-query — 기존 import 확인), `getSpace`(@/client/space), `useRef`/`useEffect`(react)
- `SpaceDetail`이 `Space`에 구조적으로 호환되는지 `client/types.ts`에서 확인 후 캐스팅(비호환 필드가 있으면 `as unknown as Space` 대신 필요한 필드만 매핑)

- [x] **Step 2: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/components/page/space/SpaceList.tsx
git commit -m "feat(space): support spaceId deep link to open detail sheet"
```

---

### Task 9: 파일럿 적용 — 인앱 결제 관리

**Files:**
- Modify: `src/components/page/premium/PurchaseMetaList.tsx` (FilterBar + dot 상태)
- Modify: `src/components/page/premium/ProductList.tsx` (FilterBar + dot 상태)
- Modify: `src/components/ui/DatePickerWithRange.tsx` (`triggerClassName` prop 추가 — 현재 `className`은 래퍼 div에만 적용되어 트리거 Button 높이를 못 바꿈)
- Modify: `src/components/page/premium/PurchaseDetailSheet.tsx` (간격·dot·곡률)
- Modify: `src/components/shared/purchase/EntitlementRow.tsx`, `PurchaseHistoryRow.tsx`, `LiveStatusBlock.tsx` (카드 곡률·패딩)

**Interfaces:**
- Consumes: Task 3 `dotVariant`/dot variants, Task 6 `FilterBar`/`FilterChips`/`FILTER_CONTROL_CLASS`

- [x] **Step 1: PurchaseMetaList 필터를 FilterBar로 교체**

- 기존 `DefaultTableBtn` + form 레이아웃을 `FilterBar`로 재구성하되, **기존 `<form onSubmit={...}>` 요소를 FilterBar의 children으로 그대로 유지**해 Enter 제출을 보존한다(form 제거 금지). 각 컨트롤(Input/SelectTrigger/버튼)에 `FILTER_CONTROL_CLASS` 적용, Label은 제거하고 placeholder/SelectValue로 대체(한 줄 툴바). 날짜는 `DatePickerWithRange`에 `triggerClassName?: string` prop을 추가(트리거 `Button`의 className에 `cn(..., triggerClassName)` 병합)한 뒤 `triggerClassName={FILTER_CONTROL_CLASS}` 전달. `검색`/`실패만 보기`/`초기화` 버튼은 `h-8`(서버 페이지네이션 검색이라 Enter 제출 유지 — 스펙 §3.4 예외).
- 적용된 필터 칩 — 다음 코드를 컴포넌트에 추가하고 `<FilterBar chips={chips} onRemoveChip={removeChip}>`로 연결. 기존 `필터 적용됨` Badge와 `hasActiveFilters`는 제거:

```tsx
const CHIP_VALUE_LABELS: Record<string, string> = {
  success: '성공', failed: '실패', expired: '만료',
  IOS: 'iOS', AOS: 'Android', EVENT: 'EVENT',
};

const chips: FilterChipItem[] = [];
if (searchFilters.username) chips.push({ key: 'username', label: `유저: ${searchFilters.username}` });
if (searchFilters.status) chips.push({ key: 'status', label: `상태: ${CHIP_VALUE_LABELS[searchFilters.status]}` });
if (searchFilters.platform) chips.push({ key: 'platform', label: `플랫폼: ${CHIP_VALUE_LABELS[searchFilters.platform]}` });
if (searchFilters.isProduction !== undefined)
  chips.push({ key: 'env', label: `환경: ${searchFilters.isProduction ? 'PROD' : 'TEST'}` });
if (searchFilters.startDate || searchFilters.endDate) {
  const dateLabel =
    searchFilters.startDate && searchFilters.endDate
      ? `${searchFilters.startDate} ~ ${searchFilters.endDate}`
      : searchFilters.startDate
        ? `${searchFilters.startDate} 이후`
        : `${searchFilters.endDate} 이전`;
  chips.push({ key: 'date', label: `기간: ${dateLabel}` });
}

const removeChip = (key: string) => {
  if (key === 'username') setUsernameKeyword('');
  if (key === 'status') setStatusFilter('all');
  if (key === 'platform') setPlatformFilter('all');
  if (key === 'env') setEnvFilter('all');
  if (key === 'date') {
    setStartedAt(null);
    setEndedAt(null);
  }
  setSearchFilters((prev) => ({
    ...prev,
    username: key === 'username' ? undefined : prev.username,
    status: key === 'status' ? undefined : prev.status,
    platform: key === 'platform' ? undefined : prev.platform,
    isProduction: key === 'env' ? undefined : prev.isProduction,
    startDate: key === 'date' ? undefined : prev.startDate,
    endDate: key === 'date' ? undefined : prev.endDate,
  }));
  setCurrentPage(1);
};
```

(import: `@/components/shared/ui/filter-bar`에서 `FilterBar`, `type FilterChipItem`, `FILTER_CONTROL_CLASS`를 가져온다. `FilterChips`는 FilterBar가 내부에서 렌더하므로 직접 import 불필요. `setSearchFilters`는 useState setter라 함수형 업데이트 기본 지원.)
- 상태 컬럼 셀: `<Badge variant={s.variant}>` → `<Badge variant={s.dotVariant}>` (`resolveStatus` 반환의 `dotVariant` 사용). 플랫폼/환경 컬럼은 soft 유지.

- [x] **Step 2: ProductList 필터를 FilterBar로 교체**

- 4개 Select + 검색 Input을 `FilterBar` 안에 `FILTER_CONTROL_CLASS`로 재배치(Label 제거, SelectValue placeholder 활용). 즉시 반영(디바운스) 방식 유지 — 컨트롤이 항상 현재 상태를 표시하므로 **칩은 사용하지 않음**(스펙 §3.4: 제출식 화면만 칩 필수).
- `활성화` 컬럼: `<Badge variant={value ? 'softSuccess' : 'softNeutral'}>` → `<Badge variant={value ? 'dotSuccess' : 'dotNeutral'}>`. 플랫폼/구독·소모품/환경 컬럼은 soft 유지.

- [x] **Step 3: PurchaseDetailSheet 밀도 정리**

- 최상위 `<div className='space-y-6'>` → `space-y-5`
- 요약 뱃지 행: 상태 뱃지(`resolveStatus` 결과, 이용권 컨텍스트의 활성/만료)를 dot으로 전환 — `<Badge variant={status.dotVariant}>{status.label}</Badge>`, 이용권 컨텍스트는 `<Badge variant={t.isActive ? 'dotSuccess' : 'dotNeutral'}>`. 플랫폼/환경/구독·단건 뱃지는 soft 유지.

- [x] **Step 4: shared purchase 카드 3종 곡률·패딩 컴팩트화**

`EntitlementRow.tsx`, `PurchaseHistoryRow.tsx`, `LiveStatusBlock.tsx`(내부 행 카드 포함)에서:
- `rounded-xl` → `rounded-lg`
- `px-4 py-3` → `px-3 py-2.5`

(이 3종은 유저 상세 패널도 공유 — 동일 밀도로 함께 조정되는 것이 의도된 동작.)

- [x] **Step 5: 검증 후 커밋**

Run: `npx tsc --noEmit && npm run lint`

```bash
git add src/components/page/premium/ src/components/shared/purchase/
git commit -m "feat(product): apply Linear density, dot status badges and compact filter bar to IAP pilot screens"
```

---

### Task 10: 최종 검증 + 수동 검수

- [x] **Step 1: 전체 게이트**

Run: `npx tsc --noEmit && npm run lint`
Expected: 신규 에러/경고 0

- [x] **Step 2: 수동 검수 (dev 서버, 포트 4000)** — 스펙 §7 성공 기준 매핑

1. `/product/purchase` 결제 내역: 행 높이 축소로 표시 행 수 증가 확인(성공 기준 1), 상태 dot 렌더, FilterBar 칩 추가/제거
2. 행 hover 즉각 반응, Tab으로 행 포커스 → Enter로 상세 패널 오픈(성공 기준 4)
3. 상세 패널 열림/닫힘 모션(진입 200ms/퇴장 140ms 체감), 헤더 컴팩트 확인
4. `⌘K` → 메뉴 검색·이동 / 유저명 입력 → 유저 상세 딥링크 / 스페이스 검색 → `/space/list?spaceId=` 시트 오픈(성공 기준 3)
5. 스팟 체크: 유저 목록·스페이스 목록(공통 DataTable 변경 회귀 확인), 유저 상세 패널(공유 카드 밀도)
6. 시스템 설정에서 reduced-motion 켜고 모션 최소화 확인

- [x] **Step 3: 원장 기록**

`.superpowers/sdd/progress.md`에 완료 기록 후 종료. 확산(Phase 5)은 파일럿 검수 승인 후 별도 계획.
