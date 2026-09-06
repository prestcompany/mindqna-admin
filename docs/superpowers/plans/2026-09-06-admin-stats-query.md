# 조건별 통계 조회 구현 계획

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영팀이 "질문 20개/50개 이상 작성된 공간 개수"류의 질문을 어드민에서 직접, 여러 건 한 번에 조회하고 해당 목록까지 볼 수 있게 한다.

**Architecture:** 서버에 지표 레지스트리를 두고 조건을 SQL로 조립한다. 질의 형태는 하나다 — `Card`를 `order`로 범위 스캔해 `spaceId` 집합을 만들고 `STRAIGHT_JOIN`으로 `SpaceInfo`를 짚는다. 어드민은 `GET /admin/stats/metrics`가 돌려주는 카탈로그로 셀렉트를 만들므로 지표가 늘어도 어드민 배포가 필요 없다.

**Tech Stack:** 서버 — NestJS, Nestia(`@TypedRoute`), Prisma raw SQL, jest, yarn. 어드민 — Next.js(pages router), TanStack Query v5, shadcn/radix, `node:test`, pnpm.

**Spec:** `docs/superpowers/specs/2026-09-06-admin-stats-query-design.md`

## Global Constraints

- 모든 조회는 `databaseManager.read()`를 통한다. `PrismaService`를 직접 쓰지 않는다.
- 사용자 입력은 **절대** SQL 식별자가 되지 않는다. 지표 키·연산자는 레지스트리 조회로 검증하고, 값은 `Prisma.sql` 파라미터로만 들어간다. `Prisma.raw`는 코드가 생성한 별칭(`k0`, `k1`)에만 쓴다.
- 모든 카운트 쿼리에 `/*+ MAX_EXECUTION_TIME(10000) */`를 붙인다.
- 버킷은 요청당 최대 10개. 초과 시 400.
- 버킷 병렬 실행 동시성은 3.
- 어드민에 이모지를 쓰지 않는다. UI 문구는 한국어, 코드 주석·커밋 메시지는 영어.
- 서버 테스트는 `yarn test`, 어드민 테스트는 `pnpm test`.

## 스펙에서 교정한 것

계획을 쓰면서 스펙 §3의 타입 정의가 실제 SQL 형태를 담지 못한다는 것이 드러났다. 스펙은 지표를

```ts
predicate(op: Operator, value: unknown): Prisma.Sql
```

로 정의했는데, `cardCount`는 `WHERE` 술어가 아니라 **`FROM` 절 맨 앞에 오는 구동 테이블**이다(스펙 §5의 채택 형태). 하나의 `Prisma.Sql`로는 표현되지 않는다.

Task 2에서 다음으로 바꾼다.

```ts
type Fragment = {
  driving?: Prisma.Sql;   // FROM 맨 앞에 올 수 있는 파생 테이블
  joins: Prisma.Sql[];
  wheres: Prisma.Sql[];
};
compile(op: Operator, value: unknown, alias: string): Fragment
```

`alias`는 같은 지표가 여러 조건에 쓰일 때(`질문 A~B`) 파생 테이블이 충돌하지 않게 한다.

## 스펙과 의도적으로 다르게 가는 것

**드릴다운 페이징은 `OFFSET`으로 간다.** 스펙 §5는 키셋 커서를 지정했다. 두 가지 이유로 첫 버전에서는 `OFFSET`을 쓴다.

- 기존 `DataTable`의 `pagination`이 `{ total, page, onChange }` 형태라 페이지 번호를 요구한다. 키셋은 "3페이지로 점프"를 표현하지 못한다.
- 실측 차이가 작다. 21페이지에서 `OFFSET` 34ms 대 키셋 20ms이고, 가장 큰 버킷도 1,493개(30페이지)다.

결과 집합이 수만 건대로 커지면 키셋으로 바꾼다. Task 4에서 API가 `page`를 받되 서비스 내부에서만 `OFFSET`을 조립하므로, 나중에 커서로 바꿔도 어드민이 바뀌지 않는다.

---

## Task 1: 전제 확인 — prod에 `Card_order_spaceId_key`가 있는가

스펙 §9가 남긴 유일한 차단 요소다. 이 인덱스가 없으면 설계 전체가 성립하지 않으므로 **코드를 쓰기 전에** 확인한다. dev에는 `schema.prisma`가 선언한 `idx_card_space_order`가 실제로 없었다.

**Files:**
- Create: `scripts/check-stats-index.mjs` (일회성, 커밋하지 않음)

**Interfaces:**
- Consumes: 없음
- Produces: 없음 (게이트)

- [ ] **Step 1: 확인 스크립트 작성**

`mindqna-server` 저장소 루트에 임시 파일로 만든다.

```js
// scripts/check-stats-index.mjs
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';

const require = createRequire(process.cwd() + '/package.json');
const { PrismaClient } = require('@prisma/client');

const envFile = process.argv[2] ?? '.env.development';
const url = readFileSync(envFile, 'utf8')
  .split('\n')
  .find((l) => l.startsWith('DATABASE_URL='))
  .replace(/^DATABASE_URL\s*=\s*/, '')
  .replace(/^"|"$/g, '')
  .trim();

const prisma = new PrismaClient({ datasources: { db: { url } } });

const rows = await prisma.$queryRawUnsafe(
  `SELECT INDEX_NAME, SEQ_IN_INDEX, COLUMN_NAME
     FROM information_schema.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'Card'
    ORDER BY INDEX_NAME, SEQ_IN_INDEX`,
);

const byName = {};
for (const r of rows) (byName[r.INDEX_NAME] ??= []).push(r.COLUMN_NAME);

console.log(envFile);
for (const [name, cols] of Object.entries(byName)) console.log(`  ${name} (${cols.join(', ')})`);

const ok = Object.values(byName).some((cols) => cols[0] === 'order' && cols[1] === 'spaceId');
console.log(ok ? '\nOK: (order, spaceId) 선두 인덱스 있음' : '\n차단: (order, spaceId) 선두 인덱스 없음');
process.exit(ok ? 0 : 1);
```

- [ ] **Step 2: dev에서 실행해 스크립트 자체를 검증**

```bash
cd ~/Documents/backend/mindqna-server
node scripts/check-stats-index.mjs .env.development
```

기대: `Card_order_spaceId_key (order, spaceId)`가 찍히고 `OK`로 종료(exit 0).

- [ ] **Step 3: prod에서 실행**

```bash
node scripts/check-stats-index.mjs .env.production
```

기대: 같은 인덱스 존재. **`차단`이 나오면 여기서 멈추고 사람에게 보고한다.** 인덱스를 임의로 추가하지 않는다 — prod DDL은 사람이 적용한다(저장소 관행).

- [ ] **Step 4: 스크립트 삭제**

```bash
rm scripts/check-stats-index.mjs
```

일회성 확인이므로 커밋하지 않는다. 결과는 PR 설명에 적는다.

---

## Task 2: 지표 레지스트리와 SQL 조립 (DB 없이)

순수 함수만 있는 계층이다. DB에 붙지 않으므로 빠르게 돌고, `cardCount`의 경계(`B+1`, `N+1`)를 여기서 잡는다.

**Files:**
- Create: `src/admin/stats/types/stats.types.ts`
- Create: `src/admin/stats/stats.registry.ts`
- Create: `src/admin/stats/stats.sql.ts`
- Test: `src/admin/stats/stats.sql.spec.ts`

**Interfaces:**
- Consumes: 없음
- Produces:
  - `type Operator = 'gte' | 'lt' | 'eq' | 'in' | 'between'`
  - `type Condition = { metric: string; op: Operator; value: unknown }`
  - `type Fragment = { driving?: Prisma.Sql; joins: Prisma.Sql[]; wheres: Prisma.Sql[] }`
  - `SPACE_ENTITY: EntityDef`
  - `ENTITIES: Record<'space', EntityDef>`
  - `buildCountSql(entity: EntityDef, conditions: Condition[]): Prisma.Sql`
  - `buildListSql(entity: EntityDef, conditions: Condition[], page: number, size: number): Prisma.Sql`
  - `validateConditions(entity: EntityDef, conditions: Condition[]): void` — 위반 시 `BadRequestException`
  - `describeEntities(): EntityDescriptor[]`

- [ ] **Step 1: 타입 파일 작성**

