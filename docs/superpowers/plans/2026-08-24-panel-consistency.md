# Panel Consistency Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every action panel in the admin one shell, one body layout, and one type hierarchy — converting the ten surfaces that open as centered popups into side sheets, and fixing the section-title hierarchy that breaks on Korean.

**Architecture:** One shared `definition-row` module supplies the row and the band; every panel composes from it. The shell rule is context-based: a surface you read alongside the list is a side sheet, a surface whose job is to block the list is a dialog.

**Tech Stack:** Next.js 13.4 pages router, pnpm, TanStack Query v5, shadcn/Radix, Tailwind.

**Design source:** three published proposals — the push panel redesign, the whole-repo audit, and the visual as-is/to-be. Their decisions are settled; this plan implements them.

**Repo:** `~/Documents/frontend/mindqna-admin`, branch `feat/panel-consistency` off `main` (`667bb47`).

## Global Constraints

- **Shell rule.** Editing a record or browsing a detail → `AdminSideSheetContent`. Centered `Dialog` only for confirmations and for a single-purpose window of two fields or fewer. `AlertDialog` confirmations stay exactly as they are — all 18 of them.
- **Sheet widths.** `lg` 720px when the panel carries a 220px rail, `md` 600px otherwise. No new width tokens; `sm/md/lg/xl/full` already exist in `admin-side-sheet-content.tsx`.
- **Body layout.** Definition rows: a fixed 140px label column, the control column beside it, a hairline under each row. Labels never sit above their fields.
- **Bands.** A full-width tinted strip opens a group. Use one when a panel has more than six fields. No cards nested inside a panel; no shadows.
- **Type hierarchy inside a panel** — the ladder is carried by weight, not size, because uppercase does nothing for Korean:

  | Level | Element | Spec |
  |---|---|---|
  | 1 | Sheet title | 16px / 600 (`text-base font-semibold`) |
  | 2 | **Band title** | **14px / 600, body face, ink** — not mono, not uppercase |
  | 3 | Field label | 14px / 500, ink |
  | 4 | Value, input | 14px / 400 |
  | 5 | Hint, helper | 12px / 400, caption |

- **Type scale is five steps** — 12 / 14 / 15 / 16 / 24+. `text-[Npx]` is forbidden. Captions and labels never below 12px.
- **`mono-eyebrow` keeps two roles only**: code/IDs, and uppercase Latin labels where the casing carries signal. Never a Korean section title.
- **Colors come from tokens.** No `text-slate-*`, no `text-red-*` in new or touched code.
- **Footer.** Sticky, right-aligned, 취소 + primary. Destructive actions stay behind a confirm dialog.

## Gates before every commit

```bash
cd ~/Documents/frontend/mindqna-admin
npx tsc --noEmit      # the only real type gate — next.config.js sets ignoreBuildErrors: true
pnpm test
pnpm lint
```

`pnpm build` passing proves nothing about types here. Run it to confirm the app still compiles, judge types by `tsc`.

---

### Task 1: Shared definition row, band, and the type-scale cleanup

Two copies of the same row exist today — `Row` in `coupon/CouponForm.tsx:110` (which also takes a `hint`) and `DefRow` in `push/PushForm.tsx:287`. Every later task adds a third, fourth, tenth copy unless this lands first.

**Files:**
- Create: `src/components/shared/ui/definition-row.tsx`
- Create: `src/components/shared/ui/definition-row.test.ts` — only if a pure helper emerges; these are presentational, so no test is expected
- Modify: `src/components/page/coupon/CouponForm.tsx` (delete local `Row`, import the shared one)
- Modify: `src/components/page/push/PushForm.tsx` (delete local `DefRow`)
- Modify: `src/components/page/coupon/CouponCodeList.tsx:265,322,323`
- Modify: `src/components/page/user/UserTableColumns.tsx:27`
- Modify: `src/components/page/dashboard/dashboard.tsx:199`
- Modify: `src/components/page/dashboard/sections/dashboard-core-stats.tsx:55`

**Interfaces produced:**
- `DefinitionRow({ label, hint?, children }): JSX.Element`
- `PanelBand({ title }): JSX.Element`

- [ ] **Step 1: Write the shared module**

