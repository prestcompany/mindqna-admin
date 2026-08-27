# 푸시 대상 필터 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 공간 유형·공간 언어·질문 개수·펫 레벨로 푸시 대상을 좁혀 캠페인을 보낼 수 있게 한다.

**Architecture:** 조건을 저장 시점에 한 번 해석해 사용자 이름 목록을 얻고, 1,000명씩 나눠 `AdminPush` 행 여러 개로 저장한다. 같은 `groupId`로 묶여 목록에서 한 줄로 접히고 취소가 그룹 전체에 걸린다. 발송기는 각 행을 평범한 개인 발송으로 처리하므로 변경이 없다.

**Tech Stack:** NestJS 10 · Prisma/MySQL · nestia (서버) / Next.js 13 pages · TanStack Query v5 · shadcn (어드민)

**Spec:** `docs/superpowers/specs/2026-08-26-push-target-filter-design.md`

## 이 계획이 보통과 다른 점

**코드는 이미 쓰여 있고 검증되지 않았다.** 서버 `a3ab3c9`, 어드민 `510d7f8`. 타입·린트·빌드·단위 테스트는 통과했지만 **DDL이 적용되지 않아 한 번도 실행된 적이 없고, 화면도 본 적이 없다.**

그래서 이 계획은 만드는 계획이 아니라 **확인하는 계획**이다. 각 태스크는 "돌려보고, 드러난 것을 고친다". 확인이 아무것도 드러내지 않으면 그 태스크는 커밋 없이 끝나며, 그것도 정상이다.

## Global Constraints

- DDL은 **사람이 수기로 적용한다.** 계획의 어떤 단계도 `prisma migrate`, `prisma db push`, `ALTER TABLE`을 실행하지 않는다.
- dev DB에 대한 **쓰기 금지.** 조회·`EXPLAIN`은 허용. 캠페인 저장 테스트는 어드민 UI를 통해서만 하고, 저장한 캠페인은 즉시 취소한다.
- 실제 푸시를 **발송하지 않는다.** 저장한 캠페인은 예약으로 만들고 검증 후 취소한다. 즉시 발송으로 저장하면 1분 내에 실제 기기로 나간다.
- 서버 테스트: `npx jest <path>`. 어드민 테스트: `npx tsx --test <path>`.
- 게이트: 서버는 `npx tsc --noEmit -p tsconfig.json` + `npx jest src/admin/push src/fcm`. 어드민은 `npx tsc --noEmit` + `pnpm lint` + `pnpm build`.
- 어드민 브랜치 `feat/push-target-filter`, 서버 브랜치 `feat/push-target-filter`.

## File Structure

| 파일 | 책임 | 상태 |
|---|---|---|
| `server: src/admin/push/push-target-filter.ts` | 조건 → SQL, 분할 | 작성됨, 미실행 |
| `server: src/admin/push/push.service.ts` | 해석·분할 저장, 그룹 취소 | 작성됨, 미실행 |
| `server: src/admin/admin.controller.ts` | `preview-targets`, 배열 반환 | 작성됨, 미실행 |
| `admin: src/components/page/push/PushTargetFilterPanel.tsx` | 조건 입력 | 작성됨, 미확인 |
| `admin: src/components/page/push/services/push-grouping.ts` | 목록 접기 | 작성됨, 미확인 |
| `admin: src/components/page/push/PushList.tsx` | 접힌 목록 렌더 | 작성됨, 미확인 |

---

### Task 1: DDL 적용과 스키마 정합 확인

DDL이 없으면 Prisma 클라이언트가 `groupId`를 기대하는데 컬럼이 없어 **모든 `AdminPush` 쿼리가 실패한다.** 푸시 목록조차 열리지 않는다. 그러니 이것이 첫 번째다.

**Files:**
- 실행 없음. 확인만.

**Interfaces:**
- Produces: `AdminPush.groupId` 컬럼과 인덱스 두 개가 dev DB에 존재.

- [x] **Step 1: 사용자에게 DDL을 전달하고 적용을 기다린다**

아래를 그대로 전달한다. 직접 실행하지 않는다.

```sql
ALTER TABLE `AdminPush`
  ADD COLUMN `groupId` VARCHAR(191) NULL COMMENT '같은 조건으로 쪼개진 발송 묶음';

CREATE INDEX `idx_adminpush_group` ON `AdminPush` (`groupId`);
CREATE INDEX `idx_spaceinfo_type_locale` ON `SpaceInfo` (`type`, `locale`);
```

- [x] **Step 2: 컬럼이 실제로 생겼는지 확인**

`~/Documents/backend/mindqna-server`에서 임시 스크립트로 확인한다.