```ts
// src/admin/stats/types/stats.types.ts
import { Prisma } from '@prisma/client';

export type Operator = 'gte' | 'lt' | 'eq' | 'in' | 'between';
export type MetricKind = 'number' | 'date' | 'enum' | 'boolean';

export type Condition = {
  metric: string;
  op: Operator;
  value: unknown;
};

/**
 * A metric compiles to fragments rather than a single predicate: cardCount is a
 * derived table that has to lead the FROM clause, not a WHERE clause. See the
 * design doc section 5 for why the leading position matters.
 */
export type Fragment = {
  /** Emitted at the head of FROM when this metric can drive the plan. */
  driving?: Prisma.Sql;
  joins: Prisma.Sql[];
  wheres: Prisma.Sql[];
};

export type Metric = {
  key: string;
  label: string;
  kind: MetricKind;
  operators: readonly Operator[];
  enumValues?: readonly string[];
  compile(op: Operator, value: unknown, alias: string): Fragment;
};

export type EntityDef = {
  key: 'space';
  label: string;
  /** Driving table when no metric supplies one. */
  base: Prisma.Sql;
  /** Columns returned by the drill-down list. */
  listSelect: Prisma.Sql;
  /** Stable order for keyset-friendly paging. */
  listOrder: Prisma.Sql;
  metrics: Record<string, Metric>;
};

export type MetricDescriptor = {
  key: string;
  label: string;
  kind: MetricKind;
  operators: readonly Operator[];
  enumValues?: readonly string[];
};

export type EntityDescriptor = {
  key: string;
  label: string;
  metrics: MetricDescriptor[];
};

export type BucketResult = {
  label: string;
  count: number | null;
  error?: 'timeout' | 'failed';
};
```

- [ ] **Step 2: 실패하는 테스트 작성**

```ts
// src/admin/stats/stats.sql.spec.ts
import { Prisma } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';
import { SPACE_ENTITY } from './stats.registry';
import { buildCountSql, buildListSql, validateConditions } from './stats.sql';

const text = (sql: Prisma.Sql) => sql.sql.replace(/\s+/g, ' ').trim();

describe('buildCountSql', () => {
  it('leads the FROM clause with the card range and pins the join order', () => {
    const sql = buildCountSql(SPACE_ENTITY, [{ metric: 'cardCount', op: 'gte', value: 20 }]);
    expect(text(sql)).toContain('FROM ( SELECT DISTINCT `spaceId` FROM `Card` WHERE `order` >= ?');
    expect(text(sql)).toContain('STRAIGHT_JOIN `SpaceInfo` si ON si.`spaceId` =');
    expect(sql.values).toContain(20);
  });

  it('keeps the card range leading even when a SpaceInfo filter is present', () => {
    const sql = buildCountSql(SPACE_ENTITY, [
      { metric: 'locale', op: 'in', value: ['ko'] },
      { metric: 'cardCount', op: 'gte', value: 20 },
    ]);
    const t = text(sql);
    expect(t.indexOf('FROM ( SELECT DISTINCT')).toBeLessThan(t.indexOf('STRAIGHT_JOIN'));
    expect(t).toContain('si.`locale` IN (?)');
  });

  it('falls back to SpaceInfo as the driving table when nothing drives', () => {
    const sql = buildCountSql(SPACE_ENTITY, [{ metric: 'locale', op: 'in', value: ['ko'] }]);
    expect(text(sql)).toContain('FROM `SpaceInfo` si');
    expect(text(sql)).not.toContain('STRAIGHT_JOIN');
  });

  it('expresses "fewer than N" as an anti-join, not a negated range', () => {
    const sql = buildCountSql(SPACE_ENTITY, [{ metric: 'cardCount', op: 'lt', value: 10 }]);
    const t = text(sql);
    expect(t).toContain('LEFT JOIN');
    expect(t).toContain('IS NULL');
    expect(sql.values).toContain(10);
  });

  it('turns a range into >= A and NOT >= B+1', () => {
    const sql = buildCountSql(SPACE_ENTITY, [{ metric: 'cardCount', op: 'between', value: [10, 19] }]);
    expect(sql.values).toEqual(expect.arrayContaining([10, 20]));
  });

  it('turns equality into >= N and NOT >= N+1', () => {
    const sql = buildCountSql(SPACE_ENTITY, [{ metric: 'cardCount', op: 'eq', value: 7 }]);
    expect(sql.values).toEqual(expect.arrayContaining([7, 8]));
  });

  it('gives two card conditions separate aliases', () => {
    const sql = buildCountSql(SPACE_ENTITY, [{ metric: 'cardCount', op: 'between', value: [10, 19] }]);
    const t = text(sql);
    expect(t).toContain('k0');
    expect(t).toContain('k0b');
  });

  it('joins Space once when two metrics both need it', () => {
    const sql = buildCountSql(SPACE_ENTITY, [
      { metric: 'coin', op: 'gte', value: 1000 },
      { metric: 'isActive', op: 'eq', value: true },
    ]);
    const joins = text(sql).match(/JOIN `Space` s/g) ?? [];
    expect(joins).toHaveLength(1);
  });

  it('keeps two card anti-joins apart despite the same shape', () => {
    const sql = buildCountSql(SPACE_ENTITY, [
      { metric: 'cardCount', op: 'lt', value: 10 },
      { metric: 'petLevel', op: 'gte', value: 5 },
    ]);
    expect(text(sql)).toContain('k0');
  });

  it('caps every count with an execution timeout', () => {
    const sql = buildCountSql(SPACE_ENTITY, [{ metric: 'cardCount', op: 'gte', value: 20 }]);
    expect(text(sql)).toContain('MAX_EXECUTION_TIME(10000)');
  });
});

describe('validateConditions', () => {
  it('rejects a metric that is not in the registry', () => {
    expect(() => validateConditions(SPACE_ENTITY, [{ metric: 'nope', op: 'gte', value: 1 }])).toThrow(
      BadRequestException,
    );
  });

  it('rejects an operator the metric does not support', () => {
    expect(() => validateConditions(SPACE_ENTITY, [{ metric: 'locale', op: 'between', value: [1, 2] }])).toThrow(
      BadRequestException,
    );
  });

  it('rejects a non-numeric value for a number metric', () => {
    expect(() => validateConditions(SPACE_ENTITY, [{ metric: 'cardCount', op: 'gte', value: 'twenty' }])).toThrow(
      BadRequestException,
    );
  });

  it('rejects an enum value outside the declared set', () => {
    expect(() => validateConditions(SPACE_ENTITY, [{ metric: 'locale', op: 'in', value: ['xx'] }])).toThrow(
      BadRequestException,
    );
  });

  it('rejects a reversed range', () => {
    expect(() => validateConditions(SPACE_ENTITY, [{ metric: 'cardCount', op: 'between', value: [20, 10] }])).toThrow(
      BadRequestException,
    );
  });

  it('accepts a well-formed condition set', () => {
    expect(() =>
      validateConditions(SPACE_ENTITY, [
        { metric: 'locale', op: 'in', value: ['ko'] },
        { metric: 'cardCount', op: 'gte', value: 20 },
      ]),
    ).not.toThrow();
  });
});

describe('buildListSql', () => {
  it('pages with a stable order and does not recount', () => {
    const sql = buildListSql(SPACE_ENTITY, [{ metric: 'cardCount', op: 'gte', value: 20 }], 2, 50);
    const t = text(sql);
    expect(t).toContain('ORDER BY si.`spaceId`');
    expect(t).toContain('LIMIT');
    expect(t).not.toContain('COUNT(');
    expect(sql.values).toEqual(expect.arrayContaining([50, 50]));
  });
});
```

- [ ] **Step 3: 테스트가 실패하는지 확인**

```bash
cd ~/Documents/backend/mindqna-server
yarn test src/admin/stats/stats.sql.spec.ts
```

기대: FAIL — `Cannot find module './stats.registry'`

- [ ] **Step 4: 레지스트리 작성**

```ts
// src/admin/stats/stats.registry.ts
import { Locale, Prisma, SpaceType } from '@prisma/client';
import { EntityDef, EntityDescriptor, Fragment, Metric, Operator } from './types/stats.types';

/**
 * Card.order is assigned as totalCards + 1 at issuance, so a space's highest
 * order is its card count. Card_order_spaceId_key is (order, spaceId), which
 * makes "order >= N" one tail of the index and hands back the qualifying
 * spaceIds directly. Cost therefore tracks cards above the threshold, not
 * spaces scanned. See the design doc section 4.
 */
function cardRange(threshold: number, alias: string): Prisma.Sql {
  return Prisma.sql`(SELECT DISTINCT \`spaceId\` FROM \`Card\` WHERE \`order\` >= ${threshold}) ${Prisma.raw(alias)}`;
}

function cardAntiJoin(threshold: number, alias: string): Fragment {
  return {
    joins: [
      Prisma.sql`LEFT JOIN ${cardRange(threshold, alias)} ON ${Prisma.raw(alias)}.\`spaceId\` = si.\`spaceId\``,
    ],
    wheres: [Prisma.sql`${Prisma.raw(alias)}.\`spaceId\` IS NULL`],
  };
}

const cardCount: Metric = {
  key: 'cardCount',
  label: '질문 수',
  kind: 'number',
  operators: ['gte', 'lt', 'eq', 'between'],
  compile(op, value, alias) {
    if (op === 'gte') {
      return { driving: cardRange(value as number, alias), joins: [], wheres: [] };
    }
    if (op === 'lt') {
      return cardAntiJoin(value as number, alias);
    }
    // eq and between are the same shape: a lower bound that drives, and an
    // anti-join one past the upper bound.
    const [lo, hi] = op === 'eq' ? [value as number, value as number] : (value as [number, number]);
    const upper = cardAntiJoin(hi + 1, `${alias}b`);
    return { driving: cardRange(lo, alias), joins: upper.joins, wheres: upper.wheres };
  },
};

