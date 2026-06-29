# 유저 실시간 구독 상태 조회 (사이클 2a) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 유저 상세 "구독/권한" 탭에서 버튼 클릭 시 해당 유저의 구독을 Apple/Google 스토어 기준 실시간 조회한다.

**Architecture:** `PremiumService`(이미 `iosClient`+`IAPService`+`config` 의존 보유)에 `getLiveSubscriptionStatus(username)`를 추가해 구독별 라이브 상태를 정규화 반환한다. admin `UserModule`이 `PremiumModule`을 import해 `UserController`에서 `PremiumService`를 주입, `GET /admin/user/:username/subscription-status`로 노출한다. 어드민 탭은 버튼 트리거(자동 호출 없음)로만 호출한다.

**Tech Stack:** NestJS 10 + Nestia, Prisma 5.8, `app-store-server-api`(decodeTransaction/decodeRenewalInfo), `@jeremybarbet/nest-iap`(verifyGoogleReceipt), Jest. 어드민: Next.js, React Query, shadcn/ui.

**Repos:**
- 백엔드: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 어드민: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Constraints:** 스키마 변경 없음. 새 자격증명 없음(기존 iOS `.p8`·Google 서비스계정 재사용). 목록 호출 금지·버튼 단건만(rate limit 회피). 이모지 금지. 푸시는 SSH로 직접.

---

## File Structure

**백엔드 (`mindqna-server`)**
- Modify `src/premium/premium.service.ts` — `LiveSubscriptionStatus`/`LiveSubscriptionRow` 타입 + `getLiveSubscriptionStatus` + iOS/AOS 헬퍼, import에 `decodeRenewalInfo` 추가
- Modify `src/premium/premium.service.spec.ts` — `app-store-server-api` mock에 `decodeRenewalInfo` 추가 + 테스트
- Modify `src/admin/user/user.module.ts` — `PremiumModule` import
- Modify `src/admin/user/user.controller.ts` — `PremiumService` 주입 + 라우트

**어드민 (`mindqna-admin`)**
- Modify `src/client/types.ts` — `LiveSubscriptionStatus`/`LiveSubscriptionRow`
- Modify `src/client/user.ts` — `getUserSubscriptionStatus` fetcher
- Modify `src/components/page/user/components/tabs/UserEntitlementsTab.tsx` — 버튼 트리거 라이브 상태 섹션

---

## Task 1: `getLiveSubscriptionStatus` 서비스 (TDD)

