# Admin PDF Export Management Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give admins one page to configure the PDF export policy and monitor/act on export history across all spaces (CS + abuse response).

**Architecture:** Backend (`mindqna-server`) gains admin history endpoints + a record service in the existing `admin/pdf-export` module, reusing `AwsService`/`PrismaService` (both `@Global`). Frontend (`mindqna-admin`) adds a hand-written axios client and a single tabbed page (정책 | 이력) following the existing `AppVersionManager` + admin list patterns.

**Tech Stack:** Backend — NestJS, `@nestia/core` (`TypedRoute`/`TypedQuery`/`TypedBody`), Prisma, Jest (`yarn jest`). Frontend — Next.js pages, React Query, shadcn/ui (`table.tsx`, `tabs.tsx`, `alert-dialog.tsx`, `dialog`), `sonner` toast, Tailwind.

## Global Constraints

- **Two repos.** Backend root: `/Users/gargoyle92/Documents/backend/mindqna-server`. Frontend root: `/Users/gargoyle92/Documents/frontend/mindqna-admin`. All backend paths (Tasks 1–4) are relative to the backend root; all frontend paths (Tasks 5–9) to the frontend root.
- **Backend guard:** every new route is under `@Controller('admin/pdf-export')` with `@UseGuards(AdminGuard)` (already on the controller).
- **Backend conventions (`.cursor/rules`):** English code/docs; declare all types (no `any`); one export per NEW file; kebab-case filenames; verbs start functions; RO-RO for multi-param functions; no blank lines inside a function body.
- **Frontend API base:** axios `baseURL` already includes `/admin`, so client paths are `/pdf-export/...` (never `/admin/pdf-export/...`).
- **Pagination shape (must match frontend `QueryResultWithPagination`):** `{ items: T[]; totalCount: number; pageInfo: { totalPage: number } }`.
- **History page size:** 20 rows per page.
- **Admin download is unmetered:** `POST /history/:id/download` must NOT touch `downloadCount` or check caps.
- **No emoji** in code, UI copy, or commit messages.
- **Frontend has no page-test convention** (e.g. `app-version` ships untested): frontend tasks verify with `npx tsc --noEmit` + `pnpm build` + a described manual check, not unit tests. Backend tasks use real Jest TDD.

---

## Task 1: Extract `computeStatus` to a shared file (backend)

**Files:**
- Create: `src/card/export/card-export.status.ts`
- Modify: `src/card/export/card-export.service.ts` (remove local `computeStatus` at lines ~42–49, import the shared one at line ~27)
- Create: `src/card/export/card-export.status.spec.ts`

**Interfaces:**
- Produces: `export function computeStatus(record: Pick<CardExportMeta, 'expiresAt' | 'downloadCount' | 'maxDownloadCount'>, now: Date): PdfExportStatus` — period checked before count.

- [ ] **Step 1: Write the failing test**

Create `src/card/export/card-export.status.spec.ts`:

```ts
import { computeStatus } from './card-export.status';

describe('computeStatus', () => {
  const base = { expiresAt: new Date('2026-12-31T00:00:00Z'), downloadCount: 0, maxDownloadCount: 20 };
  const now = new Date('2026-07-19T00:00:00Z');

  it('returns available when within period and under the count cap', () => {
    const actual = computeStatus(base, now);
    expect(actual).toBe('available');
  });

  it('returns expired_period when now is past expiresAt (checked before count)', () => {
    const input = { ...base, expiresAt: new Date('2026-01-01T00:00:00Z'), downloadCount: 20 };
    const actual = computeStatus(input, now);
    expect(actual).toBe('expired_period');
  });

  it('returns expired_count when the download cap is reached but still in period', () => {
    const input = { ...base, downloadCount: 20 };
    const actual = computeStatus(input, now);
    expect(actual).toBe('expired_count');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/card/export/card-export.status.spec.ts`
Expected: FAIL — `Cannot find module './card-export.status'`.

- [ ] **Step 3: Create the shared file**

Create `src/card/export/card-export.status.ts`:

```ts
import { CardExportMeta } from '@prisma/client';
import { PdfExportStatus } from './card-export.dto';

// Server-computed download status — period checked before count (spec §1). Shared by the user
// purchase/history mapper and the admin history service so both agree on the same precedence.
export function computeStatus(
  record: Pick<CardExportMeta, 'expiresAt' | 'downloadCount' | 'maxDownloadCount'>,
  now: Date,
): PdfExportStatus {
  if (now > record.expiresAt) return 'expired_period';
  if (record.downloadCount >= record.maxDownloadCount) return 'expired_count';
  return 'available';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/card/export/card-export.status.spec.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Update the user service to import the shared helper**

In `src/card/export/card-export.service.ts`: delete the local `function computeStatus(...) { ... }` block (the `CardExportMeta` import stays; it is used elsewhere). Add to the export imports near line 27:

```ts
import { computeStatus } from './card-export.status';
```

- [ ] **Step 6: Run the full card-export suite to confirm no regression**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/card/export`
Expected: PASS (existing `card-export.service.spec.ts`, `pdf-export-policy.spec.ts`, `card-export.controller.spec.ts`, plus the new status spec).

- [ ] **Step 7: Commit**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/card/export/card-export.status.ts src/card/export/card-export.status.spec.ts src/card/export/card-export.service.ts
git commit -m "refactor(card-export): extract computeStatus to shared file"
```

---

## Task 2: Admin history query — types + `listHistory` (backend)

**Files:**
- Modify: `src/admin/pdf-export/pdf-export.interface.ts` (add types below the existing two interfaces)
- Create: `src/admin/pdf-export/admin-pdf-export-record.service.ts`
- Create: `src/admin/pdf-export/admin-pdf-export-record.service.spec.ts`

**Interfaces:**
- Consumes: `computeStatus` (Task 1).
- Produces:
  - `AdminPdfExportHistoryQuery { page: number; space?: string; user?: string }`
  - `AdminPdfExportRecordDto` (see code)
  - `AdminPdfExportHistoryResult { items: AdminPdfExportRecordDto[]; totalCount: number; pageInfo: { totalPage: number } }`
  - `class AdminPdfExportRecordService` with `listHistory(query: AdminPdfExportHistoryQuery): Promise<AdminPdfExportHistoryResult>`

- [ ] **Step 1: Add the interface types**

Append to `src/admin/pdf-export/pdf-export.interface.ts`:

```ts
import { PdfExportStatus } from 'src/card/export/card-export.dto';