function spaceInfoColumn(key: string, label: string, column: string, kind: Metric['kind'], operators: Operator[], enumValues?: readonly string[]): Metric {
  return {
    key,
    label,
    kind,
    operators,
    enumValues,
    compile(op, value) {
      const col = Prisma.sql`si.${Prisma.raw('`' + column + '`')}`;
      if (op === 'in') return { joins: [], wheres: [Prisma.sql`${col} IN (${Prisma.join(value as unknown[])})`] };
      if (op === 'gte') return { joins: [], wheres: [Prisma.sql`${col} >= ${value}`] };
      if (op === 'lt') return { joins: [], wheres: [Prisma.sql`${col} < ${value}`] };
      if (op === 'eq') return { joins: [], wheres: [Prisma.sql`${col} = ${value}`] };
      const [lo, hi] = value as [unknown, unknown];
      return { joins: [], wheres: [Prisma.sql`${col} >= ${lo} AND ${col} <= ${hi}`] };
    },
  };
}

const spaceColumn = (key: string, label: string, column: string, kind: Metric['kind'], operators: Operator[]): Metric => ({
  key,
  label,
  kind,
  operators,
  compile(op, value) {
    const col = Prisma.sql`s.${Prisma.raw('`' + column + '`')}`;
    const join = Prisma.sql`JOIN \`Space\` s ON s.\`id\` = si.\`spaceId\``;
    const where =
      op === 'gte'
        ? Prisma.sql`${col} >= ${value}`
        : op === 'lt'
          ? Prisma.sql`${col} < ${value}`
          : op === 'eq'
            ? Prisma.sql`${col} = ${value}`
            : Prisma.sql`${col} >= ${(value as [unknown, unknown])[0]} AND ${col} <= ${(value as [unknown, unknown])[1]}`;
    return { joins: [join], wheres: [where] };
  },
});

const petLevel: Metric = {
  key: 'petLevel',
  label: '펫 레벨',
  kind: 'number',
  operators: ['gte', 'lt', 'eq', 'between'],
  compile(op, value) {
    // Every space gets a Pet row at creation (space.service.ts:44), so this
    // join never drops a space that would otherwise match.
    const join = Prisma.sql`JOIN \`Pet\` p ON p.\`spaceId\` = si.\`spaceId\``;
    const col = Prisma.sql`p.\`level\``;
    const where =
      op === 'gte'
        ? Prisma.sql`${col} >= ${value}`
        : op === 'lt'
          ? Prisma.sql`${col} < ${value}`
          : op === 'eq'
            ? Prisma.sql`${col} = ${value}`
            : Prisma.sql`${col} >= ${(value as [unknown, unknown])[0]} AND ${col} <= ${(value as [unknown, unknown])[1]}`;
    return { joins: [join], wheres: [where] };
  },
};

export const SPACE_ENTITY: EntityDef = {
  key: 'space',
  label: '공간',
  base: Prisma.sql`\`SpaceInfo\` si`,
  listSelect: Prisma.sql`si.\`spaceId\`, si.\`name\`, si.\`type\`, si.\`locale\`, si.\`members\``,
  listOrder: Prisma.sql`si.\`spaceId\``,
  metrics: {
    cardCount,
    spaceType: spaceInfoColumn('spaceType', '공간 유형', 'type', 'enum', ['in', 'eq'], Object.values(SpaceType)),
    locale: spaceInfoColumn('locale', '공간 언어', 'locale', 'enum', ['in', 'eq'], Object.values(Locale)),
    members: spaceInfoColumn('members', '멤버 수', 'members', 'number', ['gte', 'lt', 'eq', 'between']),
    petLevel,
    coin: spaceColumn('coin', '코인', 'coin', 'number', ['gte', 'lt', 'eq', 'between']),
    isActive: spaceColumn('isActive', '활성 여부', 'isActive', 'boolean', ['eq']),
    createdAt: spaceColumn('createdAt', '생성일', 'createdAt', 'date', ['gte', 'lt', 'between']),
  },
};

export const ENTITIES = { space: SPACE_ENTITY } as const;