```ts
// probe.ts — 확인 후 삭제
import { PrismaClient, Prisma } from '@prisma/client';
const prisma = new PrismaClient();
(async () => {
  const cols = await prisma.$queryRaw<any[]>(Prisma.sql`SHOW COLUMNS FROM \`AdminPush\` LIKE 'groupId'`);
  const idx = await prisma.$queryRaw<any[]>(Prisma.sql`SHOW INDEX FROM \`SpaceInfo\` WHERE Key_name = 'idx_spaceinfo_type_locale'`);
  console.log('groupId column:', cols.length === 1 ? 'OK' : 'MISSING');
  console.log('spaceinfo index:', idx.length > 0 ? 'OK' : 'MISSING');
  await prisma.$disconnect();
})();
```

Run: `NODE_ENV=development npx ts-node --compiler-options '{"module":"commonjs"}' probe.ts`
Expected: `groupId column: OK` / `spaceinfo index: OK`

둘 중 하나라도 MISSING이면 멈추고 사용자에게 알린다. 이후 태스크는 전부 이것에 의존한다.

- [x] **Step 3: Prisma 클라이언트가 컬럼을 읽는지 확인**

```ts
// probe.ts
const row = await prisma.adminPush.findFirst({ select: { id: true, groupId: true } });
console.log('prisma read:', row === null ? 'empty table (OK)' : 'OK');
```

Expected: 예외 없이 통과. 예외가 나면 `npx prisma generate` 후 재시도.

- [x] **Step 4: 임시 스크립트 삭제**

```bash
rm -f probe.ts
```

커밋 없음 — 이 태스크는 코드를 바꾸지 않는다.

---

### Task 2: 인덱스가 22초를 해결했는지 재측정

스펙 §5는 `SpaceInfo` 전체 스캔이 병목이고 인덱스 하나가 고친다고 진단했다. 진단은 `EXPLAIN`에 근거하지만 **결과는 측정되지 않았다.** 안 고쳐졌다면 스펙 §11의 비동기 해석 안으로 돌아가야 하므로, 이것이 다음 태스크의 전제다.

**Files:**
- 실행 없음. 측정만.

**Interfaces:**
- Consumes: Task 1의 `idx_spaceinfo_type_locale`.
- Produces: 저장 경로 실측치. 다음 태스크가 이 숫자에 의존한다.

- [x] **Step 1: 저장 경로 쿼리를 측정한다**

```ts
// probe.ts — 확인 후 삭제
import { PrismaClient } from '@prisma/client';
import { selectMatchingUserNames, PUSH_FILTER_MAX_RESULTS } from './src/admin/push/push-target-filter';
const prisma = new PrismaClient();
async function run(label: string, filter: any) {
  const t0 = Date.now();
  const rows = await prisma.$queryRaw<Array<{ username: string }>>(
    selectMatchingUserNames(filter, null, PUSH_FILTER_MAX_RESULTS + 1),
  );
  console.log(`${label.padEnd(30)} names=${String(rows.length).padStart(6)} ${String(Date.now() - t0).padStart(6)}ms`);
}
(async () => {
  await run('커플+ko+질문10+펫5', { spaceTypes: ['couple'], spaceLocales: ['ko'], minCardCount: 10, minPetLevel: 5 });
  await run('커플만', { spaceTypes: ['couple'] });
  await run('질문>=10', { minCardCount: 10 });
  await prisma.$disconnect();
})();
```

Run: `NODE_ENV=development npx ts-node --compiler-options '{"module":"commonjs"}' probe.ts`

인덱스 적용 전 기준값 — 22.0초 / 10.4초 / 24.8초.

- [x] **Step 2: 결과를 판정한다**

| 실측 | 판정 |
|---|---|
| 셋 다 3초 미만 | 통과. Step 4로. |
| 3~10초 | 통과하되 스펙 §5에 실측치를 기록하고 사용자에게 알린다. |
| 10초 초과 | **멈춘다.** 스펙 §11 "비동기 해석"으로 돌아가야 한다. 사용자에게 숫자와 함께 알리고 계획 재작성을 제안한다. |

- [x] **Step 3: `EXPLAIN`으로 인덱스가 실제로 쓰이는지 확인**

쿼리를 손으로 다시 적지 않는다. 손으로 적으면 조인 순서나 조건이 코드와 어긋나 **측정 대상이 실제 쿼리가 아니게 된다.** `selectMatchingUserNames`가 만든 SQL을 그대로 `EXPLAIN`한다.

```ts
import { selectMatchingUserNames, PUSH_FILTER_MAX_RESULTS } from './src/admin/push/push-target-filter';