```tsx
import type { ReactNode } from 'react';

/**
 * Label column left, control column right. Every control then starts and ends on the same
 * two vertical lines, which is what makes a settings surface read as aligned — labels
 * stacked above their fields leave each row starting at a different place.
 */
export function DefinitionRow({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className='grid grid-cols-[140px_minmax(0,1fr)] items-start gap-4 border-b border-border px-4 py-2.5 last:border-b-0'>
      <div className='pt-1.5'>
        <div className='text-sm font-medium text-foreground'>{label}</div>
        {hint && <div className='mt-0.5 text-xs leading-snug text-muted-foreground'>{hint}</div>}
      </div>
      <div className='min-w-0'>{children}</div>
    </div>
  );
}

/**
 * Opens a group of rows. The band — a full-width tinted strip — carries the structural
 * signal; the type only has to sit one weight above the field labels it introduces.
 *
 * Deliberately not the mono uppercase eyebrow DESIGN.md defines for section labels. That
 * device draws its weight from capitals and tracking, and Korean has no capitals, so a
 * Korean eyebrow reads as nothing but the smallest text on the panel — below the labels
 * it is supposed to rank above.
 */
export function PanelBand({ title }: { title: string }) {
  return (
    <div className='border-b border-t border-border bg-muted/40 px-4 py-2 first:border-t-0'>
      <div className='text-sm font-semibold text-foreground'>{title}</div>
    </div>
  );
}
```

- [ ] **Step 2: Point coupon and push at it**

Delete `Row` from `CouponForm.tsx` and `DefRow` from `PushForm.tsx`, import `DefinitionRow`, and rename the call sites. Behaviour must not change — coupon's rows already pass `hint`, push's do not.

- [ ] **Step 3: Fix the six off-scale sizes**

| File:line | Now | Becomes | Why |
|---|---|---|---|
| `CouponCodeList.tsx:265` | `text-[11px]` | `text-xs` | below the 12px floor |
| `CouponCodeList.tsx:322` | `text-[15px]` | `text-base` | 15px is the body token |
| `CouponCodeList.tsx:323` | `text-[10px]` | `text-xs` | below the 12px floor |
| `UserTableColumns.tsx:27` | `text-[12px]` | `text-xs` | same size, on-scale |
| `dashboard.tsx:199` | `sm:text-[15px]` | `sm:text-base` | 15px is the body token |
| `dashboard-core-stats.tsx:55` | `sm:text-[15px]` | `sm:text-base` | 15px is the body token |

Check each visually after the change — `text-[10px]` → `text-xs` grows that label by 2px and may reflow a tight row.

- [ ] **Step 4: Confirm nothing off-scale survives**

```bash
grep -rn "text-\[[0-9]*px\]" src/components
```
Expected: no output.

- [ ] **Step 5: Gates, then commit**

```bash
git add src/components/shared/ui/definition-row.tsx src/components/page
git commit -m "refactor(ui): share one definition row and give bands a Korean-safe title

The row existed twice — Row in CouponForm and DefRow in PushForm — and every panel
converted from a popup would have added another copy.

The band title drops the mono uppercase eyebrow DESIGN.md defines for section labels.
That device draws its weight from capitals and tracking; Korean has neither, so a
Korean eyebrow reads as nothing but the smallest text on the panel, ranking below the
field labels it introduces. The band itself now carries the structure and the type sits
one weight above the labels.

Also brings six arbitrary sizes back onto the five-step scale, two of which sat below
the 12px floor."
```

---

### Task 2: Rebuild the push panel

**Files:** `src/components/page/push/PushForm.tsx`, `PushSummaryRail.tsx`

- [ ] **Step 1: Group the rows into two bands** — `수신` (발송 대상 · 언어 · 발송 시점) and `메시지` (제목 · 내용 · 이미지 · 탭 이동). Reorder so target comes before locale and time: language and headcount only mean something once the audience is chosen.
- [ ] **Step 2: Language becomes a `Select`,** not seven radios that wrap. Put the locale's real headcount in the row's `hint`.
- [ ] **Step 3: Add character counters** to 제목 (100) and 내용 (500) as row hints. The server enforces both; today they truncate silently.
- [ ] **Step 4: Replace the compose rail with a notification preview.** Render the title, body and image as they will appear on a device, above the existing 대상 · 발송 · 예상 소요 facts. Keep the loading behaviour: no headcount and no duration until the count resolves.
- [ ] **Step 5: Keep the irreversibility notice resident in the rail** for a broadcast, rather than only in the confirm dialog.
- [ ] **Step 6: Replace hardcoded `text-slate-*` / `text-red-*`** with tokens.
- [ ] **Step 7: Gates, then commit.**

---

### Task 3: Game module — two popups to sheets

The only module with no sheet at all, and it holds the largest form in the repo.

**Files:** `src/components/page/game/GameFormModal.tsx` (27 fields), `GameRewardPolicyModal.tsx` (9 fields), and their list call sites.

