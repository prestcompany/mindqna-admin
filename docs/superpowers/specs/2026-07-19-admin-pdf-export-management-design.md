# Admin PDF Export Management — Design

- **Date**: 2026-07-19
- **Status**: Approved (brainstorm)
- **Repos**: `mindqna-admin` (frontend), `mindqna-server` (backend)
- **Related**: backend `docs/superpowers/specs/2026-07-15-card-pdf-export-v2-design.md` (the user-facing PDF export feature this manages)

## 1. Problem & Goal

The app has a paid, user-facing PDF export feature (`card/export/` on the backend): a space member spends paid coins to render a range of answered cards into a PDF, then re-downloads it a limited number of times before it expires. Pricing and limits are driven by a single-row policy table (`PdfExportPolicy`, id=1).

The backend already exposes an admin policy endpoint (`GET`/`PATCH /admin/pdf-export/policy`), but the **admin frontend has no UI at all** for this feature, and there is **no admin view of the export history** (history is currently user-scoped only, guarded by `ProfileGuard` + `profile.spaceId`).

**Goal**: give admins one place to (1) configure the export policy and (2) monitor and act on export history across all spaces, for CS response and abuse detection.

### In scope
- Policy config UI (uses existing backend API).
- Cross-space export history: searchable by space and by issuer, paginated, read-only base.
- Per-record admin actions: view PDF (download), force delete, adjust download count / expiry.
- New backend admin endpoints for history + those actions.

### Out of scope (YAGNI)
- Status / date-range filters on history (search by space + user only).
- Revenue/usage analytics or charts.
- Policy change audit log.
- Admin-managed sample PDF (stays an env var, `PDF_EXPORT_SAMPLE_URL`).

## 2. UX / Structure

One nav item in the **시스템 (system)** group: `PDF 내보내기 관리` → single page at `/pdf-export` with two tabs:

- **정책 (Policy)** — mirrors the existing `앱 버전 관리` (`AppVersionManager`) pattern.
- **이력 (History)** — the main tab: search bar + table + pagination + per-row actions.

Rationale: one cohesive menu entry; policy is a light tab, history is the workhorse. Reuses the codebase's existing `tabs.tsx` and `table.tsx`.

## 3. Backend Changes (`mindqna-server`)

All under the existing module `src/admin/pdf-export/`, guarded by `AdminGuard`. The existing `PdfExportController` gains history routes; a new record service holds the history/action logic (keep `PdfExportPolicyService` focused on policy).

### 3.1 New endpoints

| Route | Purpose |
|-------|---------|
| `GET /admin/pdf-export/history?page=&space=&user=` | Paginated export list across all spaces. `space` = partial match on space name **or** exact `spaceId`; `user` = partial match on issuer nickname (`Profile.nickname`) / login id (`User.username`) **or** exact `profileId`. Both optional. Response items join space name + issuer (nickname, username) and include the server-computed `status`. |
| `POST /admin/pdf-export/history/:id/download` | Admin presigned GET URL. **No metering, no count/expiry cap** — does not touch `downloadCount`. Returns `{ url, urlExpiresAt }`. |
| `DELETE /admin/pdf-export/history/:id` | Force delete the record: S3 object (`isNew=true`) + DB row. |
| `PATCH /admin/pdf-export/history/:id` | Adjust `{ downloadCount?, expiresAt? }`. Returns the updated record (same shape as a history item). |

Route ordering: history routes live under `/history` / `/history/:id`, distinct from the existing `/policy` route — no `:id` capture conflict.

### 3.2 Services

- `PdfExportPolicyService` — unchanged (policy get/update).
- `AdminPdfExportRecordService` (new) — `listHistory`, `getDownloadUrl`, `deleteRecord`, `updateRecord`. Injects `PrismaService` + `AwsService`. Reuses the deletion pattern from `CardExportService.deleteExport` (S3 delete with `isNew=true`, then DB delete) but cross-space (admin is not spaceId-scoped).
- Controller injects both services.
- Module must provide `AwsService` (import whatever module exports it, as `CardExportService` does).

### 3.3 Shared status helper (targeted refactor)

`computeStatus(record, now)` is currently a private function in `card/export/card-export.service.ts`. Extract it to `card/export/card-export.status.ts` (one export per file) and import it from both the user `CardExportService` and the new `AdminPdfExportRecordService`, so status precedence (period before count) stays defined once. This is the only change to existing user-facing code; behavior is unchanged.

### 3.4 Query shape

`CardExportMeta` already has `space` and `profile` relations, so the history query includes:
- `space: { select: { id, spaceInfo: { select: { name } } } }` (space name lives on `SpaceInfo.name`)
- `profile: { select: { id, nickname, user: { select: { username } } } }` (email/login is `User.username`; `Profile` has no email field)