**Files:**
- Modify: `src/premium/premium.service.ts`
- Modify: `src/premium/premium.service.spec.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: spec mock에 `decodeRenewalInfo` 추가**

`src/premium/premium.service.spec.ts`의 `jest.mock('app-store-server-api', () => ({ ... }))` 블록에 `decodeRenewalInfo: jest.fn(),`를 추가하고, 하단 `jest.requireMock('app-store-server-api')` 구조분해에 `decodeRenewalInfo`를 추가한다. 현재(예):
```ts
jest.mock('app-store-server-api', () => ({
  // ...기존 항목
  decodeTransaction: jest.fn(),
}));
```
변경:
```ts
jest.mock('app-store-server-api', () => ({
  // ...기존 항목
  decodeTransaction: jest.fn(),
  decodeRenewalInfo: jest.fn(),
}));
```
그리고:
```ts
const { AppStoreError, decodeTransaction, TransactionType } = jest.requireMock('app-store-server-api') as {
  // ...
  decodeTransaction: jest.Mock;
};
```
변경:
```ts
const { AppStoreError, decodeTransaction, decodeRenewalInfo, TransactionType } = jest.requireMock('app-store-server-api') as {
  AppStoreError: unknown;
  decodeTransaction: jest.Mock;
  decodeRenewalInfo: jest.Mock;
  TransactionType: unknown;
};
```

- [ ] **Step 2: 실패 테스트 추가**

`premium.service.spec.ts`의 최상위 `describe('PremiumService', ...)` 안 적절한 위치(마지막 내부 describe 뒤, 최상위 닫힘 직전)에 추가. `service`는 기존 패턴대로 `new PremiumService(prisma as any, config as any, iap as any, {} as any)`로 생성된 인스턴스를 사용한다(해당 describe의 beforeEach 참고; 없으면 블록 내 beforeEach로 생성).

```ts
  describe('getLiveSubscriptionStatus', () => {
    let svc: PremiumService;

    beforeEach(() => {
      svc = new PremiumService(prisma as any, config as any, iap as any, {} as any);
      iosClientModule.default.getSubscriptionStatuses.mockReset();
      decodeTransaction.mockReset();
      decodeRenewalInfo.mockReset();
      config.get.mockReturnValue('com.prest.mindqna');
    });

    it('maps an active iOS subscription with expiry and auto-renew', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 1, platform: 'IOS', productId: 'premium_month', transactionId: 'tx-ios' },
      ]);
      iosClientModule.default.getSubscriptionStatuses.mockResolvedValue({
        data: [
          {
            lastTransactions: [
              { originalTransactionId: 'tx-ios', status: 1, signedTransactionInfo: 'sig-tx', signedRenewalInfo: 'sig-renew' },
            ],
          },
        ],
      });
      decodeTransaction.mockResolvedValue({ productId: 'premium_month', expiresDate: 1893456000000 });
      decodeRenewalInfo.mockResolvedValue({ autoRenewStatus: 1 });

      const rows = await svc.getLiveSubscriptionStatus('ralph');

      expect(rows).toHaveLength(1);
      expect(rows[0]).toMatchObject({ id: 1, platform: 'IOS', productId: 'premium_month', status: 'active', autoRenew: true });
      expect(rows[0].expiresAt).toBe(new Date(1893456000000).toISOString());
    });

    it('maps a revoked iOS subscription (status 5)', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 2, platform: 'IOS', productId: 'premium_month', transactionId: 'tx-rev' },
      ]);
      iosClientModule.default.getSubscriptionStatuses.mockResolvedValue({
        data: [{ lastTransactions: [{ originalTransactionId: 'tx-rev', status: 5, signedTransactionInfo: 'sig', signedRenewalInfo: null }] }],
      });
      decodeTransaction.mockResolvedValue({ productId: 'premium_month', expiresDate: null });

      const rows = await svc.getLiveSubscriptionStatus('ralph');

      expect(rows[0].status).toBe('revoked');
      expect(rows[0].autoRenew).toBeNull();
    });

    it('maps an active AOS subscription from google receipt', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 3, platform: 'AOS', productId: 'premium_month', transactionId: 'token-aos' },
      ]);
      iap.verifyGoogleReceipt.mockResolvedValue({
        data: { expiryTimeMillis: String(Date.now() + 86400000), autoRenewing: true },
      });

      const rows = await svc.getLiveSubscriptionStatus('ralph');

      expect(rows[0]).toMatchObject({ id: 3, platform: 'AOS', status: 'active', autoRenew: true });
    });

    it('maps an expired AOS subscription', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 4, platform: 'AOS', productId: 'premium_month', transactionId: 'token-old' },
      ]);
      iap.verifyGoogleReceipt.mockResolvedValue({
        data: { expiryTimeMillis: String(Date.now() - 86400000), autoRenewing: false },
      });

      const rows = await svc.getLiveSubscriptionStatus('ralph');

      expect(rows[0].status).toBe('expired');
    });

    it('isolates a per-record store error as status=error', async () => {
      prisma.subscription.findMany.mockResolvedValue([
        { id: 5, platform: 'IOS', productId: 'premium_month', transactionId: 'tx-bad' },
        { id: 6, platform: 'AOS', productId: 'premium_month', transactionId: 'token-ok' },
      ]);
      iosClientModule.default.getSubscriptionStatuses.mockRejectedValue(new Error('store down'));
      iap.verifyGoogleReceipt.mockResolvedValue({
        data: { expiryTimeMillis: String(Date.now() + 86400000), autoRenewing: true },
      });

      const rows = await svc.getLiveSubscriptionStatus('ralph');

      expect(rows.find((r) => r.id === 5)?.status).toBe('error');
      expect(rows.find((r) => r.id === 6)?.status).toBe('active');
    });
  });
```

> 참고: 이 describe가 참조하는 `prisma`, `config`, `iap`, `iosClientModule`, `decodeTransaction`는 파일 상단에 이미 선언된 mock들이다. `prisma`에 `subscription.findMany` mock이 없으면 prisma mock 객체에 `subscription: { findMany: jest.fn() }`를 추가한다(기존 mock 정의 확인 후).

- [ ] **Step 3: 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/premium/premium.service.spec.ts -t getLiveSubscriptionStatus`
Expected: FAIL — `svc.getLiveSubscriptionStatus is not a function`

- [ ] **Step 4: 구현**