export function describeEntities(): EntityDescriptor[] {
  return Object.values(ENTITIES).map((entity) => ({
    key: entity.key,
    label: entity.label,
    metrics: Object.values(entity.metrics).map((m) => ({
      key: m.key,
      label: m.label,
      kind: m.kind,
      operators: m.operators,
      enumValues: m.enumValues,
    })),
  }));
}
```

- [ ] **Step 5: SQL 조립기 작성**

```ts
// src/admin/stats/stats.sql.ts
import { BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { Condition, EntityDef, Fragment } from './types/stats.types';

const TIMEOUT_HINT = Prisma.raw('/*+ MAX_EXECUTION_TIME(10000) */');

export function validateConditions(entity: EntityDef, conditions: Condition[]): void {
  for (const c of conditions) {
    const metric = entity.metrics[c.metric];
    if (!metric) {
      throw new BadRequestException(
        `알 수 없는 지표입니다: ${c.metric}. 사용 가능: ${Object.keys(entity.metrics).join(', ')}`,
      );
    }
    if (!metric.operators.includes(c.op)) {
      throw new BadRequestException(
        `${metric.label}은(는) ${c.op} 연산자를 지원하지 않습니다. 지원: ${metric.operators.join(', ')}`,
      );
    }
    assertValueShape(metric.label, metric.kind, metric.enumValues, c);
  }
}

function assertValueShape(
  label: string,
  kind: EntityDef['metrics'][string]['kind'],
  enumValues: readonly string[] | undefined,
  c: Condition,
): void {
  const bad = (msg: string) => {
    throw new BadRequestException(`${label}: ${msg}`);
  };

  if (c.op === 'between') {
    if (!Array.isArray(c.value) || c.value.length !== 2) bad('구간은 값 두 개가 필요합니다.');
    const [lo, hi] = c.value as [unknown, unknown];
    if (kind === 'number' && (typeof lo !== 'number' || typeof hi !== 'number')) bad('구간 값은 숫자여야 합니다.');
    if (kind === 'number' && (lo as number) > (hi as number)) bad('구간의 시작이 끝보다 큽니다.');
    return;
  }

  if (c.op === 'in') {
    if (!Array.isArray(c.value) || c.value.length === 0) bad('목록이 비어 있습니다.');
    if (enumValues) {
      for (const v of c.value as unknown[]) {
        if (!enumValues.includes(v as string)) bad(`허용되지 않는 값입니다: ${String(v)}`);
      }
    }
    return;
  }

  if (kind === 'number' && typeof c.value !== 'number') bad('숫자가 필요합니다.');
  if (kind === 'boolean' && typeof c.value !== 'boolean') bad('true 또는 false가 필요합니다.');
  if (kind === 'enum' && enumValues && !enumValues.includes(c.value as string)) {
    bad(`허용되지 않는 값입니다: ${String(c.value)}`);
  }
}

function compileAll(entity: EntityDef, conditions: Condition[]): Fragment[] {
  return conditions.map((c, i) => entity.metrics[c.metric].compile(c.op, c.value, `k${i}`));
}

/**
 * The fast plan is one shape: range-scan Card by order into a set of spaceIds,
 * then STRAIGHT_JOIN SpaceInfo. Letting the optimizer choose costs 334ms on a
 * filtered query against 23ms pinned. See the design doc section 5.
 */
function assembleFrom(entity: EntityDef, fragments: Fragment[]): { from: Prisma.Sql; rest: Prisma.Sql[] } {
  const driver = fragments.find((f) => f.driving);
  const joins = dedupeJoins(fragments.flatMap((f) => f.joins));

  if (!driver) return { from: Prisma.sql`FROM ${entity.base}`, rest: joins };

  return {
    from: Prisma.sql`FROM ${driver.driving} STRAIGHT_JOIN ${entity.base} ON si.\`spaceId\` = ${Prisma.raw(
      drivingAlias(fragments),
    )}.\`spaceId\``,
    rest: joins,
  };
}

/**
 * Two metrics on the same table each carry their own join - coin and isActive
 * both reach for Space. Emitting it twice is "Not unique table/alias". Card
 * anti-joins are never collapsed by this: each one carries its own alias, so
 * their text differs.
 */
function dedupeJoins(joins: Prisma.Sql[]): Prisma.Sql[] {
  const seen = new Set<string>();
  return joins.filter((join) => {
    if (seen.has(join.sql)) return false;
    seen.add(join.sql);
    return true;
  });
}

function drivingAlias(fragments: Fragment[]): string {
  const index = fragments.findIndex((f) => f.driving);
  return `k${index}`;
}

function whereClause(fragments: Fragment[]): Prisma.Sql {
  const wheres = fragments.flatMap((f) => f.wheres);
  if (!wheres.length) return Prisma.empty;
  return Prisma.sql`WHERE ${Prisma.join(wheres, ' AND ')}`;
}

export function buildCountSql(entity: EntityDef, conditions: Condition[]): Prisma.Sql {
  const fragments = compileAll(entity, conditions);
  const { from, rest } = assembleFrom(entity, fragments);
  const joins = rest.length ? Prisma.join(rest, ' ') : Prisma.empty;
  return Prisma.sql`SELECT ${TIMEOUT_HINT} COUNT(*) AS c ${from} ${joins} ${whereClause(fragments)}`;
}

export function buildListSql(entity: EntityDef, conditions: Condition[], page: number, size: number): Prisma.Sql {
  const fragments = compileAll(entity, conditions);
  const { from, rest } = assembleFrom(entity, fragments);
  const joins = rest.length ? Prisma.join(rest, ' ') : Prisma.empty;
  const offset = (page - 1) * size;
  return Prisma.sql`SELECT ${TIMEOUT_HINT} ${entity.listSelect} ${from} ${joins} ${whereClause(
    fragments,
  )} ORDER BY ${entity.listOrder} LIMIT ${size} OFFSET ${offset}`;
}
```

- [ ] **Step 6: 테스트 통과 확인**

```bash
yarn test src/admin/stats/stats.sql.spec.ts
```

기대: PASS, 17개 테스트 전부.

`drivingAlias`가 `k0`을 돌려주는데 `between`은 `k0`과 `k0b`를 쓴다. 별칭 테스트가 둘 다 확인하므로 여기서 어긋나면 잡힌다.

- [ ] **Step 7: 커밋**

```bash
git add src/admin/stats/
git commit -m "feat(stats): compile filter conditions into a pinned query plan

Metrics declare fragments rather than a single predicate: cardCount is a derived
table that has to lead the FROM clause, so a WHERE-shaped predicate cannot
express it.

Threshold questions all reduce to the same index tail. Fewer-than becomes an
anti-join, a range pairs a lower bound with an anti-join one past the top, and
equality is the range where both ends meet.

Conditions are checked against the registry before any SQL is built, so a metric
key or operator never reaches the query as text."
```

---

## Task 3: StatsService

**Files:**
- Create: `src/admin/stats/stats.service.ts`
- Test: `src/admin/stats/stats.service.spec.ts`

**Interfaces:**
- Consumes: `buildCountSql`, `buildListSql`, `validateConditions`, `ENTITIES`, `describeEntities`
- Produces:
  - `StatsService.getMetrics(): EntityDescriptor[]`
  - `StatsService.query(params: { entity: string; filters?: Condition[]; buckets: Condition[] }): Promise<{ rows: BucketResult[] }>`
  - `StatsService.list(params: { entity: string; filters?: Condition[]; bucket: Condition; page?: number; size?: number }): Promise<{ items: unknown[] }>`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/admin/stats/stats.service.spec.ts
import { BadRequestException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';

jest.mock(
  'src/database/services/database-manager.service',
  () => ({ DatabaseManagerService: class DatabaseManagerService {} }),
  { virtual: true },
);

const { DatabaseManagerService } = jest.requireMock('src/database/services/database-manager.service') as {
  DatabaseManagerService: new (...args: any[]) => unknown;
};
const { StatsService } = jest.requireActual('./stats.service') as {
  StatsService: new (...args: any[]) => any;
};

describe('StatsService', () => {
  let service: any;
  let prisma: { $queryRaw: jest.Mock };
  let databaseManager: { read: jest.Mock };

  beforeEach(async () => {
    prisma = { $queryRaw: jest.fn() };
    databaseManager = { read: jest.fn(async (cb: any) => cb(prisma)) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [StatsService, { provide: DatabaseManagerService, useValue: databaseManager }],
    }).compile();

    service = module.get(StatsService);
    jest.clearAllMocks();
  });

  it('counts each bucket and labels it', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ c: 1493n }]).mockResolvedValueOnce([{ c: 231n }]);

    const result = await service.query({
      entity: 'space',
      buckets: [
        { metric: 'cardCount', op: 'gte', value: 20 },
        { metric: 'cardCount', op: 'gte', value: 50 },
      ],
    });

    expect(result.rows).toEqual([
      { label: '질문 수 >= 20', count: 1493 },
      { label: '질문 수 >= 50', count: 231 },
    ]);
  });

  it('reads through the replica, never the primary', async () => {
    prisma.$queryRaw.mockResolvedValue([{ c: 1n }]);
    await service.query({ entity: 'space', buckets: [{ metric: 'cardCount', op: 'gte', value: 20 }] });
    expect(databaseManager.read).toHaveBeenCalled();
  });

  it('applies the shared filters to every bucket', async () => {
    prisma.$queryRaw.mockResolvedValue([{ c: 1n }]);
    await service.query({
      entity: 'space',
      filters: [{ metric: 'locale', op: 'in', value: ['ko'] }],
      buckets: [{ metric: 'cardCount', op: 'gte', value: 20 }],
    });
    const sent = prisma.$queryRaw.mock.calls[0][0];
    expect(sent.sql.replace(/\s+/g, ' ')).toContain('si.`locale` IN (?)');
  });

  it('reports one failing bucket without dropping the others', async () => {
    prisma.$queryRaw
      .mockResolvedValueOnce([{ c: 5n }])
      .mockRejectedValueOnce(new Error('Query execution was interrupted, maximum statement execution time exceeded'));

    const result = await service.query({
      entity: 'space',
      buckets: [
        { metric: 'cardCount', op: 'gte', value: 50 },
        { metric: 'cardCount', op: 'gte', value: 1 },
      ],
    });

    expect(result.rows[0]).toEqual({ label: '질문 수 >= 50', count: 5 });
    expect(result.rows[1]).toMatchObject({ count: null, error: 'timeout' });
  });

  it('rejects more than ten buckets', async () => {
    const buckets = Array.from({ length: 11 }, (_, i) => ({ metric: 'cardCount', op: 'gte' as const, value: i + 1 }));
    await expect(service.query({ entity: 'space', buckets })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown entity', async () => {
    await expect(service.query({ entity: 'ghost', buckets: [] })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('lists a page without counting again', async () => {
    prisma.$queryRaw.mockResolvedValueOnce([{ spaceId: 'a' }]);
    const result = await service.list({
      entity: 'space',
      bucket: { metric: 'cardCount', op: 'gte', value: 20 },
      page: 2,
    });
    expect(result.items).toEqual([{ spaceId: 'a' }]);
    expect(prisma.$queryRaw.mock.calls[0][0].sql).not.toContain('COUNT(');
  });

  it('exposes the metric catalog', () => {
    const entities = service.getMetrics();
    const space = entities.find((e: any) => e.key === 'space');
    expect(space.metrics.map((m: any) => m.key)).toContain('cardCount');
  });
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
yarn test src/admin/stats/stats.service.spec.ts
```

기대: FAIL — `Cannot find module './stats.service'`

- [ ] **Step 3: 서비스 작성**

```ts
// src/admin/stats/stats.service.ts
import { BadRequestException, Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DatabaseManagerService } from 'src/database/services/database-manager.service';
import { ENTITIES, describeEntities } from './stats.registry';
import { buildCountSql, buildListSql, validateConditions } from './stats.sql';
import { BucketResult, Condition, EntityDef } from './types/stats.types';

const MAX_BUCKETS = 10;
const CONCURRENCY = 3;
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

const OPERATOR_LABEL: Record<Condition['op'], string> = {
  gte: '>=',
  lt: '<',
  eq: '=',
  in: 'in',
  between: '~',
};

@Injectable()
export class StatsService {
  constructor(private readonly databaseManager: DatabaseManagerService) {}

  getMetrics() {
    return describeEntities();
  }

  async query(params: { entity: string; filters?: Condition[]; buckets: Condition[] }): Promise<{ rows: BucketResult[] }> {
    const entity = this.resolveEntity(params.entity);
    const filters = params.filters ?? [];
    const buckets = params.buckets ?? [];

    if (buckets.length > MAX_BUCKETS) {
      throw new BadRequestException(`한 번에 조회할 수 있는 조건은 ${MAX_BUCKETS}개까지입니다.`);
    }

    validateConditions(entity, filters);
    buckets.forEach((b) => validateConditions(entity, [b]));

    const rows = await mapWithConcurrency(buckets, CONCURRENCY, async (bucket) => {
      const label = this.describe(entity, bucket);
      try {
        const sql = buildCountSql(entity, [...filters, bucket]);
        const result = await this.databaseManager.read((prisma) => prisma.$queryRaw<{ c: bigint }[]>(sql));
        return { label, count: Number(result[0]?.c ?? 0) };
      } catch (error) {
        const message = error instanceof Error ? error.message : '';
        const timedOut = message.includes('maximum statement execution time');
        return { label, count: null, error: timedOut ? ('timeout' as const) : ('failed' as const) };
      }
    });

    return { rows };
  }

  async list(params: {
    entity: string;
    filters?: Condition[];
    bucket: Condition;
    page?: number;
    size?: number;
  }): Promise<{ items: unknown[] }> {
    const entity = this.resolveEntity(params.entity);
    const filters = params.filters ?? [];

    validateConditions(entity, filters);
    validateConditions(entity, [params.bucket]);

    const page = Math.max(1, params.page ?? 1);
    const size = Math.min(MAX_PAGE_SIZE, Math.max(1, params.size ?? DEFAULT_PAGE_SIZE));

    const sql = buildListSql(entity, [...filters, params.bucket], page, size);
    const items = await this.databaseManager.read((prisma) => prisma.$queryRaw<unknown[]>(sql));

    return { items };
  }

  private resolveEntity(key: string): EntityDef {
    const entity = ENTITIES[key as keyof typeof ENTITIES];
    if (!entity) {
      throw new BadRequestException(`알 수 없는 대상입니다: ${key}. 사용 가능: ${Object.keys(ENTITIES).join(', ')}`);
    }
    return entity;
  }

  private describe(entity: EntityDef, condition: Condition): string {
    const metric = entity.metrics[condition.metric];
    const value = Array.isArray(condition.value) ? condition.value.join(condition.op === 'between' ? '~' : ', ') : condition.value;
    if (condition.op === 'between') return `${metric.label} ${value}`;
    return `${metric.label} ${OPERATOR_LABEL[condition.op]} ${value}`;
  }
}

/** Runs tasks with a fixed number in flight, preserving input order in the result. */
async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;

  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await fn(items[index]);
    }
  });

  await Promise.all(workers);
  return results;
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
yarn test src/admin/stats/stats.service.spec.ts
```

기대: PASS, 8개 테스트 전부.

- [ ] **Step 5: 커밋**

```bash
git add src/admin/stats/stats.service.ts src/admin/stats/stats.service.spec.ts
git commit -m "feat(stats): run each bucket as its own count, three at a time

Buckets share the request's filters but are counted separately, so twenty-plus
and fifty-plus each get their own number and the overlap between them is the
caller's to read.

A bucket that times out reports as one failed row rather than taking the
response down: the operator still sees the counts that did come back."
```

---

## Task 4: API 라우트

**Files:**
- Modify: `src/admin/admin.controller.ts` (import, 생성자, 라우트 3개)
- Modify: `src/admin/admin.module.ts` (providers, exports)

**Interfaces:**
- Consumes: `StatsService`
- Produces: `GET /admin/stats/metrics`, `POST /admin/stats/query`, `POST /admin/stats/list`

- [ ] **Step 1: 모듈에 서비스 등록**

`src/admin/admin.module.ts`의 `providers` 배열 끝(`InteriorAdminService` 다음)과 `exports` 배열에 `StatsService`를 더하고, 파일 상단에 import를 추가한다.

```ts
import { StatsService } from './stats/stats.service';
```

- [ ] **Step 2: 컨트롤러에 라우트 추가**

`src/admin/admin.controller.ts` 상단에 import를 더한다.

```ts
import { StatsService } from './stats/stats.service';
import { Condition } from './stats/types/stats.types';
```

생성자 파라미터 목록 끝에 추가한다.

```ts
    private statsService: StatsService,
```

`analytics` 라우트 묶음 아래에 라우트 셋을 더한다.

```ts
  @TypedRoute.Get('/stats/metrics')
  async getStatsMetrics() {
    return this.statsService.getMetrics();
  }

  @TypedRoute.Post('/stats/query')
  async queryStats(@TypedBody() body: { entity: string; filters?: Condition[]; buckets: Condition[] }) {
    return this.statsService.query(body);
  }

  @TypedRoute.Post('/stats/list')
  async listStats(
    @TypedBody()
    body: { entity: string; filters?: Condition[]; bucket: Condition; page?: number; size?: number },
  ) {
    return this.statsService.list(body);
  }
```

`@TypedBody`가 아직 import되어 있지 않으면 `@nestia/core`에서 가져온다. 파일 상단의 기존 Nestia import 줄에 더한다.

- [ ] **Step 3: 빌드와 전체 테스트 확인**

```bash
cd ~/Documents/backend/mindqna-server
yarn build && yarn test src/admin/stats/
```

기대: 빌드 성공, stats 테스트 전부 PASS.

- [ ] **Step 4: 실제로 응답하는지 확인**

서버를 dev로 띄우고 세 라우트를 호출한다. `<TOKEN>`은 어드민 로그인으로 받은 accessToken이다.

```bash
yarn start:dev
```

다른 셸에서:

```bash
curl -s -H "Authorization: Bearer <TOKEN>" http://localhost:3000/admin/stats/metrics | head -c 400

curl -s -X POST http://localhost:3000/admin/stats/query \
  -H "Authorization: Bearer <TOKEN>" -H 'Content-Type: application/json' \
  -d '{"entity":"space","buckets":[{"metric":"cardCount","op":"gte","value":20},{"metric":"cardCount","op":"gte","value":50}]}'
```

기대: 두 번째 호출이 `{"rows":[{"label":"질문 수 >= 20","count":1493},{"label":"질문 수 >= 50","count":231}]}`. 개수는 dev 데이터 기준이며 스펙 §5의 실측값과 같아야 한다. **다르면 조립기가 조건을 잘못 옮긴 것이므로 멈추고 원인을 찾는다.**

- [ ] **Step 5: 커밋**

```bash
git add src/admin/admin.controller.ts src/admin/admin.module.ts
git commit -m "feat(stats): expose the metric catalog and the two query routes

The catalog is a GET because it is static per deploy. Query and list are POSTs
even though they only read: the condition set is a nested object, and a query
string carrying it is unreadable in a log or a bug report."
```

---

## Task 5: 어드민 API 클라이언트

**Files:**
- Create: `src/client/stats.ts`

**Interfaces:**
- Consumes: `POST /admin/stats/query`, `POST /admin/stats/list`, `GET /admin/stats/metrics`
- Produces:
  - `type StatsOperator`, `StatsCondition`, `StatsMetric`, `StatsEntity`, `StatsBucketRow`
  - `getStatsMetrics(): Promise<StatsEntity[]>`
  - `queryStats(body): Promise<{ rows: StatsBucketRow[] }>`
  - `listStats(body): Promise<{ items: StatsSpaceRow[] }>`

- [ ] **Step 1: 클라이언트 작성**

```ts
// src/client/stats.ts
import client from './@base';

export type StatsOperator = 'gte' | 'lt' | 'eq' | 'in' | 'between';
export type StatsMetricKind = 'number' | 'date' | 'enum' | 'boolean';

export interface StatsCondition {
  metric: string;
  op: StatsOperator;
  value: unknown;
}

export interface StatsMetric {
  key: string;
  label: string;
  kind: StatsMetricKind;
  operators: StatsOperator[];
  enumValues?: string[];
}

export interface StatsEntity {
  key: string;
  label: string;
  metrics: StatsMetric[];
}

export interface StatsBucketRow {
  label: string;
  count: number | null;
  error?: 'timeout' | 'failed';
}

export interface StatsSpaceRow {
  spaceId: string;
  name: string;
  type: string;
  locale: string;
  members: number;
}

export async function getStatsMetrics() {
  const res = await client.get<StatsEntity[]>('/stats/metrics');
  return res.data;
}

export async function queryStats(body: { entity: string; filters?: StatsCondition[]; buckets: StatsCondition[] }) {
  const res = await client.post<{ rows: StatsBucketRow[] }>('/stats/query', body);
  return res.data;
}

export async function listStats(body: {
  entity: string;
  filters?: StatsCondition[];
  bucket: StatsCondition;
  page?: number;
  size?: number;
}) {
  const res = await client.post<{ items: StatsSpaceRow[] }>('/stats/list', body);
  return res.data;
}
```

- [ ] **Step 2: 타입 확인**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
pnpm exec tsc --noEmit
```

기대: exit 0.

- [ ] **Step 3: 커밋**

```bash
git add src/client/stats.ts
git commit -m "feat(stats): add the admin client for the stats routes"
```

---

## Task 6: 조건 상태 리듀서

조건 목록 편집과 요청 페이로드 직렬화를 순수 함수로 분리한다. 화면이 없어도 테스트할 수 있고, 저장소 관행(`services/*.test.ts`)과 같은 자리다.

**Files:**
- Create: `src/components/page/stats/services/query-state.ts`
- Test: `src/components/page/stats/services/query-state.test.ts`

**Interfaces:**
- Consumes: `StatsCondition`, `StatsMetric` (Task 5)
- Produces:
  - `type Draft = { id: string; metric: string; op: StatsOperator; value: string }`
  - `type QueryState = { entity: string; filters: Draft[]; buckets: Draft[] }`
  - `initialQueryState(entity: string): QueryState`
  - `addDraft(state, lane, metric): QueryState`
  - `removeDraft(state, lane, id): QueryState`
  - `updateDraft(state, lane, id, patch): QueryState`
  - `toConditions(drafts: Draft[], metrics: StatsMetric[]): StatsCondition[]`
  - `draftError(draft: Draft, metric: StatsMetric | undefined): string | null`

- [ ] **Step 1: 실패하는 테스트 작성**

```ts
// src/components/page/stats/services/query-state.test.ts
import assert from 'node:assert/strict';
import test from 'node:test';

import type { StatsMetric } from '@/client/stats';
import { addDraft, draftError, initialQueryState, removeDraft, toConditions, updateDraft } from './query-state';

const cardCount: StatsMetric = {
  key: 'cardCount',
  label: '질문 수',
  kind: 'number',
  operators: ['gte', 'lt', 'eq', 'between'],
};

const locale: StatsMetric = {
  key: 'locale',
  label: '공간 언어',
  kind: 'enum',
  operators: ['in', 'eq'],
  enumValues: ['ko', 'en'],
};

const metrics = [cardCount, locale];

test('a fresh state has no conditions in either lane', () => {
  const s = initialQueryState('space');
  assert.equal(s.entity, 'space');
  assert.equal(s.filters.length, 0);
  assert.equal(s.buckets.length, 0);
});

test('adding a draft picks the metric first supported operator', () => {
  const s = addDraft(initialQueryState('space'), 'buckets', cardCount);
  assert.equal(s.buckets.length, 1);
  assert.equal(s.buckets[0].metric, 'cardCount');
  assert.equal(s.buckets[0].op, 'gte');
});

test('drafts in the two lanes do not share ids', () => {
  let s = addDraft(initialQueryState('space'), 'buckets', cardCount);
  s = addDraft(s, 'filters', locale);
  assert.notEqual(s.buckets[0].id, s.filters[0].id);
});

test('removing a draft leaves the other lane alone', () => {
  let s = addDraft(initialQueryState('space'), 'buckets', cardCount);
  s = addDraft(s, 'filters', locale);
  s = removeDraft(s, 'buckets', s.buckets[0].id);
  assert.equal(s.buckets.length, 0);
  assert.equal(s.filters.length, 1);
});

test('updating a draft replaces only the named fields', () => {
  let s = addDraft(initialQueryState('space'), 'buckets', cardCount);
  s = updateDraft(s, 'buckets', s.buckets[0].id, { value: '20' });
  assert.equal(s.buckets[0].value, '20');
  assert.equal(s.buckets[0].op, 'gte');
});

test('a numeric draft serialises to a number, not a string', () => {
  let s = addDraft(initialQueryState('space'), 'buckets', cardCount);
  s = updateDraft(s, 'buckets', s.buckets[0].id, { value: '20' });
  const [c] = toConditions(s.buckets, metrics);
  assert.equal(c.value, 20);
  assert.equal(typeof c.value, 'number');
});

test('a range draft serialises to a pair of numbers', () => {
  let s = addDraft(initialQueryState('space'), 'buckets', cardCount);
  s = updateDraft(s, 'buckets', s.buckets[0].id, { op: 'between', value: '10,19' });
  const [c] = toConditions(s.buckets, metrics);
  assert.deepEqual(c.value, [10, 19]);
});

test('an enum in-draft serialises to an array', () => {
  let s = addDraft(initialQueryState('space'), 'filters', locale);
  s = updateDraft(s, 'filters', s.filters[0].id, { value: 'ko,en' });
  const [c] = toConditions(s.filters, metrics);
  assert.deepEqual(c.value, ['ko', 'en']);
});

test('an empty draft is skipped rather than sent as a blank condition', () => {
  const s = addDraft(initialQueryState('space'), 'buckets', cardCount);
  assert.equal(toConditions(s.buckets, metrics).length, 0);
});

test('a non-numeric value on a number metric is reported', () => {
  const draft = { id: 'a', metric: 'cardCount', op: 'gte' as const, value: 'twenty' };
  assert.equal(draftError(draft, cardCount), '숫자를 입력하세요.');
});

test('a reversed range is reported', () => {
  const draft = { id: 'a', metric: 'cardCount', op: 'between' as const, value: '20,10' };
  assert.equal(draftError(draft, cardCount), '구간의 시작이 끝보다 큽니다.');
});

test('a valid draft reports no error', () => {
  const draft = { id: 'a', metric: 'cardCount', op: 'gte' as const, value: '20' };
  assert.equal(draftError(draft, cardCount), null);
});
```

- [ ] **Step 2: 테스트가 실패하는지 확인**

```bash
pnpm test
```

기대: FAIL — `Cannot find module './query-state'`

- [ ] **Step 3: 리듀서 작성**

```ts
// src/components/page/stats/services/query-state.ts
import type { StatsCondition, StatsMetric, StatsOperator } from '@/client/stats';

export type Lane = 'filters' | 'buckets';

export interface Draft {
  id: string;
  metric: string;
  op: StatsOperator;
  /** Kept as text so a half-typed value never becomes NaN mid-edit. */
  value: string;
}