- [ ] **Step 1: `GameFormModal` → `Sheet` + `AdminSideSheetContent size='lg'`.** Its `max-w-3xl max-h-[90vh] overflow-y-auto` currently scrolls the whole popup, taking the save button out of view on a long form. Body scrolls; footer is sticky.
- [ ] **Step 2: Band the 27 fields** into 기본 정보 / 진행 규칙 / 보상 / 노출, using `DefinitionRow` throughout.
- [ ] **Step 3: `GameRewardPolicyModal` → sheet `md`,** same row and band treatment.
- [ ] **Step 4: Rename both files** to `GameFormSheet.tsx` / `GameRewardPolicySheet.tsx` and update imports — the name should say what it is.
- [ ] **Step 5: Gates, then commit** (one commit per file is fine).

---

### Task 4: One screen, one paradigm — space and user

Both screens open details in a sheet and edits in a popup, so pressing 수정 closes the sheet and opens a dialog somewhere else on screen.

**Files:** `space/components/SpaceEditModal.tsx`, `SpaceProfileModal.tsx`, `user/components/UserEditModal.tsx`, plus their call sites in `SpaceList.tsx`, `SpaceDetailSheet.tsx`, `UserList.tsx`, `UserDetailSheet.tsx`.

- [ ] **Step 1: `SpaceEditModal` → sheet `md`,** entered as a mode of the space detail sheet rather than a separate overlay. The selected row stays visible in the list behind it.
- [ ] **Step 2: `SpaceProfileModal` → a tab in the space detail sheet.** It has zero inputs — it is a read surface — and the detail sheet already has a tab strip. Delete the modal.
- [ ] **Step 3: `UserEditModal` → sheet `md`,** same treatment as space.
- [ ] **Step 4: Leave the confirmations alone** — 운영 변경 확인 and 탈퇴 예약 확인 stay `AlertDialog`.
- [ ] **Step 5: Gates, then commit.**

---

### Task 5: Stop the overlay from stacking — image picker

`assets/AssetsDrawer.tsx` opens as a centered dialog **on top of a sheet** that is already open, in four forms: snack, interior, pet custom, banner. Two dims, two close buttons, and an ambiguous `Esc`. It is the only place in the repo where overlays nest.

**Files:** `assets/AssetsDrawer.tsx` and its four callers.

- [ ] **Step 1: Turn it into a step inside the parent sheet.** The sheet body swaps to the selection grid; the header shows a back affordance; choosing an image returns to the form.
- [ ] **Step 2: Widen the grid** to use the sheet's width — eight thumbnails visible instead of four.
- [ ] **Step 3: `Esc` closes the whole sheet,** as it does everywhere else. Back returns to the form.
- [ ] **Step 4: Verify all four callers** — snack, interior, custom, banner — still select and persist an image.
- [ ] **Step 5: Gates, then commit.**

---

### Task 6: Absorb the fourth shell

`custom/CustomFormModal.tsx` uses `DefaultModal`, a shell that exists for this module alone.

**Files:** `custom/CustomFormModal.tsx`, `src/components/shared/ui/default-modal.tsx`

- [ ] **Step 1: Convert to sheet `md`** with `DefinitionRow`.
- [ ] **Step 2: Confirm `DefaultModal` has no other importer,** then delete it.
- [ ] **Step 3: Gates, then commit.**

---

### Task 7: The remaining three conversions

Independent of each other; order does not matter.

- [ ] **Step 1: `card/CardUploadModal.tsx` (22 fields) → sheet `lg`** with a 220px rail carrying upload progress and results, so the list stays visible for comparison.
- [ ] **Step 2: `space/CoinForm.tsx` (7 fields) → sheet `md`,** rail showing the selected space count and total. The execution confirm stays an `AlertDialog`.
- [ ] **Step 3: `user/components/user-migration-modal.tsx` (5 fields) → sheet `md`,** and add a confirm dialog before execution naming what will move. Today one popup does both selection and execution with no confirmation step.
- [ ] **Step 4: Gates, commit per conversion.**

---

### Task 8: Unify the body layout of the label-above panels

Eleven panels still stack labels above their fields via `FormSection` + `FormGroup`. Convert in descending field count, one commit each, so a regression is easy to bisect.

`interior` (21) → `square-library` (19) → `snack` (17) → `banner` (15) → `user/ticket` (13) → `card` (11) → `room` (11) → `space/coin` (11) → `bubble` (9) → `locale` (9) → `exp` (5)

- [ ] **Step 1: For each, replace `FormGroup` with `DefinitionRow`** and add bands where the field count exceeds six.
- [ ] **Step 2: Keep every field's validation and behaviour identical** — this is layout only.
- [ ] **Step 3: Gates after each panel; commit per panel.**
- [ ] **Step 4: When the last one lands, check whether `FormSection`/`FormGroup` still have importers.** If not, delete them.

---

## Post-implementation

Whole-branch review, then `superpowers:finishing-a-development-branch`. The three published proposals are the acceptance reference: the push panel matches its mockup, the ten popups are sheets, and the eighteen confirmations are untouched.