`src/premium/premium.service.ts` 상단의 `app-store-server-api` import에 `decodeRenewalInfo`를 추가한다. 현재(예):
```ts
import { decodeTransaction } from 'app-store-server-api';
```
변경:
```ts
import { decodeTransaction, decodeRenewalInfo } from 'app-store-server-api';
```
(이미 다른 항목과 함께 import 중이면 목록에 `decodeRenewalInfo`만 추가)

파일 상단(클래스 밖, import 아래)에 타입을 추가:
```ts
export type LiveSubscriptionStatus =
  | 'active'
  | 'grace'
  | 'billingRetry'
  | 'expired'
  | 'revoked'
  | 'canceled'
  | 'error';

export interface LiveSubscriptionRow {
  id: number;
  platform: 'IOS' | 'AOS';
  productId: string;
  status: LiveSubscriptionStatus;
  expiresAt: string | null;
  autoRenew: boolean | null;
}

const IOS_STATUS_MAP: Record<number, LiveSubscriptionStatus> = {
  1: 'active',
  2: 'expired',
  3: 'billingRetry',
  4: 'grace',
  5: 'revoked',
};
```

`PremiumService` 클래스 안(메서드들 사이 적절한 위치)에 추가:
```ts
  async getLiveSubscriptionStatus(username: string): Promise<LiveSubscriptionRow[]> {
    const subscriptions = await this.prisma.subscription.findMany({
      where: { user: { username } },
    });

    const rows: LiveSubscriptionRow[] = [];
    for (const sub of subscriptions) {
      const platform: 'IOS' | 'AOS' = sub.platform === 'AOS' ? 'AOS' : 'IOS';
      try {
        if (sub.platform === 'IOS') {
          rows.push(await this.resolveIOSLiveStatus(sub.id, sub.transactionId, sub.productId));
        } else if (sub.platform === 'AOS') {
          rows.push(await this.resolveAOSLiveStatus(sub.id, sub.transactionId, sub.productId));
        } else {
          rows.push({ id: sub.id, platform, productId: sub.productId, status: 'error', expiresAt: null, autoRenew: null });
        }
      } catch {
        rows.push({ id: sub.id, platform, productId: sub.productId, status: 'error', expiresAt: null, autoRenew: null });
      }
    }
    return rows;
  }

  private async resolveIOSLiveStatus(id: number, transactionId: string, productId: string): Promise<LiveSubscriptionRow> {
    const { data } = await iosClient.getSubscriptionStatuses(transactionId);
    const target = data.find((item: any) =>
      item.lastTransactions.some((t: any) => t.originalTransactionId === transactionId),
    );
    const last = target?.lastTransactions.find((t: any) => t.originalTransactionId === transactionId);
    if (!last) throw new Error('no matching transaction');

    const tx = await decodeTransaction(last.signedTransactionInfo);
    let autoRenew: boolean | null = null;
    if (last.signedRenewalInfo) {
      const renewal = await decodeRenewalInfo(last.signedRenewalInfo);
      autoRenew = renewal.autoRenewStatus === 1;
    }

    return {
      id,
      platform: 'IOS',
      productId: tx.productId ?? productId,
      status: IOS_STATUS_MAP[last.status] ?? 'error',
      expiresAt: tx.expiresDate ? new Date(tx.expiresDate).toISOString() : null,
      autoRenew,
    };
  }

  private async resolveAOSLiveStatus(id: number, token: string, productId: string): Promise<LiveSubscriptionRow> {
    const res = await this.iap.verifyGoogleReceipt({
      packageName: this.config.get('PACKAGE_NAME')!,
      subscriptionId: productId,
      token,
    });
    const data = res.data as GoogleSubscriptionPurchase;
    if (!data) throw new Error('no google data');

    const expiryMs = parseInt(data.expiryTimeMillis);
    const expired = dayjs(expiryMs).isBefore(dayjs());
    const autoRenew = typeof data.autoRenewing === 'boolean' ? data.autoRenewing : null;
    const canceled = (data as any).cancelReason !== undefined && (data as any).cancelReason !== null;

    let status: LiveSubscriptionStatus;
    if (expired) status = 'expired';
    else if (canceled) status = 'canceled';
    else status = 'active';

    return {
      id,
      platform: 'AOS',
      productId,
      status,
      expiresAt: Number.isFinite(expiryMs) ? new Date(expiryMs).toISOString() : null,
      autoRenew,
    };
  }
```
> `iosClient`, `decodeTransaction`, `dayjs`, `GoogleSubscriptionPurchase`는 `getSubscriptions`에서 이미 import/사용 중이므로 추가 import 불필요(단 `decodeRenewalInfo`는 Step 4 첫 부분에서 추가).

