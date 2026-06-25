# 앱 강제 업데이트 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax.

**Goal:** 앱 버전 정책(플랫폼별 최소/최신 버전·강제 여부)을 어드민에서 재배포 없이 제어하고, `/core/check`가 이를 내려주도록 한다.

**Architecture:** `AppVersionPolicy` 테이블(수동 생성 완료)을 Prisma 모델로 추가(`prisma generate`만, migrate 미사용). `CoreService`가 정책을 읽어 `/core/check`에 `policies.{ios,android}`로 노출(env 폴백). 어드민 `AppVersionModule`이 조회/수정 API 제공, 프론트는 `/app-version` 페이지로 편집. 판정(강제/권장)은 앱이 수행.

**Tech Stack:** NestJS 10 + Nestia + Prisma 5.8(MySQL), Jest; Next 13 + React Query + shadcn/ui.

**Repos:** 백엔드 `/Users/gargoyle92/Documents/backend/mindqna-server`, 프론트 `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**전제:** `AppVersionPolicy` 테이블 + ios/android 2행은 이미 DB에 생성됨. 본 계획은 `prisma migrate`를 사용하지 않는다(배포 파이프라인에 migrate 없음).

---

## File Structure
- 백엔드
  - Modify `prisma/schema.prisma` — `AppPlatform` enum + `AppVersionPolicy` 모델.
  - Modify `src/core/core.service.ts` — `getVersionPolicies()`.
  - Modify `src/core/core.controller.ts` — `/check` 확장.
  - Create `src/core/core.service.spec.ts` — getVersionPolicies 테스트.
  - Create `src/admin/app-version/{app-version.service.ts, app-version.controller.ts, app-version.module.ts, app-version.interface.ts, app-version.service.spec.ts}`.
  - Modify `src/admin/admin.module.ts` — `AppVersionModule` 등록.
- 프론트
  - Modify `src/client/types.ts` — 타입.
  - Create `src/client/app-version.ts` — fetch 함수.
  - Create `src/components/page/app-version/AppVersionManager.tsx` — 편집 UI.
  - Create `src/pages/app-version/index.tsx` — 페이지.
  - Modify `src/components/layout/main-menu.tsx` — 메뉴 등록.

---

## Task 1: Prisma 모델 추가 (migrate 없이)

**Files:** Modify `/Users/gargoyle92/Documents/backend/mindqna-server/prisma/schema.prisma`

- [ ] **Step 1: enum + 모델 추가** — schema.prisma 끝에 추가:

```prisma
enum AppPlatform {
  ios
  android
}

model AppVersionPolicy {
  platform          AppPlatform @id
  minVersionCode    Int
  minVersionName    String
  latestVersionCode Int
  latestVersionName String
  forceEnabled      Boolean     @default(true)
  updatedAt         DateTime    @updatedAt
}
```

- [ ] **Step 2: 클라이언트 생성 (DB 미접촉)**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx prisma generate`
Expected: `Generated Prisma Client` 성공. (migrate 실행 금지)

- [ ] **Step 3: 스키마 유효성 + 빌드로 타입 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx prisma validate && yarn build`
Expected: schema valid + 빌드 성공(`prisma.appVersionPolicy` 타입 존재).

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add prisma/schema.prisma
git commit -m "feat(prisma): add AppVersionPolicy model (table pre-created, generate only)"
```

## Task 2: CoreService.getVersionPolicies + /core/check 확장

**Files:** Modify `src/core/core.service.ts`, `src/core/core.controller.ts`; Create `src/core/core.service.spec.ts`

- [ ] **Step 1: 실패 테스트 작성** — `src/core/core.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

const { PrismaService } = jest.requireMock('src/prisma/prisma.service') as { PrismaService: new (...args: any[]) => unknown };
const { CoreService } = require('./core.service') as {
  CoreService: new (...args: any[]) => { getVersionPolicies: () => Promise<any> };
};

function createPrismaMock() {
  return { appVersionPolicy: { findMany: jest.fn() } };
}

describe('CoreService.getVersionPolicies', () => {
  let service: { getVersionPolicies: () => Promise<any> };
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [CoreService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(CoreService);
  });

  afterEach(() => jest.clearAllMocks());

  it('maps db rows into ios/android policy map', async () => {
    prisma.appVersionPolicy.findMany.mockResolvedValue([
      { platform: 'ios', minVersionCode: 240, minVersionName: '1.3.0', latestVersionCode: 243, latestVersionName: '1.3.13', forceEnabled: true, updatedAt: new Date() },
      { platform: 'android', minVersionCode: 200, minVersionName: '1.2.0', latestVersionCode: 243, latestVersionName: '1.3.13', forceEnabled: false, updatedAt: new Date() },
    ]);

    const result = await service.getVersionPolicies();

    expect(result.ios).toEqual({ minVersionCode: 240, minVersionName: '1.3.0', latestVersionCode: 243, latestVersionName: '1.3.13', forceEnabled: true });
    expect(result.android.forceEnabled).toBe(false);
  });

  it('falls back to env when a platform row is missing', async () => {
    process.env.APP_VERSION_CODE = '243';
    process.env.APP_VERSION_NAME = '1.3.13';
    process.env.APP_UPDATE_ENABLED = 'true';
    prisma.appVersionPolicy.findMany.mockResolvedValue([]);

    const result = await service.getVersionPolicies();

    expect(result.ios).toEqual({ minVersionCode: 243, minVersionName: '1.3.13', latestVersionCode: 243, latestVersionName: '1.3.13', forceEnabled: true });
    expect(result.android).toEqual(result.ios);
  });
});
```