const sql = selectMatchingUserNames(
  { spaceTypes: ['couple'], spaceLocales: ['ko'], minCardCount: 10, minPetLevel: 5 } as any,
  null,
  PUSH_FILTER_MAX_RESULTS + 1,
);
const plan = await prisma.$queryRawUnsafe<any[]>('EXPLAIN ' + sql.sql, ...sql.values);
for (const r of plan) { const v = Object.values(r); console.log(`tbl=${v[2]} type=${v[4]} key=${v[6]} rows=${v[9]}`); }
```

Expected: **첫 행이 `si`**이고 `key`가 `idx_spaceinfo_type_locale`. 선두가 `p`(`Profile`)면 옵티마이저가 순서를 거꾸로 고른 것이고, 그때는 인덱스가 붙어 있어도 느리다 — 실측이 그랬다.

- [x] **Step 4: 실측치를 스펙에 기록하고 커밋**

`docs/superpowers/specs/2026-08-26-push-target-filter-design.md` §5 끝의 "인덱스 적용 후 재측정은 구현 계획의 검증 항목이다." 를 실측 표로 교체한다.

```bash
rm -f probe.ts
git add docs/superpowers/specs/2026-08-26-push-target-filter-design.md
git commit -m "docs(push): record the measured effect of idx_spaceinfo_type_locale"
```

---

**Task 1·2 결과 (2026-08-27):**

DDL 세 줄 모두 dev에 적용 확인. `groupId` 컬럼·`idx_adminpush_group`·`idx_spaceinfo_type_locale` 존재, Prisma 읽기 정상.

인덱스만으로는 부족했다. 22.0초가 18.0초가 됐을 뿐이고, `EXPLAIN`을 보니 스캔이 사라진 게 아니라 `SpaceInfo`(295,535행)에서 `Profile`(581,549행)로 **옮겨간** 것이었다. 원인은 옵티마이저가 `(type, locale)` 인덱스의 행 수를 선두 컬럼만 보고 추정하기 때문이다 — 295,535/4 ≈ 75,102으로 잡지만 실제 매칭은 37,702행이다. `STRAIGHT_JOIN`으로 `SpaceInfo`부터 읽도록 고정하자 **0.6초**가 됐다 (서버 `d33fdc0`).

| 조건 | 인덱스 전 | 인덱스만 | +조인 고정 |
|---|---|---|---|
| 커플+ko+질문10+펫5 (16,517명) | 22.0초 | 18.0초 | **0.6초** |
| 커플만 (상한 초과) | 10.4초 | 8.2초 | 2.4초 |
| 질문≥10 (상한 초과) | 24.8초 | 23.3초 | 16.5초 |

미리보기 집계는 0.4초. 상한 초과 조건이 느린 것은 상한(50,000)까지 세어야 하기 때문이고, 그 경로는 저장을 거부하므로 운영에서 반복되지 않는다.

---

### Task 3: 조건 해석이 실제로 맞는 사람을 고르는지 확인

단위 테스트는 **SQL 문자열의 모양**을 검증한다. 그 SQL이 실제로 옳은 사람을 고르는지는 검증하지 않는다. 조건이 조용히 틀리면 엉뚱한 사람에게 발송된다.

**Files:**
- 실행 없음. dev DB 조회로 교차 검증.

**Interfaces:**
- Consumes: `selectMatchingUserNames(filter, userLocale, limit)`.

- [ ] **Step 1: 조건 하나로 뽑은 사용자가 정말 그 조건을 만족하는지 역검증**

```ts
// probe.ts
import { PrismaClient, Prisma } from '@prisma/client';
import { selectMatchingUserNames } from './src/admin/push/push-target-filter';
const prisma = new PrismaClient();
(async () => {
  const filter = { spaceTypes: ['couple'], minPetLevel: 5, minCardCount: 10 } as any;
  const rows = await prisma.$queryRaw<Array<{ username: string }>>(selectMatchingUserNames(filter, null, 20));

  for (const { username } of rows.slice(0, 10)) {
    // 이 사용자의 공간 중 세 조건을 "한 공간이 동시에" 만족하는 것이 있는가
    const hit = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT si.spaceId, si.type, pt.level,
             (SELECT MAX(c.\`order\`) FROM \`Card\` c WHERE c.spaceId = si.spaceId) AS cards
      FROM \`User\` u
      JOIN \`Profile\` p ON p.userId = u.id AND p.removed = 0 AND p.disabled = 0
      JOIN \`SpaceInfo\` si ON si.spaceId = p.spaceId
      LEFT JOIN \`Pet\` pt ON pt.spaceId = p.spaceId
      WHERE u.username = ${username} AND si.type = 'couple' AND pt.level >= 5
    `);
    const ok = hit.some((h: any) => Number(h.cards ?? 0) >= 10);
    console.log(`${username.padEnd(12)} ${ok ? 'OK' : 'MISMATCH'} spaces=${JSON.stringify(hit)}`);
  }
  await prisma.$disconnect();
})();
```

Expected: 10명 전원 `OK`. 하나라도 `MISMATCH`면 조건 조립에 버그가 있다 — 멈추고 보고한다.

- [ ] **Step 2: 한 공간 앵커링이 실제로 걸리는지 확인**

조건을 서로 다른 공간이 나눠 만족하는 사용자가 **제외되는지** 본다.

```ts
// couple 공간이 있지만 그 공간의 펫 레벨은 낮고, 다른 공간의 펫 레벨이 높은 사용자
const split = await prisma.$queryRaw<any[]>(Prisma.sql`
  SELECT u.username FROM \`User\` u
  JOIN \`Profile\` p1 ON p1.userId = u.id AND p1.removed = 0
  JOIN \`SpaceInfo\` s1 ON s1.spaceId = p1.spaceId AND s1.type = 'couple'
  LEFT JOIN \`Pet\` t1 ON t1.spaceId = s1.spaceId
  JOIN \`Profile\` p2 ON p2.userId = u.id AND p2.spaceId <> p1.spaceId AND p2.removed = 0
  LEFT JOIN \`Pet\` t2 ON t2.spaceId = p2.spaceId
  WHERE u.fcmToken IS NOT NULL AND (t1.level IS NULL OR t1.level < 5) AND t2.level >= 5
  LIMIT 3
`);
const picked = await prisma.$queryRaw<Array<{ username: string }>>(
  selectMatchingUserNames({ spaceTypes: ['couple'], minPetLevel: 5 } as any, null, 50000),
);
const names = new Set(picked.map((p) => p.username));
for (const s of split) console.log(`${s.username}: ${names.has(s.username) ? 'WRONGLY INCLUDED' : 'correctly excluded'}`);
```

Expected: 전부 `correctly excluded`. 해당하는 사용자가 dev에 없으면 `split`이 빈 배열이고, 그 사실을 보고한다(검증 불가).

- [ ] **Step 3: 결과를 보고하고 임시 스크립트 삭제**

```bash
rm -f probe.ts
```

Step 1·2가 통과하면 커밋 없음. 버그가 나오면 수정 후 해당 파일과 회귀 테스트를 함께 커밋한다.

---

### Task 4: 캠페인 저장을 UI로 끝까지 해본다

여기가 이 계획의 핵심이다. 조건 입력 → 저장 → 여러 행 생성 → 목록 접힘 → 취소까지 한 번도 실행된 적이 없다.

**Files:**
- 없음(확인). 문제가 나오면 해당 파일 수정.

**Interfaces:**
- Consumes: Task 1의 DDL, Task 2의 성능.

**브라우저가 없으면 절반은 여전히 갈 수 있다.** 확장이 끊겨 있거나 화면을 볼 수 없을 때, 아래 단계는 API 직접 호출로 대체한다.

| 단계 | 화면 없이 |
|---|---|
| Step 2 조건 패널 렌더 | **불가** — 사람이 봐야 한다 |
| Step 3 레일 숫자 | `POST /admin/push/preview-targets`를 조건별로 호출해 개수만 확인 |
| Step 4 저장 | `POST /admin/push`에 `filter`를 담아 호출. 응답 배열 길이가 행 수다 |
| Step 5 DB 행 확인 | 그대로 가능 |
| Step 6 그룹 취소 | `DELETE`/취소 엔드포인트를 그룹의 아무 행 id로 호출 |

이렇게 하면 **서버 쪽 전부와 어드민의 렌더만 남는다.** 화면 확인은 Task 6과 함께 사람이 한 번에 처리한다. 어느 쪽으로 갔는지 완료 보고에 명시한다 — "확인했다"와 "API로만 확인했다"는 다른 말이다.

- [ ] **Step 1: 서버와 어드민을 띄운다**

```bash
cd ~/Documents/backend/mindqna-server && NODE_ENV=development npx nest start &
cd ~/Documents/frontend/mindqna-admin && pnpm dev &
```

`pnpm start:dev`를 쓰지 않는다 — 그것은 `pm2 start ecosystem.config.js --only mindbridge-dev`, 즉 dev 배포 스크립트다.

- [ ] **Step 2: 조건 패널이 보이는지 확인**

`http://localhost:4000/marketing/push/list` → `푸시 등록` → 발송 대상 `전체`.

확인 항목:
- `대상 조건` 밴드 아래에 공간 유형 칩 4개, 공간 언어 칩 7개, 질문 개수·펫 레벨 입력이 보인다.
- 칩을 누르면 검정 채움으로 반전된다.
- 공간 언어 행 힌트가 계정 언어와 다르다고 말한다.

- [ ] **Step 3: 대상 수가 조건을 따라 움직이는지 확인**

조건 없음 → 우측 레일이 로케일 전체(약 44.5만)를 보인다.
`커플` + 펫 레벨 `5` + 질문 `10` → 레일 숫자가 약 16,500으로 바뀐다.

바뀌지 않으면 `PushForm.tsx`의 `hasFilter` 분기가 작동하지 않는 것이다.

- [ ] **Step 4: 예약으로 저장한다 — 즉시 발송을 쓰지 않는다**

제목·내용을 채우고 발송 시점을 **예약**으로, 시각은 **내일**로 잡는다. 즉시 발송은 1분 내에 실제 기기로 나간다.

저장 후 확인:
- 토스트가 `9개로 나뉘어 등록되었습니다` 형태로 뜬다(16,500명이면 9행. 숫자는 조건에 따라 다름).
- 목록에 **한 줄만** 늘어난다.
- 제목 옆에 `0/9` 배지가 있다.

- [ ] **Step 5: DB에서 실제 행을 확인**

```ts
// probe.ts
const rows = await prisma.adminPush.findMany({
  where: { groupId: { not: null } },
  select: { id: true, groupId: true, target: true, userNames: true, status: true },
  orderBy: { id: 'asc' },
});
console.log('rows:', rows.length);
console.log('groupIds:', new Set(rows.map((r) => r.groupId)).size);
const counts = rows.map((r) => (r.userNames ?? '').split(',').filter(Boolean).length);
console.log('per-row counts:', counts.join(','));
console.log('total:', counts.reduce((a, b) => a + b, 0));
```

Expected: 모든 행이 같은 `groupId`, `target='USER'`, 마지막을 뺀 각 행이 정확히 `PUSH_CHUNK_SIZE`(2,000)명, 합계가 레일이 보여준 숫자와 일치.

합계가 다르면 `chunk` 또는 해석에 문제가 있다.

- [ ] **Step 6: 취소가 그룹 전체에 걸리는지 확인**

목록에서 캠페인 한 줄의 취소를 실행한다. 그 다음 DB 확인:

```ts
const after = await prisma.adminPush.findMany({
  where: { groupId: { not: null } },
  select: { status: true },
});
console.log('statuses:', after.map((r) => r.status).join(','));
```

Expected: **전부** `CANCELED`. 하나라도 `SCHEDULED`가 남으면 그룹 취소가 작동하지 않는 것이고, 그 행은 내일 실제로 발송된다.

- [ ] **Step 7: 남은 테스트 데이터를 정리한다**

Step 6에서 전부 `CANCELED`가 되었는지 다시 확인한다. `SCHEDULED`가 남아 있으면 사용자에게 즉시 알린다 — dev DB에 예약된 실제 발송이 남는다.

```bash
rm -f probe.ts
```

- [ ] **Step 8: 발견한 문제를 고치고 커밋**

Step 2~6에서 문제가 나오면 고치고, 재현 가능한 것은 테스트를 함께 추가한 뒤 커밋한다. 문제가 없으면 커밋 없이 다음으로.

---

### Task 5: 상한과 빈 결과 경로를 확인한다

두 에러 경로는 코드에만 있고 실행된 적이 없다. 상한 초과 메시지가 틀리면 운영자가 왜 저장이 안 되는지 알 수 없다.

**Files:**
- Modify(필요 시): `server: src/admin/push/push.service.ts`, `admin: src/components/page/push/PushForm.tsx`

**Interfaces:**
- Consumes: `PUSH_FILTER_NO_MATCH`, `PUSH_FILTER_TOO_MANY`.

- [ ] **Step 1: 매칭 0명 조건으로 저장을 시도한다**

펫 레벨을 `9999`로 넣고 저장한다.

Expected: `조건에 맞는 사용자가 없습니다` 토스트. 행은 생성되지 않는다.

`저장하지 못했습니다`라는 일반 메시지가 나오면 `PushFilterNoMatchError` 매핑이 작동하지 않는 것이다.

- [ ] **Step 2: 상한 초과 조건으로 저장을 시도한다**

Task 2 측정에서 50,001명이 나온 조건(예: 질문 개수 `10`만)으로 저장한다.

Expected: `조건에 맞는 사용자가 너무 많습니다. 최대 50,000명까지 보낼 수 있습니다` 토스트. 행은 생성되지 않는다.

- [ ] **Step 3: 두 경로 모두 행을 남기지 않았는지 확인**

```ts
const orphans = await prisma.adminPush.count({ where: { groupId: { not: null } } });
console.log('leftover campaign rows:', orphans);
```

Expected: `0`. 0이 아니면 트랜잭션이 롤백되지 않은 것이다 — 스펙 §7의 `$transaction` 조건을 다시 확인한다.

- [ ] **Step 4: 문제가 있으면 고치고 커밋**

```bash
rm -f probe.ts
```

---

### Task 6: 목록 접기가 실제 데이터에서 맞는지 확인

`push-grouping.test.ts` 14개는 합성 데이터로 검증한다. 실제 응답에서도 같은지 본다.

**Files:**
- Modify(필요 시): `admin: src/components/page/push/services/push-grouping.ts`

**Interfaces:**
- Consumes: `groupPushes(items)`.

- [ ] **Step 1: 예약 캠페인 하나를 다시 만든다**

Task 4 Step 4와 같은 방식으로, 조건을 좁혀 **3~5행 정도** 나오게 만든다(예: 커플 + ko + 질문 30 + 펫 10). 발송 시점은 내일.

- [ ] **Step 2: 목록에서 확인**

- 캠페인이 **한 줄**이다.
- 배지가 `0/N`이고 N이 실제 행 수와 같다.
- 대상 수가 각 행의 합이다(한 행의 1000이 아니다).
- 상태가 `예약`이다.

- [ ] **Step 3: 페이지 경계를 눈으로 확인한다 (선택)**

10행을 넘는 캠페인은 두 페이지에 각각 한 줄로 나타난다. 접기가 페이지 안에서만 일어나기 때문이다(`PAGE_SIZE = 10`). **이 한계는 이미 스펙 §8에 기록되어 있고 코드를 읽으면 자명하므로, 확인만을 위해 20,000명짜리 캠페인을 dev에 만들 필요는 없다.**

다른 이유로 10행 이상 캠페인을 만들게 되면 그때 함께 본다. 만들지 않았다면 이 단계는 건너뛰고 그 사실을 보고한다.

- [ ] **Step 4: 기록이 스펙에 남아 있는지 확인한다**

스펙 §8의 "알려진 한계 — 페이지 경계"가 현재 청크 크기(2,000)를 반영하는지 본다. 25행 캠페인이면 세 페이지에 세 줄이다.

- [ ] **Step 5: 만든 캠페인을 전부 취소한다**

목록에서 취소하고, `SCHEDULED`가 남지 않았는지 Task 4 Step 6의 스크립트로 확인한다.

- [ ] **Step 6: 커밋**

Step 4에서 고칠 것이 나온 경우에만 커밋한다. 없으면 커밋 없이 다음으로.

---

### Task 7: 캠페인 한 건이 유예창 안에 끝나는지 따진다

**리뷰에서 드러난 것.** 계획서에도 스펙에도 캠페인의 총 소요를 계산한 곳이 없었다. 숫자를 이어 붙이면 여유가 생각보다 얇다.

| | |
|---|---|
| 크론 주기 | `EVERY_MINUTE` (`src/fcm/cron/fcm-admin.cron.ts:20`) |
| 한 틱이 처리하는 행 | `findFirst` — 한 개 (`src/fcm/admin-push/admin-push-sender.ts:75`) |
| 캠페인 최대 행 수 | `PUSH_FILTER_MAX_RESULTS 50,000` ÷ `PUSH_CHUNK_SIZE 1,000` = **50행** |
| 캠페인 총 소요 | 약 **50분** |
| 유예창 | `GRACE_WINDOW_MS = 60분` (`src/fcm/admin-push/admin-push-rules.ts:4`) |
| 초과 시 | 발송이 아니라 **`FAILED`** (`admin-push-sender.ts:80-90`) |

여유는 10분이다. 캠페인 뒤쪽 행이 유예창을 넘으면 조용히 `FAILED`가 되고 운영자는 `43/50`에서 멈춘 캠페인을 본다. 실패가 아니라 시간 초과인데 메시지는 그렇게 읽히지 않는다.

**Files:**
- Modify: `server: src/admin/push/push-target-filter.ts` (`PUSH_CHUNK_SIZE`)
- Modify: `server: src/admin/push/push-target-filter.spec.ts` (분할 경계 테스트의 기대값)

**Interfaces:**
- Consumes: `PUSH_CHUNK_SIZE`, `chunk(items, size)`.

- [x] **Step 1: 청크를 2,000으로 올릴 수 있는지 저장 한계로 확인한다**

`AdminPush.userNames`는 `@db.Text`(65,535바이트)에 쉼표로 이어 붙인다. dev 실측으로 username은 최대 13자, 평균 8자다.

| 청크 | 최악 바이트 | TEXT 한계 대비 |
|---|---|---|
| 1,000 | 14,000 | 21% |
| 2,000 | 28,000 | 43% |

2,000이면 캠페인이 25행·25분이 되어 여유가 10분에서 35분으로 늘어난다. 저장 비용은 없다.

`MAX_USER_NAMES = 1000`은 **수기 입력**의 상한이라 함께 올리지 않는다. 운영자가 손으로 붙여넣는 양의 상한과, 서버가 스스로 쪼개는 단위는 같아야 할 이유가 없다.

- [x] **Step 2: 상수를 올리고 주석에 이유를 남긴다**

```ts
/**
 * 한 행이 담는 인원. 크론은 1분에 한 행씩 처리하므로 이 값이 캠페인의 총 소요를 정한다.
 * 상한 50,000명이면 25행 = 약 25분이고, 유예창 60분(GRACE_WINDOW_MS) 안에 끝난다.
 * 1,000이던 시절에는 50행 = 50분으로 여유가 10분뿐이었다. 더 키우지 않는 이유는
 * userNames가 TEXT(65,535바이트)이고 2,000명이 최악 28,000바이트이기 때문이다.
 */
export const PUSH_CHUNK_SIZE = 2000;
```

- [x] **Step 3: 분할 경계 테스트를 새 값에 맞춘다**

`push-target-filter.spec.ts`의 2,501명 케이스는 청크가 1,000일 때 `[1000, 1000, 501]`을 기대한다. 2,000이면 `[2000, 501]`이다. **숫자만 바꾸지 말고 꼬리가 남는 성질이 그대로인지 확인한다** — 여기가 조용히 틀리면 캠페인 꼬리가 사라진다.

```ts
it('splits 50,000 into 25 rows with no tail', () => {
  expect(chunk(Array.from({ length: 50_000 }, (_, i) => `u${i}`), PUSH_CHUNK_SIZE).map((c) => c.length))
    .toEqual(Array.from({ length: 25 }, () => 2000));
});

it('keeps the tail when the count is not a multiple', () => {
  expect(chunk(Array.from({ length: 2501 }, (_, i) => `u${i}`), PUSH_CHUNK_SIZE).map((c) => c.length))
    .toEqual([2000, 501]);
});
```

Run: `npx jest src/admin/push/push-target-filter.spec.ts`
Expected: 전부 통과.

- [x] **Step 4: 머리 막힘을 스펙에 한계로 기록한다**

행 선택은 `orderBy: { pushAt: 'asc' }`이고 캠페인의 모든 행은 `pushAt`이 같다. 그래서 캠페인 뒤에 예약된 일반 공지는 캠페인이 다 빠질 때까지 기다린다. 운영자에게 보이지 않는 결과이므로 적어 둔다.

스펙 §8 끝에 추가한다.

```markdown
**알려진 한계 — 캠페인이 대기열을 점유한다.** 발송기는 `pushAt`이 이른 행부터 1분에
하나씩 처리한다. 캠페인의 모든 행은 `pushAt`이 같으므로, 캠페인 뒤에 예약된 다른 푸시는
캠페인이 전부 빠질 때까지 기다린다. 25행 캠페인이면 최대 25분이다. 급한 공지를 캠페인과
같은 시각에 예약하지 않는 것으로 운영에서 피한다.
```

- [x] **Step 5: 게이트와 커밋**

```bash
cd ~/Documents/backend/mindqna-server
npx tsc --noEmit -p tsconfig.json && npx jest src/admin/push src/fcm
git add src/admin/push/push-target-filter.ts src/admin/push/push-target-filter.spec.ts
git commit -m "fix(push): size the chunk so a campaign finishes inside the grace window"

cd ~/Documents/frontend/mindqna-admin
git add docs/superpowers/specs/2026-08-26-push-target-filter-design.md
git commit -m "docs(push): record that a campaign occupies the send queue"
```

---

### Task 8: 그룹 행이 실제로 발송되는지 확인한다

**리뷰에서 드러난 것.** Task 4·6은 저장한 캠페인을 반드시 취소한다. 옳은 안전 규칙이지만, 그 결과 이 계획의 핵심 전제 — "발송기는 그룹 행을 평범한 개인 발송으로 처리하므로 변경이 없다" — 가 **한 번도 실행되지 않는다.** 코드를 읽어 뒷받침했을 뿐이다.

**이 태스크는 실제 발송을 한다. 사용자의 명시적 승인 없이 시작하지 않는다.**

**Files:**
- 없음(확인). 문제가 나오면 해당 파일 수정.

**Interfaces:**
- Consumes: Task 4의 저장 경로, `runAdminPushTick`.

- [ ] **Step 1: 사용자에게 승인을 받는다**

무엇을 보낼지 먼저 합의한다: 본인 계정 등 **알고 있는 소수**에게만 닿는 조건, 2행 이상이 나오도록 `PUSH_CHUNK_SIZE`보다 많은 인원. 조건으로 그렇게 좁히기 어려우면 이 태스크는 dev에서 청크를 임시로 2로 낮춰 진행하고, 확인 후 되돌린다.

승인 없이는 Step 2로 가지 않는다.

- [ ] **Step 2: 예약으로 저장하고 크론이 잡을 시각까지 기다린다**

dev 서버에서 크론이 도는지 먼저 확인한다. `CRON_DISABLED = NODE_ENV !== 'production' || NODE_APP_INSTANCE !== '0'`이므로 **로컬 `nest start`에서는 크론이 아예 돌지 않는다.** 이 태스크는 크론이 도는 환경에서만 의미가 있다 — 어디서 돌릴지 사용자와 정한다.

- [ ] **Step 3: 행이 하나씩 순서대로 빠지는지 본다**

```ts
const rows = await prisma.adminPush.findMany({
  where: { groupId: '<확인할 groupId>' },
  select: { id: true, status: true, sentCount: true, startedAt: true, finishedAt: true },
  orderBy: { id: 'asc' },
});
console.table(rows);
```

Expected: 한 번에 한 행만 `SENDING`. 앞 행이 `SENT`가 된 뒤 다음 행이 시작한다. 두 행이 동시에 `SENDING`이면 `isRunning` 가드가 듣지 않는 것이다.

- [ ] **Step 4: 목록 배지가 진행을 따라가는지 본다**

`0/N` → `1/N` → … → `N/N`. 마지막 행이 끝나기 전에 `N/N`이 되면 `finishedParts` 집계가 틀린 것이다.

- [ ] **Step 5: 실제 기기에서 알림을 확인한다**

푸시 재작업 전체의 미결 항목이 여기서 함께 닫힌다. 제목·내용·딥링크가 의도대로 보이는지 본다.

- [ ] **Step 6: 임시로 바꾼 것을 되돌리고 커밋**

Step 1에서 청크를 낮췄다면 되돌린다. 발견한 문제는 회귀 테스트와 함께 커밋한다.

---

### Task 9: 전체 게이트와 브랜치 마무리

**Files:**
- 없음(검증).

- [ ] **Step 1: 서버 게이트**

```bash
cd ~/Documents/backend/mindqna-server
npx tsc --noEmit -p tsconfig.json
npx jest src/admin/push src/fcm
```

Expected: 타입 에러 0, 테스트 전부 통과.

- [ ] **Step 2: 어드민 게이트**

```bash
cd ~/Documents/frontend/mindqna-admin
npx tsc --noEmit
pnpm lint
pnpm build
npx tsx --test "src/components/page/push/services/*.test.ts"
```

Expected: 전부 통과.

- [ ] **Step 3: dev DB에 남은 테스트 데이터가 없는지 최종 확인**

```ts
const left = await prisma.adminPush.findMany({
  where: { groupId: { not: null }, status: { in: ['SCHEDULED', 'SENDING'] } },
  select: { id: true, status: true, pushAt: true },
});
console.log('still live:', JSON.stringify(left));
```

Expected: `[]`. 비어 있지 않으면 취소하고 다시 확인한다.

- [ ] **Step 4: 두 저장소를 푸시하고 PR을 올린다**

```bash
cd ~/Documents/backend/mindqna-server && git push -u origin feat/push-target-filter
cd ~/Documents/frontend/mindqna-admin && git push -u origin feat/push-target-filter
```

PR 본문에 담을 것: 스펙 링크, 적용해야 할 DDL(운영 반영 전 필수), Task 2의 실측치, Task 6의 페이지 경계 한계.

- [ ] **Step 5: 운영 반영 전 체크리스트를 사용자에게 전달**

- prod에 DDL 적용(컬럼 없이 배포하면 **모든 푸시 화면이 죽는다**).
- 첫 캠페인은 좁은 조건으로 소수에게.
- 실기기 발송 확인(푸시 재작업 전체의 미결 항목).

---

## Self-Review

**스펙 커버리지**

| 스펙 절 | 태스크 |
|---|---|
| §2 한 공간 앵커링 | Task 3 Step 2 |
| §3 분할·groupId | Task 4 Step 5 |
| §4 `EXISTS` 카드 조건 | Task 3 Step 1 |
| §5 인덱스 성능 | Task 2 |
| §6 DDL | Task 1 |
| §7 트랜잭션·그룹 취소 | Task 4 Step 6, Task 5 Step 3 |
| §7 에러 코드 | Task 5 Step 1·2 |
| §8 조건 패널·대상 수 | Task 4 Step 2·3 |
| §8 목록 접기 | Task 6 |
| §9 테스트 | Task 7 Step 1·2 |
| §10 화면 미확인 | Task 4·6이 해소 |
| §10 인덱스 후 재측정 | Task 2가 해소 |
| §10 실기기 발송 | Task 7 Step 5로 이관(범위 밖) |

**플레이스홀더:** 없음. 모든 확인 단계에 실행할 코드와 기대값이 있다.

**타입 일관성:** `selectMatchingUserNames(filter, userLocale, limit)`, `PUSH_FILTER_MAX_RESULTS`, `groupPushes(items)`, `PUSH_FILTER_NO_MATCH` / `PUSH_FILTER_TOO_MANY` — 전부 구현된 시그니처와 일치함을 확인했다.

**자체 리뷰가 찾은 것:** Task 6 Step 3의 페이지 경계 문제는 스펙에 없던 항목이다. 구현이 페이지 안에서만 접기 때문에 10행 넘는 캠페인은 여러 줄로 보인다. 태스크를 지우는 대신 한계로 기록하게 했다 — 서버 페이지네이션을 그룹 단위로 바꾸는 것은 이번 범위보다 크고, 모르고 넘어가는 것이 더 나쁘다.