export interface QueryState {
  entity: string;
  filters: Draft[];
  buckets: Draft[];
}

let sequence = 0;
function nextId(lane: Lane): string {
  sequence += 1;
  return `${lane}-${sequence}`;
}

export function initialQueryState(entity: string): QueryState {
  return { entity, filters: [], buckets: [] };
}

export function addDraft(state: QueryState, lane: Lane, metric: StatsMetric): QueryState {
  const draft: Draft = { id: nextId(lane), metric: metric.key, op: metric.operators[0], value: '' };
  return { ...state, [lane]: [...state[lane], draft] };
}

export function removeDraft(state: QueryState, lane: Lane, id: string): QueryState {
  return { ...state, [lane]: state[lane].filter((d) => d.id !== id) };
}

export function updateDraft(state: QueryState, lane: Lane, id: string, patch: Partial<Omit<Draft, 'id'>>): QueryState {
  return { ...state, [lane]: state[lane].map((d) => (d.id === id ? { ...d, ...patch } : d)) };
}

function parts(value: string): string[] {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function draftError(draft: Draft, metric: StatsMetric | undefined): string | null {
  if (!metric) return '알 수 없는 지표입니다.';
  if (!draft.value.trim()) return null; // 미입력은 전송에서 제외되므로 오류가 아니다

  if (draft.op === 'between') {
    const values = parts(draft.value);
    if (values.length !== 2) return '시작과 끝을 쉼표로 구분해 입력하세요.';
    if (metric.kind === 'number') {
      const [lo, hi] = values.map(Number);
      if (!Number.isFinite(lo) || !Number.isFinite(hi)) return '숫자를 입력하세요.';
      if (lo > hi) return '구간의 시작이 끝보다 큽니다.';
    }
    return null;
  }

  if (draft.op === 'in') {
    const values = parts(draft.value);
    if (!values.length) return '값을 하나 이상 입력하세요.';
    if (metric.enumValues) {
      const bad = values.find((v) => !metric.enumValues?.includes(v));
      if (bad) return `허용되지 않는 값입니다: ${bad}`;
    }
    return null;
  }

  if (metric.kind === 'number' && !Number.isFinite(Number(draft.value))) return '숫자를 입력하세요.';
  if (metric.kind === 'enum' && metric.enumValues && !metric.enumValues.includes(draft.value.trim())) {
    return `허용되지 않는 값입니다: ${draft.value.trim()}`;
  }
  return null;
}

export function toConditions(drafts: Draft[], metrics: StatsMetric[]): StatsCondition[] {
  const byKey = new Map(metrics.map((m) => [m.key, m]));

  return drafts.flatMap((draft) => {
    const metric = byKey.get(draft.metric);
    if (!metric || !draft.value.trim()) return [];
    if (draftError(draft, metric)) return [];

    const cast = (raw: string): unknown => {
      if (metric.kind === 'number') return Number(raw);
      if (metric.kind === 'boolean') return raw === 'true';
      return raw;
    };

    if (draft.op === 'between') {
      const [lo, hi] = parts(draft.value);
      return [{ metric: draft.metric, op: draft.op, value: [cast(lo), cast(hi)] }];
    }
    if (draft.op === 'in') {
      return [{ metric: draft.metric, op: draft.op, value: parts(draft.value).map(cast) }];
    }
    return [{ metric: draft.metric, op: draft.op, value: cast(draft.value.trim()) }];
  });
}
```

- [ ] **Step 4: 테스트 통과 확인**

```bash
pnpm test
```

기대: 기존 69개 + 새 12개 = 81개 PASS.

- [ ] **Step 5: 커밋**

```bash
git add src/components/page/stats/services/
git commit -m "feat(stats): hold query conditions as drafts the panel can edit

Values stay as text while the operator decides how to read them, so a half-typed
number never becomes NaN and a range keeps both ends visible during editing.

A draft with no value is skipped rather than sent as a blank condition: adding a
row and not filling it in should not narrow the result."
```

---

## Task 7: 조회 화면

**Files:**
- Create: `src/components/page/stats/StatsQueryPanel.tsx`
- Create: `src/components/page/stats/ConditionRow.tsx`
- Create: `src/pages/stats/index.tsx`
- Modify: `src/components/layout/main-menu.tsx` (`overviewMenu`에 항목 추가)

**Interfaces:**
- Consumes: `getStatsMetrics`, `queryStats` (Task 5), `query-state` (Task 6)
- Produces: `StatsQueryPanel` — 드릴다운은 Task 8이 이 파일에 붙인다

- [ ] **Step 1: 조건 행 컴포넌트 작성**

```tsx
// src/components/page/stats/ConditionRow.tsx
import type { StatsMetric, StatsOperator } from '@/client/stats';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FILTER_CONTROL_CLASS } from '@/components/shared/ui/filter-bar';
import type { Draft } from './services/query-state';
import { draftError } from './services/query-state';
import { X } from 'lucide-react';