- [ ] **Step 2: 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/core/core.service.spec.ts`
Expected: FAIL — `service.getVersionPolicies is not a function`.

- [ ] **Step 3: getVersionPolicies 구현** — `core.service.ts`의 클래스에 메서드 추가(`createClientLog` 뒤):

```typescript
  async getVersionPolicies() {
    const rows = await this.prisma.appVersionPolicy.findMany();
    const fallback = {
      minVersionCode: Number(process.env.APP_VERSION_CODE ?? 0),
      minVersionName: process.env.APP_VERSION_NAME ?? '0.0.0',
      latestVersionCode: Number(process.env.APP_VERSION_CODE ?? 0),
      latestVersionName: process.env.APP_VERSION_NAME ?? '0.0.0',
      forceEnabled: process.env.APP_UPDATE_ENABLED === 'true',
    };
    const pick = (platform: 'ios' | 'android') => {
      const row = rows.find((r) => r.platform === platform);
      if (!row) return fallback;
      return {
        minVersionCode: row.minVersionCode,
        minVersionName: row.minVersionName,
        latestVersionCode: row.latestVersionCode,
        latestVersionName: row.latestVersionName,
        forceEnabled: row.forceEnabled,
      };
    };
    return { ios: pick('ios'), android: pick('android') };
  }
```

- [ ] **Step 4: 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && yarn test src/core/core.service.spec.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: /core/check 확장** — `core.controller.ts`의 `getCheck` 교체:

```typescript
  @TypedRoute.Get('/check')
  async getCheck(): Promise<{
    version: string;
    isEnableUpdate: boolean;
    policies: {
      ios: { minVersionCode: number; minVersionName: string; latestVersionCode: number; latestVersionName: string; forceEnabled: boolean };
      android: { minVersionCode: number; minVersionName: string; latestVersionCode: number; latestVersionName: string; forceEnabled: boolean };
    };
  }> {
    const APP_VERSION_NAME = process.env.APP_VERSION_NAME!;
    const APP_UPDATE_ENABLED = process.env.APP_UPDATE_ENABLED === 'true';
    const policies = await this.coreService.getVersionPolicies();

    return { version: APP_VERSION_NAME, isEnableUpdate: APP_UPDATE_ENABLED, policies };
  }
```

- [ ] **Step 6: 빌드 확인** — Run: `yarn build` → 성공.

- [ ] **Step 7: 커밋**

```bash
git add src/core/core.service.ts src/core/core.controller.ts src/core/core.service.spec.ts
git commit -m "feat(core): expose per-platform version policies in /core/check (env fallback)"
```

## Task 3: 어드민 AppVersion API

**Files:** Create `src/admin/app-version/app-version.interface.ts`, `app-version.service.ts`, `app-version.controller.ts`, `app-version.module.ts`, `app-version.service.spec.ts`; Modify `src/admin/admin.module.ts`

- [ ] **Step 1: interface 작성** — `src/admin/app-version/app-version.interface.ts`:

```typescript
export interface UpdateAppVersionParams {
  minVersionCode: number;
  minVersionName: string;
  latestVersionCode: number;
  latestVersionName: string;
  forceEnabled: boolean;
}
```

- [ ] **Step 2: 실패 테스트 작성** — `src/admin/app-version/app-version.service.spec.ts`:

```typescript
import { Test, TestingModule } from '@nestjs/testing';

jest.mock('src/prisma/prisma.service', () => ({ PrismaService: class PrismaService {} }), { virtual: true });