export interface AdminPdfExportHistoryQuery {
  page: number;
  space?: string;
  user?: string;
}

export interface AdminPdfExportRecordDto {
  id: number;
  spaceId: string;
  spaceName: string;
  profileId: string;
  nickname: string;
  username: string;
  fileName: string;
  startOrder: number;
  endOrder: number;
  count: number;
  cost: number;
  coinPerQuestion: number;
  downloadCount: number;
  maxDownloadCount: number;
  status: PdfExportStatus;
  createdAt: string;
  expiresAt: string;
}

export interface AdminPdfExportHistoryResult {
  items: AdminPdfExportRecordDto[];
  totalCount: number;
  pageInfo: { totalPage: number };
}

export interface AdminPdfExportDownloadDto {
  url: string;
  urlExpiresAt: string;
}

export interface UpdatePdfExportRecordParams {
  downloadCount?: number;
  expiresAt?: string;
}
```

- [ ] **Step 2: Write the failing test**

Create `src/admin/pdf-export/admin-pdf-export-record.service.spec.ts`:

```ts
import { AdminPdfExportRecordService } from './admin-pdf-export-record.service';

function buildRecord(overrides: Partial<any> = {}) {
  return {
    id: 1,
    spaceId: 'space-1',
    profileId: 'profile-1',
    fileName: '[MindBridge] Test 기록.pdf',
    startOrder: 1,
    endOrder: 10,
    count: 8,
    cost: 16,
    coinPerQuestion: 2,
    downloadCount: 3,
    maxDownloadCount: 20,
    expiresAt: new Date('2026-12-31T00:00:00Z'),
    createdAt: new Date('2026-07-01T00:00:00Z'),
    s3Key: 'exports/space-1/1.pdf',
    space: { id: 'space-1', spaceInfo: { name: 'Test Space' } },
    profile: { id: 'profile-1', nickname: 'tester', user: { username: 'tester@example.com' } },
    ...overrides,
  };
}