const OPERATOR_LABEL: Record<StatsOperator, string> = {
  gte: '이상',
  lt: '미만',
  eq: '같음',
  in: '포함',
  between: '구간',
};

const PLACEHOLDER: Record<StatsOperator, string> = {
  gte: '20',
  lt: '20',
  eq: '20',
  in: 'ko, en',
  between: '10, 19',
};

interface ConditionRowProps {
  draft: Draft;
  metrics: StatsMetric[];
  onChange: (patch: Partial<Omit<Draft, 'id'>>) => void;
  onRemove: () => void;
}

function ConditionRow({ draft, metrics, onChange, onRemove }: ConditionRowProps) {
  const metric = metrics.find((m) => m.key === draft.metric);
  const error = draftError(draft, metric);

  return (
    <div className='space-y-1'>
      <div className='flex items-center gap-2'>
        <Select
          value={draft.metric}
          onValueChange={(metricKey) => {
            const next = metrics.find((m) => m.key === metricKey);
            onChange({ metric: metricKey, op: next?.operators[0], value: '' });
          }}
        >
          <SelectTrigger className={`${FILTER_CONTROL_CLASS} w-40`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {metrics.map((m) => (
              <SelectItem key={m.key} value={m.key}>
                {m.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={draft.op} onValueChange={(op) => onChange({ op: op as StatsOperator, value: '' })}>
          <SelectTrigger className={`${FILTER_CONTROL_CLASS} w-24`}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(metric?.operators ?? []).map((op) => (
              <SelectItem key={op} value={op}>
                {OPERATOR_LABEL[op]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Input
          className={`${FILTER_CONTROL_CLASS} w-44`}
          value={draft.value}
          placeholder={PLACEHOLDER[draft.op]}
          onChange={(e) => onChange({ value: e.target.value })}
        />

        <Button variant='ghost' size='icon' className='h-8 w-8' aria-label='조건 삭제' onClick={onRemove}>
          <X className='h-4 w-4' />
        </Button>
      </div>

      {error ? <p className='pl-1 text-xs text-destructive'>{error}</p> : null}
    </div>
  );
}

export default ConditionRow;
```

- [ ] **Step 2: 조회 패널 작성**

```tsx
// src/components/page/stats/StatsQueryPanel.tsx
import { getStatsMetrics, queryStats, type StatsBucketRow, type StatsCondition } from '@/client/stats';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { Plus } from 'lucide-react';
import { useState } from 'react';
import ConditionRow from './ConditionRow';
import { addDraft, initialQueryState, removeDraft, toConditions, updateDraft, type Lane } from './services/query-state';

function StatsQueryPanel() {
  const [state, setState] = useState(() => initialQueryState('space'));
  const [rows, setRows] = useState<StatsBucketRow[] | null>(null);

  const { data: entities } = useQuery({ queryKey: ['stats-metrics'], queryFn: getStatsMetrics });
  const entity = entities?.find((e) => e.key === state.entity);
  const metrics = entity?.metrics ?? [];

  const filters: StatsCondition[] = toConditions(state.filters, metrics);
  const buckets: StatsCondition[] = toConditions(state.buckets, metrics);

  // Conditions are edited freely; the query only runs when the operator asks for
  // it, so a half-typed threshold never reaches the server.
  const { refetch, isFetching } = useQuery({
    queryKey: ['stats-query', state.entity, filters, buckets],
    queryFn: async () => {
      const result = await queryStats({ entity: state.entity, filters, buckets });
      setRows(result.rows);
      return result;
    },
    enabled: false,
  });

  const lane = (name: Lane, title: string, hint: string) => (
    <section className='space-y-2'>
      <div className='flex items-center gap-2'>
        <h2 className='text-sm font-medium text-foreground'>{title}</h2>
        <span className='text-xs text-muted-foreground'>{hint}</span>
        <Button
          variant='outline'
          size='sm'
          className='ml-auto h-8'
          disabled={!metrics.length}
          onClick={() => setState((s) => addDraft(s, name, metrics[0]))}
        >
          <Plus className='mr-1 h-3.5 w-3.5' />
          조건 추가
        </Button>
      </div>

      {state[name].length ? (
        <div className='space-y-2'>
          {state[name].map((draft) => (
            <ConditionRow
              key={draft.id}
              draft={draft}
              metrics={metrics}
              onChange={(patch) => setState((s) => updateDraft(s, name, draft.id, patch))}
              onRemove={() => setState((s) => removeDraft(s, name, draft.id))}
            />
          ))}
        </div>
      ) : (
        <p className='text-xs text-muted-foreground'>조건이 없습니다.</p>
      )}
    </section>
  );

  return (
    <div className='space-y-6'>
      {lane('filters', '좁히기', '모든 조건에 함께 적용됩니다')}
      {lane('buckets', '묻기', '조건마다 개수를 따로 셉니다')}

      <Button onClick={() => refetch()} disabled={!buckets.length || isFetching}>
        {isFetching ? '조회 중' : '조회'}
      </Button>

      {rows ? (
        <table className='w-full border-t border-border text-sm'>
          <thead>
            <tr className='text-left text-xs text-muted-foreground'>
              <th className='py-2 font-medium'>조건</th>
              <th className='py-2 text-right font-medium'>개수</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.label} className='border-t border-border'>
                <td className='py-2'>{row.label}</td>
                <td className='py-2 text-right tabular-nums'>
                  {row.count === null ? (
                    <span className='text-destructive'>{row.error === 'timeout' ? '시간 초과' : '실패'}</span>
                  ) : (
                    row.count.toLocaleString()
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : null}
    </div>
  );
}

export default StatsQueryPanel;
```

- [ ] **Step 3: 페이지와 메뉴 등록**

```tsx
// src/pages/stats/index.tsx
import { getDefaultLayout } from '@/components/layout/default-layout';
import pageHeader from '@/components/layout/page-header';
import StatsQueryPanel from '@/components/page/stats/StatsQueryPanel';

function StatsPage() {
  return (
    <div>
      <StatsQueryPanel />
    </div>
  );
}

StatsPage.getLayout = getDefaultLayout;
StatsPage.pageHeader = pageHeader;

export default StatsPage;
```

`src/components/layout/main-menu.tsx`의 `overviewMenu` 배열에 `dashboard-questions` 항목 다음으로 추가한다. `ChartBar`를 `lucide-react` import에 더한다.

```tsx
  {
    id: 'stats-query',
    name: '조건별 통계',
    icon: <ChartBar className='w-4 h-4' />,
    link: { path: '/stats' },
  },
```

- [ ] **Step 4: 타입·린트 확인**

```bash
pnpm exec tsc --noEmit && pnpm lint
```

기대: 둘 다 exit 0.

- [ ] **Step 5: 화면이 실제로 답하는지 확인**

```bash
pnpm build && pnpm start -p 4000
```

브라우저에서 `/stats`를 연다. 확인할 것:

1. "묻기"에 조건 추가 → 지표 셀렉트에 "질문 수"가 서버에서 온 목록으로 채워진다
2. 연산자 "이상", 값 `20`으로 두고 조건을 하나 더 추가해 `50`
3. 조회 → 두 줄이 나오고 개수가 각각 1,493 / 231 (dev 기준)
4. 값에 `twenty`를 넣으면 행 아래에 "숫자를 입력하세요."가 뜨고 조회에서 제외된다

- [ ] **Step 6: 커밋**

```bash
git add src/components/page/stats/ src/pages/stats/ src/components/layout/main-menu.tsx
git commit -m "feat(stats): add the condition panel and the count table

Narrowing and asking are two lanes rather than one list because that is the shape
the requests arrive in: one common filter with several thresholds hung off it. A
single list could not say which part was which.

The query runs on the button, not on every keystroke, so a half-typed threshold
never reaches the server.

Metric and operator options come from the server catalog, so adding a metric
needs no admin deploy."
```

---

## Task 8: 드릴다운

**Files:**
- Create: `src/components/page/stats/StatsDrilldownSheet.tsx`
- Modify: `src/components/page/stats/StatsQueryPanel.tsx` (결과 행에 열기 버튼, 시트 마운트)

**Interfaces:**
- Consumes: `listStats` (Task 5), `StatsBucketRow`, `StatsCondition`
- Produces: `StatsDrilldownSheet`

- [ ] **Step 1: 시트 작성**

```tsx
// src/components/page/stats/StatsDrilldownSheet.tsx
import { listStats, type StatsCondition, type StatsSpaceRow } from '@/client/stats';
import AdminSideSheetContent from '@/components/shared/ui/admin-side-sheet-content';
import DataTable from '@/components/shared/ui/data-table';
import { Sheet } from '@/components/ui/sheet';
import { useQuery } from '@tanstack/react-query';
import type { ColumnDef } from '@tanstack/react-table';
import { useState } from 'react';
import { useResetOnChange } from '@/hooks/useResetOnChange';

const PAGE_SIZE = 50;

const columns: ColumnDef<StatsSpaceRow>[] = [
  { accessorKey: 'spaceId', header: '공간 ID', size: 220 },
  { accessorKey: 'name', header: '이름' },
  { accessorKey: 'type', header: '유형', size: 100 },
  { accessorKey: 'locale', header: '언어', size: 80 },
  { accessorKey: 'members', header: '멤버', size: 80 },
];

interface StatsDrilldownSheetProps {
  open: boolean;
  onClose: () => void;
  entity: string;
  filters: StatsCondition[];
  bucket: StatsCondition | null;
  label: string;
  total: number;
}

function StatsDrilldownSheet({ open, onClose, entity, filters, bucket, label, total }: StatsDrilldownSheetProps) {
  const [page, setPage] = useState(1);

  // A different bucket is a different result set, so it starts at page 1.
  useResetOnChange([label], () => setPage(1));

  const { data, isLoading } = useQuery({
    queryKey: ['stats-list', entity, filters, bucket, page],
    queryFn: () => listStats({ entity, filters, bucket: bucket!, page, size: PAGE_SIZE }),
    enabled: open && !!bucket,
  });

  return (
    <Sheet open={open} onOpenChange={(next) => !next && onClose()}>
      <AdminSideSheetContent title={label} description={`${total.toLocaleString()}개`} size='lg'>
        <DataTable
          columns={columns}
          data={data?.items ?? []}
          loading={isLoading}
          rowKey='spaceId'
          pagination={{ total, page, pageSize: PAGE_SIZE, onChange: (next) => setPage(next) }}
        />
      </AdminSideSheetContent>
    </Sheet>
  );
}

export default StatsDrilldownSheet;
```

- [ ] **Step 2: 패널에 연결**

`StatsQueryPanel.tsx`에서:

임포트를 더한다.

```tsx
import StatsDrilldownSheet from './StatsDrilldownSheet';
import { ChevronRight } from 'lucide-react';
```

`rows` 상태 옆에 열린 행을 담는 상태를 더한다. 조회 시점의 조건을 함께 붙잡아 두는 이유는, 조회 뒤 조건을 고쳐도 목록이 방금 본 숫자와 어긋나지 않게 하기 위해서다.

```tsx
  const [opened, setOpened] = useState<{ bucket: StatsCondition; filters: StatsCondition[]; row: StatsBucketRow } | null>(
    null,
  );
```

`queryFn`에서 `setRows` 옆에 조회 당시 조건을 보관한다.

```tsx
      const result = await queryStats({ entity: state.entity, filters, buckets });
      setRows(result.rows);
      setSnapshot({ filters, buckets });
      return result;
```

그 스냅샷 상태도 더한다.

```tsx
  const [snapshot, setSnapshot] = useState<{ filters: StatsCondition[]; buckets: StatsCondition[] } | null>(null);
```

개수 셀 뒤에 열기 버튼 열을 더한다.

```tsx
                <td className='w-10 py-2 text-right'>
                  {row.count ? (
                    <Button
                      variant='ghost'
                      size='icon'
                      className='h-7 w-7'
                      aria-label={`${row.label} 목록 열기`}
                      onClick={() =>
                        setOpened({
                          bucket: snapshot!.buckets[rows.indexOf(row)],
                          filters: snapshot!.filters,
                          row,
                        })
                      }
                    >
                      <ChevronRight className='h-4 w-4' />
                    </Button>
                  ) : null}
                </td>
```

`thead`에도 빈 `<th />`를 하나 더해 열 수를 맞춘다.

컴포넌트 마지막에 시트를 마운트한다.

```tsx
      <StatsDrilldownSheet
        open={!!opened}
        onClose={() => setOpened(null)}
        entity={state.entity}
        filters={opened?.filters ?? []}
        bucket={opened?.bucket ?? null}
        label={opened?.row.label ?? ''}
        total={opened?.row.count ?? 0}
      />
```

- [ ] **Step 3: 타입·린트 확인**

```bash
pnpm exec tsc --noEmit && pnpm lint
```

기대: 둘 다 exit 0. `useResetOnChange`는 `react-hooks/set-state-in-effect`를 피하기 위한 것이므로 새 경고가 늘지 않아야 한다.

- [ ] **Step 4: 끝단 확인**

```bash
pnpm build && pnpm start -p 4000
```

`/stats`에서:

1. "질문 수 이상 20" 조회 → 1,493
2. 그 행의 `>` 클릭 → 시트가 열리고 공간 50개가 표에 나온다. 헤더에 "1,493개"
3. 2페이지로 이동 → 다른 50개가 나오고, 네트워크 탭에서 `/stats/list`가 `page: 2`로 호출된다
4. 시트를 닫고 임계값을 50으로 바꿔 다시 조회 → 열면 231개짜리 목록
5. "좁히기"에 공간 언어 포함 `ko`를 더해 다시 조회 → 개수가 줄고(dev 기준 1,420), 목록도 ko 공간만

- [ ] **Step 5: 커밋**

```bash
git add src/components/page/stats/
git commit -m "feat(stats): open the matching spaces from a count

The count row carries the conditions it was produced from, so editing the panel
afterwards does not silently re-aim the list at a different question than the
number beside it.

The list reuses the count the query already returned rather than asking the
server to count again for every page."
```

---

## Task 9: 요청받은 질문으로 끝단 확인하고 문서화

**Files:**
- Modify: `docs/superpowers/specs/2026-09-06-admin-stats-query-design.md` (prod 실측 기록)

**Interfaces:**
- Consumes: 전부
- Produces: 없음

- [ ] **Step 1: 원래 질문에 답해본다**

배포된 어드민에서 "좁히기" 없이 "묻기"에 질문 수 이상 20, 질문 수 이상 50을 넣고 조회한다. 두 숫자를 기록한다.

- [ ] **Step 2: 같은 답이 SQL로도 나오는지 대조**

prod 읽기 복제본에 직접 물어 같은 값이 나오는지 본다.

```sql
SELECT COUNT(*) FROM
  (SELECT DISTINCT spaceId FROM Card WHERE `order` >= 20) k
  STRAIGHT_JOIN SpaceInfo si ON si.spaceId = k.spaceId;
```

어드민 결과와 다르면 조건 전달 어딘가가 틀린 것이므로 멈추고 원인을 찾는다.

- [ ] **Step 3: prod 실측을 스펙에 기록**

스펙 §5의 "prod 규모에서는 다시 재야 한다" 절 아래에 prod 수치를 표로 더한다. dev와 크게 다르면(예: 임계값 20이 1초를 넘으면) 그 사실과 함께 다음 수단을 적는다.

- [ ] **Step 4: 커밋**

```bash
git add docs/superpowers/specs/2026-09-06-admin-stats-query-design.md
git commit -m "docs: record the production numbers for the stats query"
```

---

## 자체 점검

**스펙 대응:**

| 스펙 | 태스크 |
|---|---|
| §2 질문 개수 = Card 수 | Task 2 `cardCount` |
| §2 임계값 독립 카운트 | Task 3 `query` |
| §2 AND만 | Task 2 `whereClause` |
| §2 개수 + 목록 | Task 7, 8 |
| §3 지표 레지스트리 | Task 2 |
| §3 replies 제외 | Task 2 레지스트리에 없음 |
| §4 연산자별 술어 | Task 2 `cardCount.compile` |
| §5 파생 + STRAIGHT_JOIN | Task 2 `assembleFrom` |
| §5 타임아웃 / 버킷 상한 / 동시성 3 / read 복제본 | Task 2 `TIMEOUT_HINT`, Task 3 |
| §5 재카운트 금지 | Task 8 (`total`을 넘겨받음) |
| §5 기본 정렬 spaceId | Task 2 `listOrder` |
| §6 API 3개 | Task 4 |
| §7 화면 / 드릴다운 / 리듀서 | Task 6, 7, 8 |
| §8 테스트 | Task 2, 3, 6 |
| §9 prod 인덱스 확인 | Task 1 |
| §11 순서 | 태스크 순서와 일치 |

**미해결로 남는 것:** 스펙 §9의 "삭제된 공간(`dueRemovedAt`) 포함 여부"는 요청자 확인이 필요해 이 계획에 반영하지 않았다. 현재 설계는 **포함**한다(`SpaceInfo`에 조건을 걸지 않으므로). 제외로 정해지면 `SPACE_ENTITY.base`에 `JOIN Space s ON s.id = si.spaceId AND s.dueRemovedAt IS NULL`을 더하는 한 줄 변경이다.

**스펙과 다른 것 둘:**

1. 드릴다운 페이징을 키셋 대신 `OFFSET`으로 간다. 사유는 위 "스펙과 의도적으로 다르게 가는 것"에 적었다.
2. 연산자 이름이 `lte`가 아니라 `lt`다. 스펙 §3의 타입 목록은 `lte`로 적었지만 §4의 술어 표는 "질문 < N"을 정의한다. 경계가 포함이냐 아니냐가 갈리는 자리이고, `between`이 `[A, B]` 양끝 포함이므로 `lt`(미만)와 짝이 맞는다. §3의 `lte`는 오기로 보고 `lt`로 통일한다.