const { PrismaService } = jest.requireMock('src/prisma/prisma.service') as { PrismaService: new (...args: any[]) => unknown };
const { AppVersionService } = require('./app-version.service') as {
  AppVersionService: new (...args: any[]) => {
    getPolicies: () => Promise<any>;
    updatePolicy: (platform: 'ios' | 'android', body: any) => Promise<any>;
  };
};

function createPrismaMock() {
  return { appVersionPolicy: { findMany: jest.fn(), upsert: jest.fn() } };
}

describe('AppVersionService', () => {
  let service: InstanceType<typeof AppVersionService>;
  let prisma: ReturnType<typeof createPrismaMock>;

  beforeEach(async () => {
    prisma = createPrismaMock();
    const moduleRef: TestingModule = await Test.createTestingModule({
      providers: [AppVersionService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    service = moduleRef.get(AppVersionService);
  });

  afterEach(() => jest.clearAllMocks());

  it('returns ios/android policies (null when missing)', async () => {
    const ios = { platform: 'ios', minVersionCode: 240, minVersionName: '1.3.0', latestVersionCode: 243, latestVersionName: '1.3.13', forceEnabled: true, updatedAt: new Date() };
    prisma.appVersionPolicy.findMany.mockResolvedValue([ios]);

    const result = await service.getPolicies();

    expect(result.ios).toEqual(ios);
    expect(result.android).toBeNull();
  });

  it('upserts a platform policy', async () => {
    const body = { minVersionCode: 245, minVersionName: '1.4.0', latestVersionCode: 245, latestVersionName: '1.4.0', forceEnabled: true };
    prisma.appVersionPolicy.upsert.mockResolvedValue({ platform: 'android', ...body });

    await service.updatePolicy('android', body);

    expect(prisma.appVersionPolicy.upsert).toHaveBeenCalledWith({
      where: { platform: 'android' },
      create: { platform: 'android', ...body },
      update: body,
    });
  });
});
```

- [ ] **Step 3: 실패 확인** — Run: `yarn test src/admin/app-version/app-version.service.spec.ts` → FAIL (module not found).

- [ ] **Step 4: service 구현** — `src/admin/app-version/app-version.service.ts`:

```typescript
import { Injectable } from '@nestjs/common';
import { AppPlatform } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { UpdateAppVersionParams } from './app-version.interface';

@Injectable()
export class AppVersionService {
  constructor(private readonly prisma: PrismaService) {}

  async getPolicies() {
    const rows = await this.prisma.appVersionPolicy.findMany();
    const find = (platform: AppPlatform) => rows.find((r) => r.platform === platform) ?? null;
    return { ios: find('ios'), android: find('android') };
  }

  async updatePolicy(platform: AppPlatform, body: UpdateAppVersionParams) {
    return this.prisma.appVersionPolicy.upsert({
      where: { platform },
      create: { platform, ...body },
      update: body,
    });
  }
}
```

- [ ] **Step 5: 통과 확인** — Run: `yarn test src/admin/app-version/app-version.service.spec.ts` → PASS.

- [ ] **Step 6: controller 작성** — `src/admin/app-version/app-version.controller.ts`:

```typescript
import { TypedBody, TypedParam, TypedRoute } from '@nestia/core';
import { Controller, UseGuards } from '@nestjs/common';
import { AppPlatform } from '@prisma/client';
import { AdminGuard } from '../admin.guard';
import { AppVersionService } from './app-version.service';
import { UpdateAppVersionParams } from './app-version.interface';

@Controller('admin/app-version')
@UseGuards(AdminGuard)
export class AppVersionController {
  constructor(private readonly appVersionService: AppVersionService) {}

  @TypedRoute.Get()
  async getPolicies() {
    return (await this.appVersionService.getPolicies()) as any;
  }

  @TypedRoute.Patch(':platform')
  async updatePolicy(@TypedParam('platform') platform: AppPlatform, @TypedBody() body: UpdateAppVersionParams) {
    return (await this.appVersionService.updatePolicy(platform, body)) as any;
  }
}
```

- [ ] **Step 7: module 작성** — `src/admin/app-version/app-version.module.ts`:

```typescript
import { Module } from '@nestjs/common';
import { AppVersionController } from './app-version.controller';
import { AppVersionService } from './app-version.service';

@Module({
  providers: [AppVersionService],
  controllers: [AppVersionController],
})
export class AppVersionModule {}
```

- [ ] **Step 8: admin.module 등록** — `src/admin/admin.module.ts`의 import 추가 + `imports` 배열에 `AppVersionModule` 추가:

```typescript
import { AppVersionModule } from './app-version/app-version.module';
```
그리고 `imports: [AuthModule, InteriorModule, UserModule, SpaceModule, PetModule, AppVersionModule],`

- [ ] **Step 9: 빌드 확인** — Run: `yarn build` → 성공(AdminGuard 경로·TypedParam enum 컴파일).

- [ ] **Step 10: 커밋**

```bash
git add src/admin/app-version src/admin/admin.module.ts
git commit -m "feat(admin/app-version): add GET/PATCH /admin/app-version policy endpoints"
```

## Task 4: 프론트 타입 + client

**Files:** Modify `/Users/gargoyle92/Documents/frontend/mindqna-admin/src/client/types.ts`; Create `src/client/app-version.ts`

- [ ] **Step 1: 타입 추가** — `types.ts` 끝에:

```typescript
export type AppPlatform = 'ios' | 'android';

export type AppVersionPolicy = {
  platform: AppPlatform;
  minVersionCode: number;
  minVersionName: string;
  latestVersionCode: number;
  latestVersionName: string;
  forceEnabled: boolean;
  updatedAt: string;
};

export type AppVersionPolicies = { ios: AppVersionPolicy | null; android: AppVersionPolicy | null };

export type UpdateAppVersionParams = Omit<AppVersionPolicy, 'platform' | 'updatedAt'>;
```

- [ ] **Step 2: client 작성** — `src/client/app-version.ts`:

```typescript
import client from './@base';
import { AppPlatform, AppVersionPolicies, AppVersionPolicy, UpdateAppVersionParams } from './types';

export async function getAppVersionPolicies() {
  const res = await client.get<AppVersionPolicies>('/app-version');

  return res.data;
}

export async function updateAppVersionPolicy(platform: AppPlatform, body: UpdateAppVersionParams) {
  const res = await client.patch<AppVersionPolicy>(`/app-version/${platform}`, body);

  return res.data;
}
```
> `@base` client의 baseURL이 이미 `.../admin`이라 경로는 `/app-version` → 실제 `/admin/app-version`.

- [ ] **Step 3: 타입체크** — Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit -p tsconfig.json` → 0 errors.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts src/client/app-version.ts
git commit -m "feat(app-version): add client types and fetchers"
```

## Task 5: 프론트 페이지 + 폼 + 메뉴

**Files:** Create `src/components/page/app-version/AppVersionManager.tsx`, `src/pages/app-version/index.tsx`; Modify `src/components/layout/main-menu.tsx`

- [ ] **Step 1: 편집 컴포넌트 작성** — `src/components/page/app-version/AppVersionManager.tsx` (플랫폼 카드 2개, 로드/저장):

```tsx
import { getAppVersionPolicies, updateAppVersionPolicy } from '@/client/app-version';
import type { AppPlatform, UpdateAppVersionParams } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useQuery } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const PLATFORMS: { key: AppPlatform; label: string }[] = [
  { key: 'ios', label: 'iOS' },
  { key: 'android', label: 'Android' },
];

const EMPTY: UpdateAppVersionParams = {
  minVersionCode: 0,
  minVersionName: '',
  latestVersionCode: 0,
  latestVersionName: '',
  forceEnabled: true,
};

function PlatformCard({ platform, label }: { platform: AppPlatform; label: string }) {
  const { data, refetch } = useQuery({
    queryKey: ['app-version'],
    queryFn: getAppVersionPolicies,
  });
  const [form, setForm] = useState<UpdateAppVersionParams>(EMPTY);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const row = data?.[platform];
    if (row) {
      setForm({
        minVersionCode: row.minVersionCode,
        minVersionName: row.minVersionName,
        latestVersionCode: row.latestVersionCode,
        latestVersionName: row.latestVersionName,
        forceEnabled: row.forceEnabled,
      });
    }
  }, [data, platform]);

  const save = async () => {
    if (form.minVersionCode <= 0 || form.latestVersionCode <= 0 || !form.minVersionName.trim() || !form.latestVersionName.trim()) {
      toast.warning('버전 코드는 양수, 버전 이름은 필수입니다.');
      return;
    }
    setSaving(true);
    try {
      await updateAppVersionPolicy(platform, form);
      await refetch();
      toast.success(`${label} 버전 정책을 저장했습니다.`);
    } catch (err) {
      toast.error(`${err}`);
    }
    setSaving(false);
  };

  const numField = (key: 'minVersionCode' | 'latestVersionCode') => (
    <Input
      type='text'
      inputMode='numeric'
      value={form[key] || ''}
      onChange={(e) => setForm((p) => ({ ...p, [key]: Number(e.target.value.replace(/[^\d]/g, '')) }))}
    />
  );
  const textField = (key: 'minVersionName' | 'latestVersionName') => (
    <Input value={form[key]} onChange={(e) => setForm((p) => ({ ...p, [key]: e.target.value }))} placeholder='예: 1.3.13' />
  );

  return (
    <div className='space-y-4 rounded-xl border border-slate-200/80 bg-white p-5 shadow-sm'>
      <div className='flex items-center justify-between'>
        <h3 className='text-base font-semibold text-slate-900'>{label}</h3>
        <div className='flex items-center gap-2'>
          <Label htmlFor={`force-${platform}`} className='text-sm text-slate-600'>강제 업데이트</Label>
          <Switch
            id={`force-${platform}`}
            checked={form.forceEnabled}
            onCheckedChange={(v) => setForm((p) => ({ ...p, forceEnabled: v }))}
          />
        </div>
      </div>
      <div className='grid grid-cols-2 gap-4'>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최소 버전 코드 (미만=강제)</Label>
          {numField('minVersionCode')}
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최소 버전 이름</Label>
          {textField('minVersionName')}
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최신 버전 코드 (미만=권장)</Label>
          {numField('latestVersionCode')}
        </div>
        <div className='space-y-1.5'>
          <Label className='text-xs text-slate-500'>최신 버전 이름</Label>
          {textField('latestVersionName')}
        </div>
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

function AppVersionManager() {
  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-2'>
      {PLATFORMS.map((p) => (
        <PlatformCard key={p.key} platform={p.key} label={p.label} />
      ))}
    </div>
  );
}

export default AppVersionManager;
```
> 의존: shadcn `Switch`가 `src/components/ui/switch.tsx`에 있는지 Step 2에서 확인. 없으면 `npx shadcn-ui@latest add switch` 또는 RadioGroup(on/off)로 대체.

- [ ] **Step 2: Switch 컴포넌트 존재 확인**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && ls src/components/ui/switch.tsx`
Expected: 파일 존재. 없으면 `npx shadcn-ui@latest add switch` 실행(또는 `forceEnabled`를 RadioGroup '강제/선택'으로 대체하고 import 교체).

- [ ] **Step 3: 페이지 작성** — `src/pages/app-version/index.tsx`:

```tsx
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import AppVersionManager from '@/components/page/app-version/AppVersionManager';

function AppVersionPage() {
  return (
    <div>
      <AppVersionManager />
    </div>
  );
}

AppVersionPage.getLayout = getDefaultLayout;
AppVersionPage.pageHeader = pageHeader;

export default AppVersionPage;
```

- [ ] **Step 4: 메뉴 등록** — `src/components/layout/main-menu.tsx`:
  1. import에 `Smartphone` 추가: `import { BookOpen, Component, Folders, Gamepad2Icon, LucideLayoutGrid, MegaphoneIcon, ShoppingCartIcon, Smartphone, UsersIcon } from 'lucide-react';`
  2. `systemMenu` 배열에 항목 추가:

```tsx
  {
    id: 'app-version',
    name: '앱 버전 관리',
    icon: <Smartphone className='w-4 h-4' />,
    link: { path: '/app-version' },
  },
```

- [ ] **Step 5: 타입체크 + 린트 + 빌드**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit -p tsconfig.json && yarn lint && yarn build`
Expected: tsc 0 errors, lint 신규 파일 무경고, next build 성공.

- [ ] **Step 6: 수동 확인** — `yarn dev` 후 `/app-version` 접속 → iOS/Android 카드에 현재 값 로드, 수정·저장 시 토스트 + 값 유지(새로고침해도 DB 반영).

- [ ] **Step 7: 커밋**

```bash
git add src/components/page/app-version/AppVersionManager.tsx src/pages/app-version/index.tsx src/components/layout/main-menu.tsx
git commit -m "feat(app-version): add admin page to manage per-platform version policy"
```

---

## 최종 검증
- [ ] 백엔드: `yarn test src/core/core.service.spec.ts src/admin/app-version/app-version.service.spec.ts` 전부 PASS, `yarn build` 성공.
- [ ] 프론트: `npx tsc --noEmit` 0 errors, `yarn lint` 무경고, `yarn build` 성공.
- [ ] 수동: `GET /admin/app-version` 200(2 플랫폼), `PATCH /admin/app-version/ios` 반영, `GET /core/check` 응답에 `policies.{ios,android}` 포함.

## 비범위
- `prisma migrate` 미사용(테이블 수동 생성). `prisma generate`만.
- 스토어 URL·팝업 문구·차단 화면은 앱 레포 소관.
- `VersionInterceptor`는 그대로 둔다.