`space` / `user` filters compile to Prisma `where` clauses (`OR` of name-contains / id-equals for space; nickname-contains / `user.username`-contains / profileId-equals for user). Ordered `createdAt desc`, paginated with the existing admin `page` + `QueryResultWithPagination` convention.

### 3.5 Validation & errors

- Unknown `:id` → `NotFoundException`.
- `PATCH`: `downloadCount` must be a non-negative integer; `expiresAt` must be a valid future-or-any ISO date (reject malformed). Invalid → `BadRequestException`.
- Presigned URL / S3 failures surfaced (logged) as in `CardExportService`.

## 4. Frontend Changes (`mindqna-admin`)

```
src/client/pdf-export.ts             # API client functions
src/client/types.ts                  # add PDF export admin types (existing convention)
src/pages/pdf-export/index.tsx       # getLayout + pageHeader → <PdfExportManager/>
src/components/page/pdf-export/
  PdfExportManager.tsx               # tabs wrapper (정책 | 이력)
  PdfExportPolicyTab.tsx             # AppVersionManager-style form
  PdfExportHistoryTab.tsx            # search bar + table + pagination + row actions
  PdfExportHistoryColumns.tsx        # column defs (SpaceTableColumns pattern)
src/components/layout/main-menu.tsx  # add item to systemMenu (next to 앱 버전 관리)
```

### 4.1 API client (`src/client/pdf-export.ts`)

The axios `baseURL` already includes `/admin`, so paths are `/pdf-export/...`:
- `getPdfExportPolicy()` → `GET /pdf-export/policy`
- `updatePdfExportPolicy(body)` → `PATCH /pdf-export/policy`
- `getPdfExportHistory({ page, space?, user? })` → `GET /pdf-export/history`
- `getPdfExportAdminDownloadUrl(id)` → `POST /pdf-export/history/:id/download`
- `deletePdfExportRecord(id)` → `DELETE /pdf-export/history/:id`
- `updatePdfExportRecord(id, { downloadCount?, expiresAt? })` → `PATCH /pdf-export/history/:id`

### 4.2 Policy tab

Mirrors `AppVersionManager`: `useQuery(getPdfExportPolicy)` → local form for `coinPerQuestion` / `maxDownloadCount` / `expiryDays` → validate positive integers → `updatePdfExportPolicy` → `refetch` + `toast`. Show `updatedAt` (or "기본값 적용 중" when null).

### 4.3 History tab

- **Search bar**: two inputs — 공간 검색 (`space`) and 유저 검색 (`user`). Submitting resets to `page=1` and refetches. Follows the existing shared filter-bar pattern.
- **Table** (`table.tsx`): 공간명(+id) · 발급자(닉네임/username) · 파일명 · 범위(start–end) · 카드수(count) · 비용(cost, 코인) · 다운로드(downloadCount/maxDownloadCount) · 상태 배지(available / 기간만료 / 횟수소진) · 발급일 · 만료일 · 액션.
- **Pagination**: existing admin list pagination pattern.
- **Empty state**: distinct "no results" vs "no exports yet".
- **Row actions**:
  - **다운로드 확인**: call `getPdfExportAdminDownloadUrl`, open returned `url` in a new tab.
  - **강제 삭제**: `alert-dialog.tsx` confirm → `deletePdfExportRecord` → refetch + toast.
  - **조정**: small dialog with `downloadCount` (number) + `expiresAt` (date) → `updatePdfExportRecord` → refetch + toast.

### 4.4 Navigation

Add to `systemMenu` in `main-menu.tsx`, adjacent to `앱 버전 관리`:
`{ id: 'pdf-export', name: 'PDF 내보내기 관리', icon: <FileDown className='w-4 h-4' />, link: { path: '/pdf-export' } }`.

## 5. Error Handling & Edge Cases

- Frontend reuses the axios interceptor (401 → sign-out) and `toast.error` pattern already in `@base.ts`.
- Destructive/mutating actions (delete, adjust) go through confirm dialogs.
- Policy and adjustment inputs validated client-side (positive integers, valid date) before submit; server re-validates.
- History with 0 rows shows an empty state.
- Admin download URL is unmetered and separate from the user download cap — deliberately does not affect `downloadCount`.

## 6. Testing

- **Backend**: unit tests for `AdminPdfExportRecordService` — filtered history query (space/user), delete (S3 + DB), adjust validation, presigned URL — following `card-export.service.spec.ts`. A smoke `admin/test` method per the module convention if applicable.
- **Frontend**: typecheck + `pnpm build` pass; manual QA of both tabs and all row actions. (This repo has no per-page automated test convention — e.g. `app-version` ships untested.)

## 7. Implementation Order

Backend first, then frontend:
1. Backend: extract `computeStatus`; add `AdminPdfExportRecordService` + controller routes + tests.
2. Frontend: `pdf-export.ts` client + types → policy tab → history tab (table + search + pagination) → row actions (download, delete, adjust) → nav item.

One spec covers both repos; the implementation plan sequences backend → frontend.