describe('AdminPdfExportRecordService.listHistory', () => {
  let prisma: any;
  let aws: any;
  let service: AdminPdfExportRecordService;

  beforeEach(() => {
    prisma = {
      cardExportMeta: { findMany: jest.fn(), count: jest.fn() },
      $transaction: jest.fn((ops: Promise<unknown>[]) => Promise.all(ops)),
    };
    aws = { getPresignedGetUrl: jest.fn(), deleteS3Object: jest.fn() };
    service = new AdminPdfExportRecordService(prisma, aws);
  });

  it('flattens joined space/profile fields and computes status', async () => {
    prisma.cardExportMeta.findMany.mockResolvedValue([buildRecord()]);
    prisma.cardExportMeta.count.mockResolvedValue(1);
    const actual = await service.listHistory({ page: 1 });
    expect(actual.totalCount).toBe(1);
    expect(actual.pageInfo.totalPage).toBe(1);
    expect(actual.items[0]).toMatchObject({
      spaceName: 'Test Space',
      nickname: 'tester',
      username: 'tester@example.com',
      status: 'available',
      createdAt: '2026-07-01T00:00:00.000Z',
    });
  });

  it('builds a combined space+user where clause and paginates', async () => {
    prisma.cardExportMeta.findMany.mockResolvedValue([]);
    prisma.cardExportMeta.count.mockResolvedValue(0);
    await service.listHistory({ page: 2, space: 'Test', user: 'tester' });
    const arg = prisma.cardExportMeta.findMany.mock.calls[0][0];
    expect(arg.skip).toBe(20);
    expect(arg.take).toBe(20);
    expect(JSON.stringify(arg.where)).toContain('Test');
    expect(JSON.stringify(arg.where)).toContain('tester');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/admin/pdf-export/admin-pdf-export-record.service.spec.ts`
Expected: FAIL — `Cannot find module './admin-pdf-export-record.service'`.

- [ ] **Step 4: Create the service with `listHistory`**

Create `src/admin/pdf-export/admin-pdf-export-record.service.ts`:

```ts
import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { AwsService } from 'src/aws/aws.service';
import { computeStatus } from 'src/card/export/card-export.status';
import {
  AdminPdfExportHistoryQuery,
  AdminPdfExportHistoryResult,
  AdminPdfExportRecordDto,
} from './pdf-export.interface';

const PAGE_SIZE = 20;

type JoinedRecord = Prisma.CardExportMetaGetPayload<{
  include: {
    space: { select: { id: true; spaceInfo: { select: { name: true } } } };
    profile: { select: { id: true; nickname: true; user: { select: { username: true } } } };
  };
}>;

const HISTORY_INCLUDE = {
  space: { select: { id: true, spaceInfo: { select: { name: true } } } },
  profile: { select: { id: true, nickname: true, user: { select: { username: true } } } },
} as const;

@Injectable()
export class AdminPdfExportRecordService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly aws: AwsService,
  ) {}

  async listHistory(query: AdminPdfExportHistoryQuery): Promise<AdminPdfExportHistoryResult> {
    const page = query.page && query.page > 0 ? query.page : 1;
    const where = this.buildWhere(query);
    const [records, totalCount] = await this.prisma.$transaction([
      this.prisma.cardExportMeta.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: PAGE_SIZE,
        skip: (page - 1) * PAGE_SIZE,
        include: HISTORY_INCLUDE,
      }),
      this.prisma.cardExportMeta.count({ where }),
    ]);
    const now = new Date();
    return {
      items: records.map((record) => this.toDto(record, now)),
      totalCount,
      pageInfo: { totalPage: Math.ceil(totalCount / PAGE_SIZE) },
    };
  }

  private buildWhere(query: AdminPdfExportHistoryQuery): Prisma.CardExportMetaWhereInput {
    const and: Prisma.CardExportMetaWhereInput[] = [];
    const space = query.space?.trim();
    if (space) {
      and.push({ OR: [{ spaceId: space }, { space: { spaceInfo: { name: { contains: space } } } }] });
    }
    const user = query.user?.trim();
    if (user) {
      and.push({
        OR: [
          { profileId: user },
          { profile: { nickname: { contains: user } } },
          { profile: { user: { username: { contains: user } } } },
        ],
      });
    }
    return and.length ? { AND: and } : {};
  }

  private toDto(record: JoinedRecord, now: Date): AdminPdfExportRecordDto {
    return {
      id: record.id,
      spaceId: record.spaceId,
      spaceName: record.space.spaceInfo?.name ?? '',
      profileId: record.profileId,
      nickname: record.profile.nickname,
      username: record.profile.user.username,
      fileName: record.fileName,
      startOrder: record.startOrder,
      endOrder: record.endOrder,
      count: record.count,
      cost: record.cost,
      coinPerQuestion: record.coinPerQuestion,
      downloadCount: record.downloadCount,
      maxDownloadCount: record.maxDownloadCount,
      status: computeStatus(record, now),
      createdAt: record.createdAt.toISOString(),
      expiresAt: record.expiresAt.toISOString(),
    };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/admin/pdf-export/admin-pdf-export-record.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 6: Commit**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/pdf-export/pdf-export.interface.ts src/admin/pdf-export/admin-pdf-export-record.service.ts src/admin/pdf-export/admin-pdf-export-record.service.spec.ts
git commit -m "feat(admin-pdf-export): add cross-space export history query"
```

---

## Task 3: Record actions — download, delete, adjust (backend)

**Files:**
- Modify: `src/admin/pdf-export/admin-pdf-export-record.service.ts` (add three methods)
- Modify: `src/admin/pdf-export/admin-pdf-export-record.service.spec.ts` (add tests)

**Interfaces:**
- Produces on `AdminPdfExportRecordService`:
  - `getDownloadUrl(id: number): Promise<AdminPdfExportDownloadDto>`
  - `deleteRecord(id: number): Promise<void>`
  - `updateRecord(id: number, params: UpdatePdfExportRecordParams): Promise<AdminPdfExportRecordDto>`

- [ ] **Step 1: Write the failing tests**

Append to `describe`-level in `admin-pdf-export-record.service.spec.ts` (add these `describe` blocks after the existing one, inside the file):

```ts
describe('AdminPdfExportRecordService actions', () => {
  let prisma: any;
  let aws: any;
  let service: AdminPdfExportRecordService;

  beforeEach(() => {
    prisma = {
      cardExportMeta: { findUnique: jest.fn(), delete: jest.fn(), update: jest.fn() },
    };
    aws = { getPresignedGetUrl: jest.fn(), deleteS3Object: jest.fn() };
    service = new AdminPdfExportRecordService(prisma, aws);
  });

  it('getDownloadUrl returns a presigned url without touching downloadCount', async () => {
    prisma.cardExportMeta.findUnique.mockResolvedValue(buildRecord());
    aws.getPresignedGetUrl.mockResolvedValue('https://s3/signed');
    const actual = await service.getDownloadUrl(1);
    expect(actual.url).toBe('https://s3/signed');
    expect(typeof actual.urlExpiresAt).toBe('string');
    expect(prisma.cardExportMeta.update).not.toHaveBeenCalled();
  });

  it('getDownloadUrl throws when the record is missing', async () => {
    prisma.cardExportMeta.findUnique.mockResolvedValue(null);
    await expect(service.getDownloadUrl(999)).rejects.toBeDefined();
  });

  it('deleteRecord removes the S3 object (isNew=true) then the DB row', async () => {
    prisma.cardExportMeta.findUnique.mockResolvedValue(buildRecord());
    aws.deleteS3Object.mockResolvedValue(undefined);
    prisma.cardExportMeta.delete.mockResolvedValue(buildRecord());
    await service.deleteRecord(1);
    expect(aws.deleteS3Object).toHaveBeenCalledWith('exports/space-1/1.pdf', true);
    expect(prisma.cardExportMeta.delete).toHaveBeenCalledWith({ where: { id: 1 } });
  });

  it('updateRecord rejects a negative downloadCount', async () => {
    prisma.cardExportMeta.findUnique.mockResolvedValue(buildRecord());
    await expect(service.updateRecord(1, { downloadCount: -1 })).rejects.toBeDefined();
    expect(prisma.cardExportMeta.update).not.toHaveBeenCalled();
  });

  it('updateRecord rejects a malformed expiresAt', async () => {
    prisma.cardExportMeta.findUnique.mockResolvedValue(buildRecord());
    await expect(service.updateRecord(1, { expiresAt: 'not-a-date' })).rejects.toBeDefined();
    expect(prisma.cardExportMeta.update).not.toHaveBeenCalled();
  });

  it('updateRecord applies valid changes and returns the mapped dto', async () => {
    prisma.cardExportMeta.findUnique.mockResolvedValue(buildRecord());
    prisma.cardExportMeta.update.mockResolvedValue(buildRecord({ downloadCount: 0 }));
    const actual = await service.updateRecord(1, { downloadCount: 0 });
    expect(prisma.cardExportMeta.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 1 }, data: { downloadCount: 0 } }),
    );
    expect(actual.downloadCount).toBe(0);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/admin/pdf-export/admin-pdf-export-record.service.spec.ts`
Expected: FAIL — `service.getDownloadUrl is not a function` (and siblings).

- [ ] **Step 3: Implement the three methods**

Edit `src/admin/pdf-export/admin-pdf-export-record.service.ts`. Extend the imports and add a TTL constant + three methods:

Update the top imports:

```ts
import { BadRequestException, NotFoundException } from 'src/common/exception/error';
import {
  AdminPdfExportDownloadDto,
  AdminPdfExportHistoryQuery,
  AdminPdfExportHistoryResult,
  AdminPdfExportRecordDto,
  UpdatePdfExportRecordParams,
} from './pdf-export.interface';
```

Add below `const PAGE_SIZE = 20;`:

```ts
const DOWNLOAD_URL_TTL_SEC = 900;
```

Add these methods inside the class (after `listHistory`):

```ts
  async getDownloadUrl(id: number): Promise<AdminPdfExportDownloadDto> {
    const record = await this.prisma.cardExportMeta.findUnique({ where: { id } });
    if (!record) throw NotFoundException();
    const url = await this.aws.getPresignedGetUrl(record.s3Key, DOWNLOAD_URL_TTL_SEC);
    const urlExpiresAt = new Date(Date.now() + DOWNLOAD_URL_TTL_SEC * 1000).toISOString();
    return { url, urlExpiresAt };
  }

  async deleteRecord(id: number): Promise<void> {
    const record = await this.prisma.cardExportMeta.findUnique({ where: { id } });
    if (!record) throw NotFoundException();
    await this.aws.deleteS3Object(record.s3Key, true);
    await this.prisma.cardExportMeta.delete({ where: { id } });
  }

  async updateRecord(id: number, params: UpdatePdfExportRecordParams): Promise<AdminPdfExportRecordDto> {
    const record = await this.prisma.cardExportMeta.findUnique({ where: { id } });
    if (!record) throw NotFoundException();
    const data = this.buildUpdateData(params);
    const updated = await this.prisma.cardExportMeta.update({ where: { id }, data, include: HISTORY_INCLUDE });
    return this.toDto(updated, new Date());
  }

  private buildUpdateData(params: UpdatePdfExportRecordParams): Prisma.CardExportMetaUpdateInput {
    const data: Prisma.CardExportMetaUpdateInput = {};
    if (params.downloadCount !== undefined) {
      if (!Number.isInteger(params.downloadCount) || params.downloadCount < 0) {
        throw BadRequestException('Invalid downloadCount');
      }
      data.downloadCount = params.downloadCount;
    }
    if (params.expiresAt !== undefined) {
      const parsed = new Date(params.expiresAt);
      if (Number.isNaN(parsed.getTime())) throw BadRequestException('Invalid expiresAt');
      data.expiresAt = parsed;
    }
    return data;
  }
```

Note: `NotFoundException` / `BadRequestException` are the factory helpers from `src/common/exception/error` (called with `()` — same usage as `CardExportService`).

- [ ] **Step 4: Run tests to verify they pass**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/admin/pdf-export/admin-pdf-export-record.service.spec.ts`
Expected: PASS (8 tests total).

- [ ] **Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/pdf-export/admin-pdf-export-record.service.ts src/admin/pdf-export/admin-pdf-export-record.service.spec.ts
git commit -m "feat(admin-pdf-export): add record download/delete/adjust actions"
```

---

## Task 4: Controller routes + module wiring (backend)

**Files:**
- Modify: `src/admin/pdf-export/pdf-export.controller.ts`
- Modify: `src/admin/pdf-export/pdf-export.module.ts`

**Interfaces:**
- Consumes: `AdminPdfExportRecordService` (Tasks 2–3), the interface types (Task 2).
- Produces (HTTP): `GET /admin/pdf-export/history`, `POST /admin/pdf-export/history/:id/download`, `DELETE /admin/pdf-export/history/:id`, `PATCH /admin/pdf-export/history/:id`.

- [ ] **Step 1: Wire the service into the module**

Replace `src/admin/pdf-export/pdf-export.module.ts` with:

```ts
import { Module } from '@nestjs/common';
import { PdfExportController } from './pdf-export.controller';
import { PdfExportPolicyService } from './pdf-export.service';
import { AdminPdfExportRecordService } from './admin-pdf-export-record.service';

@Module({
  providers: [PdfExportPolicyService, AdminPdfExportRecordService],
  controllers: [PdfExportController],
})
export class PdfExportModule {}
```

(`AwsModule` and `PrismaModule` are `@Global`, so no `imports` entry is needed.)

- [ ] **Step 2: Add the history routes to the controller**

Replace `src/admin/pdf-export/pdf-export.controller.ts` with:

```ts
import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
import { Controller, HttpCode, UseGuards } from '@nestjs/common';
import { AdminGuard } from '../admin.guard';
import { PdfExportPolicyService } from './pdf-export.service';
import { AdminPdfExportRecordService } from './admin-pdf-export-record.service';
import {
  AdminPdfExportDownloadDto,
  AdminPdfExportHistoryQuery,
  AdminPdfExportHistoryResult,
  AdminPdfExportRecordDto,
  PdfExportPolicyDto,
  UpdatePdfExportPolicyParams,
  UpdatePdfExportRecordParams,
} from './pdf-export.interface';

@Controller('admin/pdf-export')
@UseGuards(AdminGuard)
export class PdfExportController {
  constructor(
    private readonly pdfExportPolicyService: PdfExportPolicyService,
    private readonly recordService: AdminPdfExportRecordService,
  ) {}

  @TypedRoute.Get('/policy')
  async getPolicy(): Promise<PdfExportPolicyDto> {
    return this.pdfExportPolicyService.getPolicy();
  }

  @TypedRoute.Patch('/policy')
  async updatePolicy(@TypedBody() body: UpdatePdfExportPolicyParams): Promise<PdfExportPolicyDto> {
    return this.pdfExportPolicyService.updatePolicy(body);
  }

  // Static `/history` stays declared before the `/history/:id` routes so it isn't captured by the id param.
  @TypedRoute.Get('/history')
  async getHistory(@TypedQuery() query: AdminPdfExportHistoryQuery): Promise<AdminPdfExportHistoryResult> {
    return this.recordService.listHistory(query);
  }

  @TypedRoute.Post('/history/:id/download')
  async downloadRecord(@TypedParam('id') id: number): Promise<AdminPdfExportDownloadDto> {
    return this.recordService.getDownloadUrl(id);
  }

  @TypedRoute.Patch('/history/:id')
  async updateRecord(
    @TypedParam('id') id: number,
    @TypedBody() body: UpdatePdfExportRecordParams,
  ): Promise<AdminPdfExportRecordDto> {
    return this.recordService.updateRecord(id, body);
  }

  @TypedRoute.Delete('/history/:id')
  @HttpCode(204)
  async deleteRecord(@TypedParam('id') id: number): Promise<void> {
    await this.recordService.deleteRecord(id);
  }
}
```

- [ ] **Step 3: Build to verify the module compiles and routes type-check**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn build`
Expected: build succeeds (nestia transforms `TypedRoute`/`TypedQuery`/`TypedBody` with no type errors).

- [ ] **Step 4: Run the whole pdf-export suite**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn jest src/admin/pdf-export src/card/export`
Expected: PASS (all specs).

- [ ] **Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/pdf-export/pdf-export.controller.ts src/admin/pdf-export/pdf-export.module.ts
git commit -m "feat(admin-pdf-export): expose history + record action routes"
```

---

## Task 5: Frontend API client + types

**Files:**
- Modify: `src/client/types.ts` (append the PDF export types)
- Create: `src/client/pdf-export.ts`

**Interfaces:**
- Produces (client fns): `getPdfExportPolicy`, `updatePdfExportPolicy`, `getPdfExportHistory`, `getPdfExportAdminDownloadUrl`, `deletePdfExportRecord`, `updatePdfExportRecord`.
- Produces (types): `PdfExportPolicy`, `UpdatePdfExportPolicyParams`, `PdfExportStatus`, `PdfExportRecord`, `PdfExportHistoryParams`, `PdfExportHistoryResult`, `PdfExportDownloadResult`, `UpdatePdfExportRecordParams`.

- [ ] **Step 1: Append types to `src/client/types.ts`**

`QueryResultWithPagination<T>` already exists in this file. Append:

```ts
export type PdfExportPolicy = {
  id: number;
  coinPerQuestion: number;
  maxDownloadCount: number;
  expiryDays: number;
  updatedAt: string | null;
};

export type UpdatePdfExportPolicyParams = {
  coinPerQuestion?: number;
  maxDownloadCount?: number;
  expiryDays?: number;
};

export type PdfExportStatus = 'available' | 'expired_period' | 'expired_count';

export type PdfExportRecord = {
  id: number;
  spaceId: string;
  spaceName: string;
  profileId: string;
  nickname: string;
  username: string;
  fileName: string;
  startOrder: number;
  endOrder: number;
  count: number;
  cost: number;
  coinPerQuestion: number;
  downloadCount: number;
  maxDownloadCount: number;
  status: PdfExportStatus;
  createdAt: string;
  expiresAt: string;
};

export type PdfExportHistoryParams = {
  page: number;
  space?: string;
  user?: string;
};

export type PdfExportHistoryResult = QueryResultWithPagination<PdfExportRecord> & {
  totalCount: number;
};

export type PdfExportDownloadResult = {
  url: string;
  urlExpiresAt: string;
};

export type UpdatePdfExportRecordParams = {
  downloadCount?: number;
  expiresAt?: string;
};
```

- [ ] **Step 2: Create the client**

Create `src/client/pdf-export.ts`:

```ts
import client from './@base';
import {
  PdfExportDownloadResult,
  PdfExportHistoryParams,
  PdfExportHistoryResult,
  PdfExportPolicy,
  UpdatePdfExportPolicyParams,
  UpdatePdfExportRecordParams,
} from './types';

export async function getPdfExportPolicy() {
  const res = await client.get<PdfExportPolicy>('/pdf-export/policy');

  return res.data;
}

export async function updatePdfExportPolicy(body: UpdatePdfExportPolicyParams) {
  const res = await client.patch<PdfExportPolicy>('/pdf-export/policy', body);

  return res.data;
}

export async function getPdfExportHistory(params: PdfExportHistoryParams) {
  const res = await client.get<PdfExportHistoryResult>('/pdf-export/history', { params });

  return res.data;
}

export async function getPdfExportAdminDownloadUrl(id: number) {
  const res = await client.post<PdfExportDownloadResult>(`/pdf-export/history/${id}/download`);

  return res.data;
}

export async function deletePdfExportRecord(id: number) {
  const res = await client.delete(`/pdf-export/history/${id}`);

  return res.data;
}

export async function updatePdfExportRecord(id: number, body: UpdatePdfExportRecordParams) {
  const res = await client.patch<PdfExportRecord>(`/pdf-export/history/${id}`, body);

  return res.data;
}
```

Add `PdfExportRecord` to the import list at the top of the file (used as the `patch` response type):

```ts
import {
  PdfExportDownloadResult,
  PdfExportHistoryParams,
  PdfExportHistoryResult,
  PdfExportPolicy,
  PdfExportRecord,
  UpdatePdfExportPolicyParams,
  UpdatePdfExportRecordParams,
} from './types';
```

- [ ] **Step 3: Typecheck**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts src/client/pdf-export.ts
git commit -m "feat(pdf-export): add admin PDF export API client and types"
```

---

## Task 6: Page scaffold + tabs shell + nav item (frontend)

**Files:**
- Create: `src/pages/pdf-export/index.tsx`
- Create: `src/components/page/pdf-export/PdfExportManager.tsx`
- Create: `src/components/page/pdf-export/PdfExportPolicyTab.tsx` (placeholder shell in this task)
- Create: `src/components/page/pdf-export/PdfExportHistoryTab.tsx` (placeholder shell in this task)
- Modify: `src/components/layout/main-menu.tsx`

**Interfaces:**
- Consumes: nothing yet (tab bodies are filled in Tasks 7–8).
- Produces: route `/pdf-export`, nav entry `pdf-export`, and `<PdfExportManager/>` rendering a shadcn `Tabs` with `정책` / `이력` triggers.

- [ ] **Step 1: Create placeholder tab bodies**

Create `src/components/page/pdf-export/PdfExportPolicyTab.tsx`:

```tsx
function PdfExportPolicyTab() {
  return <div className='text-sm text-slate-500'>정책 설정 (준비 중)</div>;
}

export default PdfExportPolicyTab;
```

Create `src/components/page/pdf-export/PdfExportHistoryTab.tsx`:

```tsx
function PdfExportHistoryTab() {
  return <div className='text-sm text-slate-500'>내보내기 이력 (준비 중)</div>;
}

export default PdfExportHistoryTab;
```

- [ ] **Step 2: Create the tabs shell**

Create `src/components/page/pdf-export/PdfExportManager.tsx` (confirm the exact `Tabs` export names in `src/components/ui/tabs.tsx` before writing — the standard shadcn exports are `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`):

```tsx
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import PdfExportHistoryTab from './PdfExportHistoryTab';
import PdfExportPolicyTab from './PdfExportPolicyTab';

function PdfExportManager() {
  return (
    <Tabs defaultValue='history' className='space-y-4'>
      <TabsList>
        <TabsTrigger value='history'>내보내기 이력</TabsTrigger>
        <TabsTrigger value='policy'>정책 설정</TabsTrigger>
      </TabsList>
      <TabsContent value='history'>
        <PdfExportHistoryTab />
      </TabsContent>
      <TabsContent value='policy'>
        <PdfExportPolicyTab />
      </TabsContent>
    </Tabs>
  );
}

export default PdfExportManager;
```

- [ ] **Step 3: Create the page**

Create `src/pages/pdf-export/index.tsx` (mirrors `src/pages/app-version/*.tsx`):

```tsx
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import PdfExportManager from '@/components/page/pdf-export/PdfExportManager';

function PdfExportPage() {
  return (
    <div>
      <PdfExportManager />
    </div>
  );
}

PdfExportPage.getLayout = getDefaultLayout;
PdfExportPage.pageHeader = pageHeader;

export default PdfExportPage;
```

- [ ] **Step 4: Add the nav item**

In `src/components/layout/main-menu.tsx`: add `FileDown` to the `lucide-react` import, and add an entry to `systemMenu` after the `app-version` object:

```tsx
  {
    id: 'pdf-export',
    name: 'PDF 내보내기 관리',
    icon: <FileDown className='w-4 h-4' />,
    link: { path: '/pdf-export' },
  },
```

- [ ] **Step 5: Typecheck + build**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit && pnpm build`
Expected: no errors; `/pdf-export` appears in the build route list.

- [ ] **Step 6: Manual check**

Run `pnpm dev`, log in, confirm the `PDF 내보내기 관리` item shows under 시스템, clicking it opens `/pdf-export` with two working tabs (placeholder text). Then stop the dev server.

- [ ] **Step 7: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/pages/pdf-export/index.tsx src/components/page/pdf-export/ src/components/layout/main-menu.tsx
git commit -m "feat(pdf-export): scaffold admin page, tabs shell, and nav item"
```

---

## Task 7: Policy tab (frontend)

**Files:**
- Modify: `src/components/page/pdf-export/PdfExportPolicyTab.tsx`

**Interfaces:**
- Consumes: `getPdfExportPolicy`, `updatePdfExportPolicy` (Task 5); `PdfExportPolicy`, `UpdatePdfExportPolicyParams` (Task 5).

- [ ] **Step 1: Implement the policy form**

Replace `src/components/page/pdf-export/PdfExportPolicyTab.tsx` with (follows the `AppVersionManager` pattern — React Query + local form + `sonner`):

```tsx
import { getPdfExportPolicy, updatePdfExportPolicy } from '@/client/pdf-export';
import type { UpdatePdfExportPolicyParams } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const EMPTY: UpdatePdfExportPolicyParams = {
  coinPerQuestion: 0,
  maxDownloadCount: 0,
  expiryDays: 0,
};

const FIELDS: { key: keyof UpdatePdfExportPolicyParams; label: string; hint: string }[] = [
  { key: 'coinPerQuestion', label: '질문당 코인', hint: '답변 1개당 차감되는 유료 코인(별)' },
  { key: 'maxDownloadCount', label: '최대 다운로드 횟수', hint: '발급 후 재다운로드 허용 횟수' },
  { key: 'expiryDays', label: '만료일(일)', hint: '발급 후 유효 기간' },
];

function PdfExportPolicyTab() {
  const { data, refetch } = useQuery({ queryKey: ['pdf-export-policy'], queryFn: getPdfExportPolicy });
  const [form, setForm] = useState<UpdatePdfExportPolicyParams>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (data) {
      setForm({
        coinPerQuestion: data.coinPerQuestion,
        maxDownloadCount: data.maxDownloadCount,
        expiryDays: data.expiryDays,
      });
    }
  }, [data]);

  const save = async () => {
    const values = [form.coinPerQuestion, form.maxDownloadCount, form.expiryDays];
    if (values.some((v) => v === undefined || v <= 0 || !Number.isInteger(v))) {
      toast.warning('모든 값은 1 이상의 정수여야 합니다.');
      return;
    }
    setSaving(true);
    try {
      await updatePdfExportPolicy(form);
      await refetch();
      toast.success('PDF 내보내기 정책을 저장했습니다.');
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  return (
    <div className='max-w-xl space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-slate-900'>PDF 내보내기 정책</h3>
        <span className='text-xs text-slate-500'>
          {data?.updatedAt ? `수정: ${new Date(data.updatedAt).toLocaleString('ko-KR')}` : '기본값 적용 중'}
        </span>
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-3'>
        {FIELDS.map((field) => (
          <div key={field.key} className='space-y-1.5'>
            <Label className='text-xs text-slate-600'>{field.label}</Label>
            <Input
              type='text'
              inputMode='numeric'
              value={form[field.key] || ''}
              onChange={(e) =>
                setForm((p) => ({ ...p, [field.key]: Number(e.target.value.replace(/[^\d]/g, '')) }))
              }
            />
            <p className='text-[11px] text-slate-400'>{field.hint}</p>
          </div>
        ))}
      </div>
      <div className='flex justify-end'>
        <Button type='button' onClick={save} disabled={saving}>
          {saving ? <Loader2 className='h-4 w-4 animate-spin' /> : null}
          저장
        </Button>
      </div>
    </div>
  );
}

export default PdfExportPolicyTab;
```

- [ ] **Step 2: Typecheck**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Manual check**

`pnpm dev` → 정책 탭: values load from the API, editing + 저장 shows a success toast, and after refetch the `updatedAt` line updates. Invalid (0/empty) input shows the warning toast. Stop dev.

- [ ] **Step 4: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/pdf-export/PdfExportPolicyTab.tsx
git commit -m "feat(pdf-export): implement policy config tab"
```

---

## Task 8: History tab — search + table + pagination (frontend)

**Files:**
- Create: `src/components/page/pdf-export/PdfExportStatusBadge.tsx`
- Modify: `src/components/page/pdf-export/PdfExportHistoryTab.tsx`

**Interfaces:**
- Consumes: `getPdfExportHistory` (Task 5); `PdfExportRecord`, `PdfExportStatus` (Task 5).
- Produces: `PdfExportStatusBadge` (`{ status: PdfExportStatus }`) and a working history list; row-action wiring lands in Task 9.

- [ ] **Step 1: Create the status badge**

Create `src/components/page/pdf-export/PdfExportStatusBadge.tsx`:

```tsx
import type { PdfExportStatus } from '@/client/types';

const STATUS_META: Record<PdfExportStatus, { label: string; className: string }> = {
  available: { label: '다운로드 가능', className: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20' },
  expired_period: { label: '기간 만료', className: 'bg-slate-100 text-slate-600 ring-slate-500/20' },
  expired_count: { label: '횟수 소진', className: 'bg-amber-50 text-amber-700 ring-amber-600/20' },
};

function PdfExportStatusBadge({ status }: { status: PdfExportStatus }) {
  const meta = STATUS_META[status];
  return (
    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${meta.className}`}>
      {meta.label}
    </span>
  );
}

export default PdfExportStatusBadge;
```

- [ ] **Step 2: Implement the history list**

Replace `src/components/page/pdf-export/PdfExportHistoryTab.tsx` (uses `table.tsx`; the row `액션` column is left as a placeholder cell filled in Task 9):

```tsx
import { getPdfExportHistory } from '@/client/pdf-export';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import PdfExportStatusBadge from './PdfExportStatusBadge';

function PdfExportHistoryTab() {
  const [space, setSpace] = useState('');
  const [user, setUser] = useState('');
  const [applied, setApplied] = useState<{ space: string; user: string }>({ space: '', user: '' });
  const [page, setPage] = useState(1);

  const { data, isFetching } = useQuery({
    queryKey: ['pdf-export-history', page, applied.space, applied.user],
    queryFn: () =>
      getPdfExportHistory({
        page,
        space: applied.space || undefined,
        user: applied.user || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const search = () => {
    setPage(1);
    setApplied({ space: space.trim(), user: user.trim() });
  };

  const items = data?.items ?? [];
  const totalPage = data?.pageInfo.totalPage ?? 0;

  return (
    <div className='space-y-4'>
      <div className='flex flex-wrap items-end gap-2'>
        <div className='space-y-1'>
          <label className='block text-xs text-slate-500'>공간 검색</label>
          <Input
            value={space}
            onChange={(e) => setSpace(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder='공간 이름 또는 spaceId'
            className='w-56'
          />
        </div>
        <div className='space-y-1'>
          <label className='block text-xs text-slate-500'>유저 검색</label>
          <Input
            value={user}
            onChange={(e) => setUser(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && search()}
            placeholder='닉네임 · username · profileId'
            className='w-56'
          />
        </div>
        <Button type='button' onClick={search} disabled={isFetching}>
          검색
        </Button>
      </div>

      <div className='rounded-xl border border-slate-200/80 bg-white'>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>공간</TableHead>
              <TableHead>발급자</TableHead>
              <TableHead>파일명</TableHead>
              <TableHead className='text-right'>범위</TableHead>
              <TableHead className='text-right'>카드수</TableHead>
              <TableHead className='text-right'>비용</TableHead>
              <TableHead className='text-right'>다운로드</TableHead>
              <TableHead>상태</TableHead>
              <TableHead>발급일</TableHead>
              <TableHead>만료일</TableHead>
              <TableHead className='text-right'>액션</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={11} className='py-10 text-center text-sm text-slate-400'>
                  {applied.space || applied.user ? '검색 결과가 없습니다.' : '발급 이력이 없습니다.'}
                </TableCell>
              </TableRow>
            ) : (
              items.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className='font-medium text-slate-900'>{row.spaceName || '(이름 없음)'}</div>
                    <div className='text-[11px] text-slate-400'>{row.spaceId}</div>
                  </TableCell>
                  <TableCell>
                    <div className='text-slate-900'>{row.nickname}</div>
                    <div className='text-[11px] text-slate-400'>{row.username}</div>
                  </TableCell>
                  <TableCell className='max-w-[220px] truncate' title={row.fileName}>
                    {row.fileName}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {row.startOrder}–{row.endOrder}
                  </TableCell>
                  <TableCell className='text-right tabular-nums'>{row.count}</TableCell>
                  <TableCell className='text-right tabular-nums'>{row.cost}</TableCell>
                  <TableCell className='text-right tabular-nums'>
                    {row.downloadCount}/{row.maxDownloadCount}
                  </TableCell>
                  <TableCell>
                    <PdfExportStatusBadge status={row.status} />
                  </TableCell>
                  <TableCell className='text-xs text-slate-500'>
                    {new Date(row.createdAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className='text-xs text-slate-500'>
                    {new Date(row.expiresAt).toLocaleDateString('ko-KR')}
                  </TableCell>
                  <TableCell className='text-right text-xs text-slate-300'>—</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPage > 1 ? (
        <div className='flex items-center justify-center gap-3 text-sm'>
          <Button variant='outline' size='sm' onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}>
            이전
          </Button>
          <span className='tabular-nums text-slate-600'>
            {page} / {totalPage}
          </span>
          <Button
            variant='outline'
            size='sm'
            onClick={() => setPage((p) => Math.min(totalPage, p + 1))}
            disabled={page >= totalPage}
          >
            다음
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default PdfExportHistoryTab;
```

Note: confirm `table.tsx` exports `Table, TableBody, TableCell, TableHead, TableHeader, TableRow` (standard shadcn names) and `button.tsx` supports `variant`/`size` before running; adjust the imports if this repo renamed them.

- [ ] **Step 3: Typecheck + build**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit && pnpm build`
Expected: no errors.

- [ ] **Step 4: Manual check**

`pnpm dev` → 이력 탭: rows load, 공간/유저 검색 filters and resets to page 1, pagination works, empty state distinguishes "검색 결과 없음" vs "발급 이력 없음". Stop dev.

- [ ] **Step 5: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/pdf-export/PdfExportStatusBadge.tsx src/components/page/pdf-export/PdfExportHistoryTab.tsx
git commit -m "feat(pdf-export): implement history list with search and pagination"
```

---

## Task 9: History row actions — download, delete, adjust (frontend)

**Files:**
- Create: `src/components/page/pdf-export/PdfExportRowActions.tsx`
- Create: `src/components/page/pdf-export/PdfExportAdjustDialog.tsx`
- Modify: `src/components/page/pdf-export/PdfExportHistoryTab.tsx` (replace the placeholder `—` action cell; pass a refetch callback)

**Interfaces:**
- Consumes: `getPdfExportAdminDownloadUrl`, `deletePdfExportRecord`, `updatePdfExportRecord` (Task 5); `PdfExportRecord` (Task 5); `alert-dialog.tsx`, `dialog` (confirm exact exports before use).
- Produces: `PdfExportRowActions` (`{ record: PdfExportRecord; onChanged: () => void }`), `PdfExportAdjustDialog`.

- [ ] **Step 1: Create the adjust dialog**

Create `src/components/page/pdf-export/PdfExportAdjustDialog.tsx` (verify `src/components/ui/dialog.tsx` exports `Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter` — standard shadcn — before writing):

```tsx
import { updatePdfExportRecord } from '@/client/pdf-export';
import type { PdfExportRecord } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useState } from 'react';
import { toast } from 'sonner';

type Props = {
  record: PdfExportRecord;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onChanged: () => void;
};

function toDateInput(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10);
}

function PdfExportAdjustDialog({ record, open, onOpenChange, onChanged }: Props) {
  const [downloadCount, setDownloadCount] = useState(String(record.downloadCount));
  const [expiresAt, setExpiresAt] = useState(toDateInput(record.expiresAt));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    const count = Number(downloadCount);
    if (!Number.isInteger(count) || count < 0) {
      toast.warning('다운로드 횟수는 0 이상의 정수여야 합니다.');
      return;
    }
    const parsedExpiry = new Date(`${expiresAt}T23:59:59`);
    if (Number.isNaN(parsedExpiry.getTime())) {
      toast.warning('만료일이 올바르지 않습니다.');
      return;
    }
    setSaving(true);
    try {
      await updatePdfExportRecord(record.id, {
        downloadCount: count,
        expiresAt: parsedExpiry.toISOString(),
      });
      toast.success('레코드를 조정했습니다.');
      onChanged();
      onOpenChange(false);
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>다운로드 횟수 · 만료일 조정</DialogTitle>
        </DialogHeader>
        <div className='space-y-4'>
          <div className='space-y-1.5'>
            <Label className='text-xs text-slate-600'>다운로드 횟수 (최대 {record.maxDownloadCount})</Label>
            <Input
              type='text'
              inputMode='numeric'
              value={downloadCount}
              onChange={(e) => setDownloadCount(e.target.value.replace(/[^\d]/g, ''))}
            />
          </div>
          <div className='space-y-1.5'>
            <Label className='text-xs text-slate-600'>만료일</Label>
            <Input type='date' value={expiresAt} onChange={(e) => setExpiresAt(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant='outline' onClick={() => onOpenChange(false)} disabled={saving}>
            취소
          </Button>
          <Button onClick={save} disabled={saving}>
            저장
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default PdfExportAdjustDialog;
```

- [ ] **Step 2: Create the row actions**

Create `src/components/page/pdf-export/PdfExportRowActions.tsx` (verify `alert-dialog.tsx` exports `AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger` before writing):

```tsx
import { deletePdfExportRecord, getPdfExportAdminDownloadUrl } from '@/client/pdf-export';
import type { PdfExportRecord } from '@/client/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useState } from 'react';
import { toast } from 'sonner';
import PdfExportAdjustDialog from './PdfExportAdjustDialog';

function PdfExportRowActions({ record, onChanged }: { record: PdfExportRecord; onChanged: () => void }) {
  const [downloading, setDownloading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);

  const download = async () => {
    setDownloading(true);
    try {
      const { url } = await getPdfExportAdminDownloadUrl(record.id);
      window.open(url, '_blank', 'noopener,noreferrer');
    } catch (err) {
      toast.error(`${err}`);
    }
    setDownloading(false);
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deletePdfExportRecord(record.id);
      toast.success('레코드를 삭제했습니다.');
      onChanged();
    } catch (err) {
      toast.error(`${err}`);
    }
    setDeleting(false);
  };

  return (
    <div className='flex items-center justify-end gap-1'>
      <Button variant='ghost' size='sm' onClick={download} disabled={downloading}>
        보기
      </Button>
      <Button variant='ghost' size='sm' onClick={() => setAdjustOpen(true)}>
        조정
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant='ghost' size='sm' className='text-rose-600 hover:text-rose-700' disabled={deleting}>
            삭제
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>이 발급 레코드를 삭제할까요?</AlertDialogTitle>
            <AlertDialogDescription>
              DB 레코드와 S3 파일이 함께 삭제되며 되돌릴 수 없습니다. ({record.fileName})
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>취소</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className='bg-rose-600 hover:bg-rose-700'>
              삭제
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <PdfExportAdjustDialog record={record} open={adjustOpen} onOpenChange={setAdjustOpen} onChanged={onChanged} />
    </div>
  );
}

export default PdfExportRowActions;
```

- [ ] **Step 3: Wire the actions into the table**

In `src/components/page/pdf-export/PdfExportHistoryTab.tsx`: import the component and expose a refetch. Change the `useQuery` destructure to include `refetch`:

```tsx
  const { data, isFetching, refetch } = useQuery({
```

Add the import at the top:

```tsx
import PdfExportRowActions from './PdfExportRowActions';
```

Replace the placeholder action cell:

```tsx
                  <TableCell className='text-right text-xs text-slate-300'>—</TableCell>
```

with:

```tsx
                  <TableCell className='text-right'>
                    <PdfExportRowActions record={row} onChanged={() => refetch()} />
                  </TableCell>
```

- [ ] **Step 4: Typecheck + build**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit && pnpm build`
Expected: no errors.

- [ ] **Step 5: Manual check**

`pnpm dev` → 이력 탭 row actions: 보기 opens the PDF in a new tab; 조정 opens the dialog, saves, list refetches with new download/expiry; 삭제 asks for confirmation, then removes the row after refetch. Stop dev.

- [ ] **Step 6: Commit**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/pdf-export/PdfExportRowActions.tsx src/components/page/pdf-export/PdfExportAdjustDialog.tsx src/components/page/pdf-export/PdfExportHistoryTab.tsx
git commit -m "feat(pdf-export): add history row actions (view, adjust, delete)"
```

---

## Self-Review Notes

- **Spec coverage:** §2 policy config → Task 7; §3.1 endpoints → Tasks 2–4; §3.2 services → Tasks 2–4; §3.3 shared status → Task 1; §3.4 query/joins → Task 2; §3.5 validation → Tasks 2–3; §4 frontend structure → Tasks 5–9; §4.3 search/columns/actions → Tasks 8–9; §4.4 nav → Task 6; §5 error handling → Tasks 7–9 (toast + confirm dialogs); §6 testing → backend Jest (Tasks 1–4), frontend typecheck/build/manual (Tasks 5–9); §7 order → backend Tasks 1–4 then frontend Tasks 5–9.
- **Verify-before-write reminders:** shadcn export names (`Tabs`, `Table*`, `Dialog*`, `AlertDialog*`) and `Button` `variant`/`size` support are called out in Tasks 6/8/9 to confirm against this repo's `src/components/ui/*` before writing, since these are copied-in components that can diverge.
- **Type consistency:** `AdminPdfExportRecordDto` (backend) mirrors `PdfExportRecord` (frontend) field-for-field; pagination shape `{ items, totalCount, pageInfo: { totalPage } }` is identical on both sides; `updatePdfExportRecord` returns `PdfExportRecord`.