- [ ] **Step 5: 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/premium/premium.service.spec.ts -t getLiveSubscriptionStatus`
Expected: PASS (5 tests)

전체 회귀:
Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/premium/premium.service.spec.ts`
Expected: PASS (기존 + 신규)

- [ ] **Step 6: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/premium/premium.service.ts src/premium/premium.service.spec.ts
git commit -m "feat(premium): add getLiveSubscriptionStatus (normalized iOS/AOS live status)"
```

---

## Task 2: admin 라우트 배선

**Files:**
- Modify: `src/admin/user/user.module.ts`
- Modify: `src/admin/user/user.controller.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: `UserModule`에 `PremiumModule` import**

`src/admin/user/user.module.ts`를 변경:
```ts
import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { PremiumModule } from 'src/premium/premium.module';

@Module({
  imports: [PremiumModule],
  providers: [UserService],
  controllers: [UserController],
})
export class UserModule {}
```

- [ ] **Step 2: 컨트롤러에 `PremiumService` 주입 + 라우트**

`src/admin/user/user.controller.ts` import 추가:
```ts
import { PremiumService } from 'src/premium/premium.service';
```
생성자에 주입(현재 `constructor(private userService: UserService) {}`):
```ts
  constructor(
    private userService: UserService,
    private premiumService: PremiumService,
  ) {}
```
탭 라우트 그룹(예: `getUserPushes` 뒤)에 추가:
```ts
  @TypedRoute.Get(':username/subscription-status')
  async getUserSubscriptionStatus(@TypedParam('username') username: string) {
    return (await this.premiumService.getLiveSubscriptionStatus(username)) as any;
  }
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "admin/user|premium.service|premium.module" ; echo DONE`
Expected: 에러 줄 없음(`DONE`만).

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/user/user.module.ts src/admin/user/user.controller.ts
git commit -m "feat(admin/user): expose GET :username/subscription-status via PremiumService"
```

---

## Task 3: 어드민 타입 + fetcher

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/user.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: 타입 추가**

`src/client/types.ts` 맨 아래에 추가:
```ts
export type LiveSubscriptionStatus =
  | 'active'
  | 'grace'
  | 'billingRetry'
  | 'expired'
  | 'revoked'
  | 'canceled'
  | 'error';

export type LiveSubscriptionRow = {
  id: number;
  platform: 'IOS' | 'AOS';
  productId: string;
  status: LiveSubscriptionStatus;
  expiresAt: string | null;
  autoRenew: boolean | null;
};
```

- [ ] **Step 2: fetcher 추가**

`src/client/user.ts` import에 `LiveSubscriptionRow`를 추가하고(기존 types import 블록), 파일 맨 아래에 추가:
```ts
export async function getUserSubscriptionStatus(username: string) {
  const res = await client.get<LiveSubscriptionRow[]>(`/user/${username}/subscription-status`);

  return res.data;
}
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "client/user|client/types" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts src/client/user.ts
git commit -m "feat(user): add live subscription status fetcher and types"
```

---

## Task 4: `UserEntitlementsTab` 버튼 트리거 라이브 섹션

**Files:**
- Modify: `src/components/page/user/components/tabs/UserEntitlementsTab.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: import + 라이브 상태 UI 추가**

`UserEntitlementsTab.tsx` 상단 import에 추가:
```ts
import { getUserEntitlements, getUserSubscriptionStatus } from '@/client/user';
import type { LiveSubscriptionRow, LiveSubscriptionStatus, UserEntitlementTicket } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Loader2, RefreshCw } from 'lucide-react';
```
(기존 `import { getUserEntitlements } from '@/client/user';`와 `import type { UserEntitlementTicket } ...`, `import { Loader2 } ...`는 위 형태로 합쳐 교체. `Badge`/`Card`/`cn`/`dayjs`/`useQuery`/`Section`/`EntitlementRow`/`isLive` 등 기존 항목은 유지.)

`UserEntitlementsTab` 컴포넌트 함수 본문 안, 기존 `useQuery(...)` 아래에 라이브 조회용 쿼리(자동 실행 안 함)를 추가:
```ts
  const live = useQuery({
    queryKey: ['user-subscription-status', username],
    queryFn: () => getUserSubscriptionStatus(username),
    enabled: false,
  });
```

상태→라벨/배지 매핑 헬퍼를 컴포넌트 파일 상단(다른 함수 옆)에 추가:
```ts
const LIVE_STATUS_META: Record<LiveSubscriptionStatus, { label: string; variant: 'softSuccess' | 'softWarning' | 'softNeutral' | 'softDanger' }> = {
  active: { label: '활성', variant: 'softSuccess' },
  grace: { label: '결제유예', variant: 'softWarning' },
  billingRetry: { label: '결제재시도', variant: 'softWarning' },
  expired: { label: '만료', variant: 'softNeutral' },
  revoked: { label: '환불/취소', variant: 'softNeutral' },
  canceled: { label: '자동갱신 해지', variant: 'softNeutral' },
  error: { label: '조회 실패', variant: 'softDanger' },
};
```

- [ ] **Step 2: 렌더에 라이브 섹션 삽입**

기존 caveat 박스(사이클 1의 `<div className='rounded-lg border border-slate-200 bg-slate-50 ...'>구독 레코드는 DB 보유 정보입니다...</div>`)를 아래 블록으로 **교체**한다:

```tsx
      <div className='space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3'>
        <div className='flex items-center justify-between gap-2'>
          <div className='text-xs text-slate-500'>
            평상시 상태는 5분 주기 동기화 값입니다. 최신 스토어 상태는 버튼으로 확인하세요.
          </div>
          <Button type='button' variant='outline' size='sm' onClick={() => live.refetch()} disabled={live.isFetching}>
            {live.isFetching ? <Loader2 className='mr-1 h-3.5 w-3.5 animate-spin' /> : <RefreshCw className='mr-1 h-3.5 w-3.5' />}
            스토어 실시간 확인
          </Button>
        </div>
        {live.isError ? <div className='text-xs text-rose-600'>실시간 조회에 실패했습니다.</div> : null}
        {live.data ? (
          live.data.length === 0 ? (
            <div className='text-xs text-slate-500'>구독 레코드가 없습니다.</div>
          ) : (
            <div className='space-y-2'>
              {live.data.map((row: LiveSubscriptionRow) => {
                const meta = LIVE_STATUS_META[row.status];
                return (
                  <div
                    key={`${row.platform}-${row.id}`}
                    className='flex items-center gap-3 rounded-lg border border-slate-200/80 bg-white px-3 py-2 shadow-sm'
                  >
                    <Badge variant='softNeutral' className='w-12 shrink-0 justify-center uppercase'>
                      {row.platform}
                    </Badge>
                    <div className='min-w-0 flex-1'>
                      <div className='truncate text-sm font-medium text-slate-900'>{row.productId}</div>
                      <div className='truncate text-[11px] text-slate-500'>
                        {row.expiresAt ? `만료 ${dayjs(row.expiresAt).format('YYYY.MM.DD')}` : '만료 정보 없음'}
                        {row.autoRenew === null ? '' : row.autoRenew ? ' · 자동갱신 ON' : ' · 자동갱신 OFF'}
                      </div>
                    </div>
                    <Badge variant={meta.variant} className='shrink-0'>
                      {meta.label}
                    </Badge>
                  </div>
                );
              })}
            </div>
          )
        ) : null}
      </div>
```

> 기존 DB 엔타이틀먼트 섹션(프리미엄/골드클럽/구독 이력 `<Section>`들)은 이 블록 아래에 그대로 유지한다.

- [ ] **Step 3: 타입체크 + 빌드**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "UserEntitlementsTab" ; echo TSC_DONE`
Expected: 에러 줄 없음.

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && pnpm build 2>&1 | grep -iE "Compiled|Failed|error|/user/list"`
Expected: `Compiled successfully` + `/user/list` 라인.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/user/components/tabs/UserEntitlementsTab.tsx
git commit -m "feat(user): button-triggered live store subscription status in entitlements tab"
```

---

## 최종 검증 (수동)

- [ ] 유저 목록 → 어떤 스토어 호출도 발생하지 않음(네트워크 확인)
- [ ] 유저 상세 → 구독/권한 탭 진입만으로도 스토어 호출 없음(DB 섹션만 즉시 표시)
- [ ] "스토어 실시간 확인" 버튼 클릭 시에만 호출 → iOS/AOS 구독별 상태 배지(활성/유예/만료/환불·취소/조회실패) + 만료일 + 자동갱신 표시
- [ ] 한 구독 조회 실패해도 다른 구독은 정상 표시(에러 격리)
- [ ] 구독 없는 유저 → "구독 레코드가 없습니다"
- [ ] 다른 유저로 바꾸면 라이브 결과는 새 쿼리키라 이전 결과 안 섞임

> 푸시는 SSH로 직접. 스키마/환경변수 변경 없음.
