# 조건별 통계 조회 — 설계

- 날짜: 2026-09-06
- 범위: `mindqna-server` (지표 레지스트리·집계), `mindqna-admin` (조건 입력·결과·드릴다운)
- 선행 문서: `2026-08-26-push-target-filter-design.md` — `Card.order` 준조인과 인덱스 근거를 그대로 잇는다

## 1. 문제

운영팀이 슬랙으로 이런 걸 묻는다.

> 질문 20개/50개 이상 작성된 공간 개수 알 수 있을까요?

지금은 답할 방법이 콘솔에서 직접 SQL을 치는 것뿐이다. 물어보는 사람도, 답하는 사람도 매번 같은 일을 한다.

한 번 물어보고 끝나지도 않는다. 다음 주에는 펫 레벨이 궁금하고, 그다음에는 코인 잔액이 궁금하다. **바뀌는 것은 지표 자체다** — 대상이 공간이었다가 유저가 되기도 한다. 그래서 "질문 수 분포 페이지"를 하나 박아두는 것으로는 두 번째 요청에서 막힌다.

요청의 형태를 뜯어보면 셋이다.

| 부분 | 예 |
|---|---|
| 대상 | 공간 |
| 좁히는 조건 | (없음) — 있으면 "ko 공간 중에서" 같은 것 |
| 묻는 임계값 | 질문 ≥ 20, 질문 ≥ 50 — **한 번에 여러 개** |

## 2. 결정된 의미

**"질문 개수"는 발행된 `Card` 수다.** 답변(`Reply`)이 달렸는지는 보지 않는다. 공간에 질문이 몇 개 열렸느냐를 센다.

**임계값 여러 개는 각각 독립적으로 센다.** "20개 이상"과 "50개 이상"은 겹치는 집합이다. 20개 이상이 1,204개이고 50개 이상이 317개라면, 317개는 1,204개에 포함된다. 구간으로 쪼개 달라는 요청이 아니었으므로 누적으로 센다. 구간이 필요하면 `between`을 쓴다.

**좁히는 조건은 AND로만 묶는다.** OR과 중첩 그룹은 넣지 않는다 (§10).

**삭제 예정 공간도 센다.** `Space.dueRemovedAt`이 찍힌 공간을 제외하지 않는다. 묻는 것이 "질문 20개에 도달한 공간이 몇 개인가"이고, 누군가 삭제를 예약했다고 해서 그 공간이 20개에 도달했던 사실이 사라지지는 않는다. dev 기준 삭제 예정 공간은 33,156개 중 1개이고 질문 20개 이상에는 하나도 걸리지 않아 현재 수치에는 차이가 없다 — 다만 prod 비율은 다를 수 있다.

빼기로 바뀌면 `SPACE_ENTITY.base`에 `JOIN Space s ON s.id = si.spaceId AND s.dueRemovedAt IS NULL` 한 줄이다.

**결과는 개수와 목록 둘 다다.** 개수를 먼저 보여주고, 그 줄을 누르면 해당 공간 목록을 페이징해서 본다. 숫자만 답하고 끝나는 질문은 드물다 — "그럼 그 공간들 좀 보여주세요"가 거의 항상 따라온다.

## 3. 구조 — 지표를 코드가 아니라 데이터로 선언한다

조회 화면마다 쿼리를 하나씩 짜는 방식이면 지표가 늘 때마다 화면과 API가 같이 는다. 대신 **지표를 레지스트리에 선언**하고, 조회기는 그 선언을 읽어 SQL을 만든다.

```
지표 레지스트리 (서버)
   ↓ GET /admin/stats/metrics
어드민이 무엇을 물을 수 있는지 알게 됨 (셀렉트 옵션이 서버에서 온다)
   ↓ POST /admin/stats/query  { entity, filters[], buckets[] }
버킷마다 COUNT 하나씩
   ↓ POST /admin/stats/list   { entity, filters[], bucket, page }
드릴다운
```

지표 하나를 추가하는 일이 레지스트리 항목 하나를 쓰는 일이 된다. 어드민은 손대지 않는다 — 옵션 목록이 서버에서 오기 때문이다.

### 지표의 모양

지표는 컬럼이 아니라 **연산자별 술어 생성기**다. 이유는 §4에 있다.

```ts
type Operator = 'gte' | 'lt' | 'eq' | 'in' | 'between';

// 지표는 하나의 술어가 아니라 조각을 낸다. cardCount는 FROM 맨 앞에 와야 하는
// 파생 테이블이라 WHERE 모양의 술어로는 표현되지 않는다 (§5).
type Fragment = {
  driving?: Prisma.Sql;        // FROM을 이끌 수 있는 파생 테이블
  joins: Prisma.Sql[];
  wheres: Prisma.Sql[];
};

type Metric = {
  key: string;                 // 'cardCount'
  label: string;               // '질문 수'
  kind: 'number' | 'date' | 'enum' | 'boolean';
  operators: readonly Operator[];
  enumValues?: readonly string[];
  compile(op: Operator, value: unknown, alias: string): Fragment;
};

type EntityDef = {
  key: 'space';
  label: string;
  base: Prisma.Sql;            // 구동 지표가 없을 때의 FROM
  listSelect: Prisma.Sql;      // 드릴다운에 보여줄 컬럼
  listOrder: Prisma.Sql;
  metrics: Record<string, Metric>;
};
```

`alias`는 같은 지표가 한 질의에 여러 번 쓰일 때 파생 테이블이 충돌하지 않게 한다. 구동을 자처한 조각이 둘 이상이면 **첫 번째만 FROM을 이끌고 나머지는 평범한 세미조인**이 된다 — 버리면 조건이 조용히 사라져 틀린 숫자가 나온다.

### 초기 지표 — 공간

| key | 라벨 | 종류 | 출처 |
|---|---|---|---|
| `cardCount` | 질문 수 | number | `Card.order` 준조인 (§4) |
| `spaceType` | 공간 유형 | enum | `SpaceInfo.type` |
| `locale` | 공간 언어 | enum | `SpaceInfo.locale` |
| `members` | 멤버 수 | number | `SpaceInfo.members` |
| `petLevel` | 펫 레벨 | number | `Pet.level` |
| `coin` | 코인 | number | `Space.coin` |
| `isActive` | 활성 여부 | boolean | `Space.isActive` |
| `createdAt` | 생성일 | date | `Space.createdAt` |

`members`는 `SpaceInfo`에 비정규화돼 있어 조인 없이 읽는다. 안전한 이유는 증분이 아니라 **재계산**이기 때문이다 — `syncSpaceMembers`가 `Profile`을 매번 새로 세서 덮어쓴다(`space/member-count.util.ts`).

**`SpaceInfo.replies`는 지표로 쓰지 않는다.** 같은 자리에 있지만 성질이 다르다. 답변 생성 시 `increment: 1`만 하고(`card.service.ts:461`) 감소 경로가 없는데, `Reply`는 `Profile`과 `Card`에 대해 `onDelete: Cascade`이고 프로필은 30일(프리미엄 90일) 후 **하드 삭제**된다(`auth-profile-remove.cron.ts:29`). 지워진 답변이 카운터에서 빠지지 않으므로 이 값은 시간이 갈수록 실제보다 커진다. 누적 활동량으로는 의미가 있을지 몰라도 "지금 답변이 몇 개인가"에는 틀린 답을 준다.

답변 수 질문이 실제로 오면 `Reply`를 직접 세어 넣는다. 다만 `Reply`에는 `spaceId`가 없어 `Card`를 거쳐야 하므로 `cardCount`처럼 싸지 않다 — 그때 비용을 재고 결정한다.

유저 대상은 첫 버전에 넣지 않는다 (§10). 레지스트리 구조가 `EntityDef` 배열이므로 나중에 항목 하나를 더하는 일이 된다.

## 4. 질문 개수 — 임계값은 `(order, spaceId)` 인덱스의 꼬리다

`Card.order`는 발급 시 `totalCards + 1`로 매겨지므로(`card.service.ts:179`) **공간의 최대 order가 곧 카드 수**다. 여기까지는 선행 문서 §4와 같다.

`Space.cardOrder`는 쓰지 않는다. 이름이 비슷하지만 템플릿 시퀀스 포인터라(`card.service.ts:287`) 건너뛴 템플릿이 있으면 실제 카드 수보다 크다.

### 일을 하는 인덱스는 `Card_order_spaceId_key`다

선행 문서는 `idx_card_space_order`(= `(spaceId, order)`)가 seek로 답한다고 적었다. **dev에는 그 인덱스가 없다.** `schema.prisma`가 선언만 하고 DDL이 적용되지 않았다(§9). 실제로 일하는 것은 `@@unique([order, spaceId])`가 만든 `Card_order_spaceId_key`, 즉 **`(order, spaceId)`** 다.

컬럼 순서가 반대라는 게 핵심이다. `(order, spaceId)`에서 `order >= N`은 **인덱스의 꼬리 구간 하나**이고, 그 구간을 읽으면 조건을 만족하는 `spaceId`가 바로 나온다. 커버링이라 테이블에 내려가지도 않는다. 반대로 `(spaceId, order)`였다면 공간마다 따로 확인해야 한다.

그래서 비용이 공간 수가 아니라 **임계값 위에 있는 카드 수**를 따른다. dev 실측:

| 임계값 | 위쪽 카드 수 | 매칭 공간 | 소요 |
|---|---|---|---|
| ≥ 1 | 193,784 | 33,136 | 202ms |
| ≥ 10 | 58,816 | 6,023 | 53ms |
| ≥ 20 | 22,764 | 1,493 | 22ms |
| ≥ 50 | 4,248 | 231 | 10ms |
| ≥ 100 | 80 | 9 | 7ms |

**높은 임계값이 더 싸다.** 요청받은 20/50은 싼 쪽에 있고, 비싼 구간은 "질문 1개 이상" 같은 사실상 전수 조회다.

### 연산자를 술어로

| 질문 | 형태 |
|---|---|
| 질문 ≥ N | `JOIN (SELECT DISTINCT spaceId FROM Card WHERE order >= N)` |
| 질문 < N | 같은 파생을 `LEFT JOIN` 하고 `IS NULL` |
| 질문 A~B | `JOIN (>= A)` + `LEFT JOIN (>= B+1) IS NULL` |
| 질문 = N | `JOIN (>= N)` + `LEFT JOIN (>= N+1) IS NULL` |

전부 같은 인덱스 꼬리 구간을 쓴다. `cardCount`의 `predicate`는 이 표를 구현한다. 이것이 지표를 "컬럼"이 아니라 **연산자별 술어 생성기**로 정의하는 이유다 — `cardCount`에는 셀 컬럼이 아예 없다.

## 5. 성능 — 측정이 초안을 뒤집었다

이 절의 초안은 두 가지를 주장했다. 필터가 없으면 히스토그램 1회 통과가 유리하고, 필터가 붙으면 EXISTS가 유리하니 요청 형태로 갈래를 고르자는 것이었다. **dev 실측 결과 둘 다 틀렸다.** 기록으로 남긴다 — 같은 추론을 다시 하지 않기 위해서다.

측정 대상: dev DB (`mindqna`), 공간 33,156 / 카드 193,784 / 답변 365,133. 각 수치는 5회 중앙값.

### 틀린 것 1 — 히스토그램은 느리다

`GROUP BY spaceId`가 커버링 인덱스 순차 통과로 풀릴 것이라 봤다. `EXPLAIN`은 `Using temporary; Using filesort`와 187,661행짜리 파생 테이블을 보여준다. 커버링이 아니다.

| | 질문 ≥ 20 |
|---|---|
| 히스토그램 1회 통과 | 306ms |
| 직접 세기 | 22ms |

버킷 10개를 몰아줘도 히스토그램 306ms 대 개별 실행 584ms(동시성 3)로, 차이가 크지 않으면서 항상 300ms를 낸다. **히스토그램은 버린다.**

따라서 "버킷 배열이 곧 효율적인 모양"이라던 초안의 주장도 취소한다. 배열로 받는 것은 그냥 API 편의다 — 22ms짜리를 몇 번 더 도는 것뿐이다.

### 틀린 것 2 — 필터가 붙으면 오히려 느려졌다

`EXISTS` 형태에 필터를 얹으면 빨라질 것이라 봤다. 반대였다.

| 조건 | EXISTS |
|---|---|
| 필터 없음 | 33ms |
| `type='couple'` | 74ms |
| `locale='ko'` | **334ms** |

필터가 옵티마이저를 `SpaceInfo` 구동으로 유혹하면서 `(order, spaceId)` 꼬리 구간을 쓰는 계획을 잃는다. 선행 문서 §5가 겪은 것과 같은 종류의 사고다.

### 채택한 형태 — 파생 테이블 + STRAIGHT_JOIN

빠른 계획은 하나뿐이다. **Card를 order로 범위 스캔해 `spaceId` 집합을 먼저 만들고, 그 집합으로 `SpaceInfo`를 짚는다.** 옵티마이저에 맡기지 말고 그 순서를 SQL로 못박는다.

```sql
SELECT COUNT(*) FROM
  (SELECT DISTINCT spaceId FROM Card WHERE `order` >= 20) k
  STRAIGHT_JOIN SpaceInfo si ON si.spaceId = k.spaceId
WHERE si.locale = 'ko'
```

`EXPLAIN`이 원하는 계획을 정확히 보여준다.

```
DERIVED Card  type=range   key=Card_order_spaceId_key  rows=53,496  Using index
PRIMARY si    type=eq_ref  key=PRIMARY                 rows=1
```

질문 ≥ 20, 필터별 5회 중앙값:

| 조건 | EXISTS | 파생 | 파생+STRAIGHT_JOIN | 결과 |
|---|---|---|---|---|
| 필터 없음 | 33ms | 22ms | **22ms** | 1,493 |
| `locale='ko'` | 334ms | 24ms | **23ms** | 1,420 |
| `type='couple'` | 74ms | 26ms | **22ms** | 489 |
| `ko + couple` | 71ms | 51ms | **22ms** | 454 |
| `members >= 3` | 73ms | 25ms | **22ms** | 222 |

세 형태의 개수는 전부 일치한다. 파생 테이블만으로도 대개 빠르지만 `ko + couple`에서 51ms로 흔들린다 — `STRAIGHT_JOIN`이 그걸 22ms로 고정한다. **어떤 필터 조합에서도 평평하다는 것**이 이 형태의 값어치다.

즉 **선택도 분기는 필요 없다.** 질의 형태는 하나다.

### 그래서 캐시도, 요약 테이블도 넣지 않는다

22ms짜리 쿼리에 10분 캐시를 얹으면 신선도만 잃는다. 초안이 두었던 히스토그램 캐시와, 그것이 무너질 때 물러설 자리로 설계했던 `SpaceStat` 요약 테이블은 둘 다 폐기한다. 유지할 상태가 줄고, 통계가 조용히 틀릴 경로도 함께 사라진다.

### 남는 비싼 경우

- **낮은 임계값.** "질문 1개 이상"은 202ms다. 사실상 전수 조회라 어쩔 수 없고, 이 정도면 견딘다.
- **`SpaceInfo` 밖의 필터.** `Space.coin` 같은 컬럼은 조인이 하나 더 붙는다. 측정하지 않았다 — 실제 요청이 오면 그때 잰다.

### 안전장치

- 버킷은 요청당 최대 10개. 그 이상은 400.
- 쿼리마다 `SELECT /*+ MAX_EXECUTION_TIME(10000) */`. 넘으면 해당 버킷만 실패로 표시하고 나머지는 반환한다.
- 버킷 병렬 실행은 동시성 3.
- 모든 쿼리는 `databaseManager.read()`로 읽기 복제본을 탄다.

### 드릴다운

목록은 개수와 비용 구조가 다르므로 따로 잰다. 질문 ≥ 20, 50행 기준:

| | 소요 |
|---|---|
| 1페이지, `ORDER BY spaceId` | 21ms |
| 21페이지, `OFFSET 1000` | 34ms |
| 21페이지, 키셋 커서 | 20ms |
| `ORDER BY createdAt DESC` | 74ms |

**총 개수를 다시 세지 않는다.** 조회 단계가 이미 알고 있으므로 `POST /stats/list`는 그 값을 받아 페이징 정보를 만든다. 페이지마다 `COUNT(*)`를 다시 도는 것이 가장 흔한 실수다.

**OFFSET 대신 키셋을 쓴다.** 21페이지에서는 34ms 대 20ms로 차이가 작지만, OFFSET은 깊어질수록 버리는 행이 늘고 키셋은 평평하다.

**기본 정렬은 `spaceId`다.** `createdAt DESC`는 `Space` 조인과 정렬이 붙어 3.5배가 된다. 정렬 옵션은 요청이 실제로 오면 그때 인덱스와 함께 판단한다.

### prod 규모에서는 다시 재야 한다

dev는 공간 33,156개다. 선행 문서의 `EXPLAIN`에는 `SpaceInfo` 291,311행, `Profile` 581,549행이 찍혀 있다 — **약 9배 큰 다른 데이터베이스**에서 측정한 것이다.

이 설계의 비용은 임계값 위 카드 수를 따르므로 규모에 대체로 선형일 것으로 보지만, 확인한 것은 아니다. 배포 전 prod에서 같은 표를 다시 뜬다. 특히 `Card_order_spaceId_key`가 prod에도 있는지 먼저 확인해야 한다 — 없으면 이 설계 전체가 성립하지 않는다.

### prod 실측 (2026-09-06) — dev 수치가 유지되지 않는다

**prod 규모는 dev의 9배가 아니다.** 공간은 9배지만 카드는 **27배**다.

| | dev | prod |
|---|---|---|
| 공간 | 33,156 | 297,601 |
| 카드 | 193,784 | **5,232,186** |

이 설계의 비용은 공간 수가 아니라 임계값 위 카드 수를 따르므로, 카드 쪽 배율이 그대로 비용이 된다. 질문 ≥ 20, 5회가 아닌 단발 측정:

| 형태 | 필터 없음 | `locale='ko'` |
|---|---|---|
| A 파생+STRAIGHT_JOIN (채택한 것) | 2,998ms (콜드 9,311ms) | 3,237ms |
| B EXISTS | 9,587ms | 2,690ms |
| C Card 단독 | 12,947ms | — |
| **히스토그램 1회 통과** | **4,170ms — 모든 임계값 동시** | 해당 없음 |

`질문 ≥ 1`은 **25,561ms**다.

`EXPLAIN`이 원인을 말한다. 파생 테이블이 `Using temporary`로 **2,507,403행**을 물리화한다. dev에서는 이 구간이 22,764행이었다. `DISTINCT`가 감당하는 양이 100배 넘게 달라졌다.

**§5의 판단 기준(필터 조회 1초)을 3배로 넘긴다.** 그리고 코드의 `MAX_EXECUTION_TIME(10000)`이 10초인데 콜드 상태의 9.3초는 그 문턱에 붙어 있고, `≥ 1`은 확실히 넘는다.

### 초안이 옳았고 dev 측정이 오도했다

이 문서의 §5 초안은 "필터가 없으면 히스토그램 1회 통과가 유리하다"고 썼다가 dev 측정(306ms 대 22ms)으로 폐기했다. **prod에서는 초안이 맞다.** 히스토그램 4,170ms 한 번이 20/50/100을 모두 답하는데, 같은 셋을 A로 따로 돌면 약 5초다.

dev가 오도한 이유는 규모가 아니라 **모양**이다. dev에는 `idx_card_space_order`가 없고 prod에는 있으며, 카드 분포도 다르다. 작은 사본에서 고른 실행 계획이 큰 원본에서 최적이라는 보장이 없다.

### 구현 후 dev 재확인 (2026-09-06)

조립기가 실제로 만든 SQL을 dev에 실행해 설계 수치와 대조했다. 전부 일치한다.

| 조건 | 개수 |
|---|---|
| 질문 ≥ 20 | 1,493 |
| 질문 ≥ 50 | 231 |
| ko + 질문 ≥ 20 | 1,420 |
| couple + 질문 ≥ 20 | 489 |
| 멤버 ≥ 3 + 질문 ≥ 20 | 222 |

경계도 확인했다. `질문 10~19`(4,530) + `질문 ≥ 20`(1,493) = 6,023이고 `질문 ≥ 10`도 6,023이다. §4의 `B+1` 처리가 맞다는 뜻이다.

`coin ≥ 1000 AND 활성`은 `Space` 조인이 두 번 필요한 조합인데 SQL 오류 없이 205를 돌려준다 — 조인 중복 제거가 동작한다.

**prod 실측은 아직 하지 않았다.** `Card_order_spaceId_key`가 prod에 있는지도 확인 전이다. 배포 전에 둘 다 해야 한다.

## 6. 서버

### 새 파일

```
src/admin/stats/
  stats.service.ts          집계·목록 실행
  stats.registry.ts         EntityDef / Metric 선언
  stats.sql.ts              조건 → Prisma.Sql 조립
  types/stats.types.ts
  stats.service.spec.ts
  stats.sql.spec.ts
```

`analytics/`와 나란히 두되 합치지 않는다. `analytics`는 대시보드용 고정 집계이고 이쪽은 임의 조건 조회다 — 바뀌는 이유가 다르다.

### API

`admin.controller.ts`에 Nestia `@TypedRoute`로 셋을 더한다. 기존 analytics 라우트와 같은 컨트롤러·같은 가드(`admin.guard.ts`)다.

```
GET  /admin/stats/metrics          → EntityDef[] (지표 카탈로그)
POST /admin/stats/query            → 버킷별 개수
POST /admin/stats/list             → 드릴다운 목록
```

조회인데 POST인 이유는 조건이 중첩 객체라 쿼리스트링에 담으면 읽을 수 없어지기 때문이다. 기존 analytics 라우트가 GET인 것은 필터가 평평해서다.

```jsonc
// POST /admin/stats/query
{ "entity": "space",
  "filters": [{ "metric": "locale", "op": "in", "value": ["ko"] }],
  "buckets": [{ "metric": "cardCount", "op": "gte", "value": 20 },
              { "metric": "cardCount", "op": "gte", "value": 50 }] }

// →
{ "rows": [{ "label": "질문 수 >= 20", "count": 1204, "tookMs": 340 },
           { "label": "질문 수 >= 50", "count": 317,  "tookMs": 290 }] }
```

버킷은 `Promise.all`로 병렬 실행하되 동시성 3으로 제한한다. 복제본이라도 10개를 한꺼번에 던질 이유가 없다.

### 에러

| 상황 | 응답 |
|---|---|
| 없는 지표 키 | 400, 어떤 키가 없는지 명시 |
| 지표가 지원하지 않는 연산자 | 400, 지원 목록 동봉 |
| 값 타입 불일치 | 400 |
| 버킷 10개 초과 | 400 |
| 타임아웃 | 200, 해당 행만 `{ error: 'timeout' }` |

레지스트리에 없는 키는 SQL에 닿기 전에 막힌다. 사용자 입력이 식별자로 쓰이는 경로가 없다.

## 7. 어드민

### 페이지

`/dashboard/stats` — 기존 대시보드 탭 옆에 둔다. 라우트는 `src/pages/dashboard/stats.tsx`, 컴포넌트는 `src/components/page/stats/`.

### 화면

```
[대상: 공간 ▾]

좁히기          [+ 조건]
  공간 언어  in   [ko ×]                    [삭제]

묻기            [+ 임계값]
  질문 수    >=   [20]                      [삭제]
  질문 수    >=   [50]                      [삭제]

                                      [조회]

조건            개수        
질문 수 >= 20   1,204   >
질문 수 >= 50     317   >
```

셀렉트 옵션은 전부 `GET /admin/stats/metrics` 응답에서 만든다. 지표를 서버에 추가하면 어드민 배포 없이 화면에 나타난다.

"좁히기"와 "묻기"를 나눈 이유는 요청의 형태가 실제로 그렇기 때문이다 — 공통 조건 하나에 임계값 여러 개가 붙는다. 둘을 한 목록으로 합치면 어느 것이 공통이고 어느 것이 버킷인지 사용자가 표현할 수 없다.

### 드릴다운

결과 행의 `>`를 누르면 `AdminSideSheetContent`에 `DataTable`을 띄우고 `POST /admin/stats/list`를 페이징 호출한다. 목록 컬럼은 서버 `listSelect`가 정한다.

### 상태 관리

조건 목록은 순수 리듀서로 분리한다 — `src/components/page/stats/services/query-state.ts`. 조건 추가/삭제/수정과 요청 페이로드 직렬화가 여기 모인다. 저장소 관행대로 `services/*.test.ts`로 테스트한다(`push-form-payload.test.ts`와 같은 자리).

`@tanstack/react-query`로 조회하되 `enabled: false`로 두고 조회 버튼에서 `refetch()`한다. 조건을 고치는 동안 자동으로 쿼리가 나가면 안 된다.

## 8. 테스트

| 대상 | 위치 | 무엇을 |
|---|---|---|
| 술어 조립 | `stats.sql.spec.ts` | 연산자별 SQL 모양, 특히 §4의 EXISTS 4종 |
| 레지스트리 검증 | `stats.sql.spec.ts` | 없는 키·미지원 연산자·타입 불일치가 400으로 막히는지 |
| 서비스 | `stats.service.spec.ts` | `analytics.service.spec.ts`와 같은 방식으로 prisma를 목킹 |
| 조건 리듀서 | `query-state.test.ts` | 추가/삭제/수정, 페이로드 직렬화 |

`cardCount`의 `between`과 `eq`가 `NOT EXISTS` 짝을 제대로 만드는지는 반드시 테스트한다. 경계에서 틀리기 쉽고(`B+1`, `N+1`), 틀려도 그럴듯한 숫자가 나와서 눈으로는 못 잡는다.

DB에 실제로 붙는 통합 테스트는 넣지 않는다. 저장소에 그런 하네스가 없고, 이 작업을 위해 만드는 것은 범위를 넘는다. 대신 §5의 dev 실측이 그 자리를 대신한다.

## 9. 확인하지 못한 것

- **prod 규모에서의 실측.** §5의 계획은 dev 기준이고 prod 통계는 다르다. 선행 문서에서 옵티마이저 추정이 실제의 2배로 어긋난 전례가 있다.
- **읽기 복제본 지연.** 방금 만든 공간이 결과에 빠질 수 있다. 통계 용도라 문제없을 것으로 보지만 지연 폭을 모른다.
- **prod의 인덱스 상태.** dev에는 `schema.prisma`가 선언한 `idx_card_space_order`와 `idx_card_space_created`가 **없다.** 선언만 되고 DDL이 적용되지 않았다. 이 설계는 그 둘이 아니라 `Card_order_spaceId_key`에 기대는데, 그건 prod에도 있다고 볼 수 있다 — 아래 표 참조. 다만 `@@index` 두 개가 스키마에만 존재한다는 사실 자체는 별개로 정리할 만하다.
- **`SpaceInfo`의 중복 인덱스.** dev에 `idx_spaceinfo_type_locale`과 `SpaceInfo_type_locale_idx`가 같은 `(type, locale)`로 둘 다 있고, `SpaceInfo_spaceId_idx`는 PK와 겹친다. 이 기능과 무관한 기존 부채지만 쓰기 비용을 갉아먹으므로 별도로 볼 만하다.

### 날짜는 UTC 자정을 뜻한다

`생성일` 지표에 `2026-01-31`을 넣으면 **UTC 자정**이다. KST 09:00이지 한국 시간 자정이 아니다. `Space.createdAt`이 UTC로 저장되므로 비교 대상과 같은 축이지만, 운영팀이 "1월 31일"이라 말할 때 뜻하는 것과는 9시간 어긋날 수 있다.

이게 실제로 맞는지는 추론이 아니라 dev 실측으로 확인했다. 가장 데이터가 많은 달을 두 방식으로 세어 비교했다.

```sql
-- 독립 집계
SELECT DATE_FORMAT(createdAt,'%Y-%m') m, COUNT(*) FROM Space GROUP BY m;   -- 2024-08 -> 14940
```

조회기의 `생성일 구간 2024-08-01 ~ 2024-08-31`도 **14940**이 나온다. `DATE_FORMAT`은 저장된 값을 그대로 묶고 시간대 변환을 하지 않으므로, 만약 바인딩되는 인스턴트가 KST로 밀려 있었다면 양쪽 경계가 9시간씩 이동해 두 수가 우연이 아닌 한 어긋난다. 정확히 일치한다는 것이 **바인딩 값과 저장 값이 같은 축(UTC)에서 비교된다는 증거**다.

같은 달을 마지막 날에서 쪼개도 합이 유지되고(`1~30일` + `31일` = 14940), `>= 2026-01-01`(2)과 `< 2026-01-01`(33,154)은 전체 33,156을 정확히 분할한다.

### 확인해서 해소한 것

설계가 이 사실들에 기대고 있으므로 근거를 남긴다.

| 확인한 것 | 결과 | 어디에 쓰였나 |
|---|---|---|
| `Card` 삭제 경로 | **없다** — 생성만 한다 | `order` 최댓값이 곧 카드 수라는 전제 (§4) |
| 모든 `Space`에 `SpaceInfo`가 있는가 | **있다** — `space.create`가 같은 트랜잭션에서 중첩 생성한다(`space/space.service.ts:44`) | `SpaceInfo`를 구동 테이블로 써도 공간이 누락되지 않음 |
| 모든 `Space`에 `Pet`이 있는가 | **있다** — 같은 자리에서 `pet: { create: {} }`, 레벨 기본값 1 | `petLevel` 지표에 "펫 없는 공간" 예외 처리가 불필요 |
| `SpaceInfo.members` 갱신 방식 | **재계산** — `syncSpaceMembers`가 `Profile`을 새로 센다 | 지표로 채택 |
| `SpaceInfo.replies` 갱신 방식 | **증분만**, 감소 없음 | 지표에서 제외 (§3) |
| prod에 `Card_order_spaceId_key`가 있는가 | **있다** — `card.service.ts:99`의 `findUnique({ where: { order_spaceId } })`는 Prisma가 `@@unique([order, spaceId])`가 있을 때만 만드는 접근자다. 없으면 카드 상세 조회가 프로덕션에서 깨진다 | §4의 인덱스 전제 |

## 10. 하지 않기로 한 것

- **필터 × 임계값 큐브.** `GROUP BY locale, type, mx`로 만들면 필터 붙은 임계값 질문도 한 통과로 풀린다. 표도 작다. 그런데 그런 조합 요청이 실제로 왔는지 모른다 — 지금까지 온 것은 필터 없는 임계값뿐이다. 오면 넣는다.
- **자유 SQL 입력.** 유연성은 최대지만 운영 DB에 임의 쿼리가 나간다. 무거운 쿼리 하나가 서비스에 영향을 주고, 드릴다운을 일반화할 수 없다. 레지스트리에 지표를 추가하는 비용이 그만큼 크지 않다.
- **유저 대상.** 구조는 열어두되 첫 버전은 공간만. 실제로 유저 질문이 오는지 보고 넣는다.
- **OR 조건과 중첩 그룹.** 지금까지 온 요청은 전부 AND였다. 넣는 순간 UI와 SQL 조립이 같이 복잡해진다.
- **저장된 질의.** 같은 질문이 반복되는 것이 확인되면 그때. 지금은 반복되는 것이 "질문 개수"라는 축이지 특정 임계값이 아니다.
- **CSV 내보내기.** 드릴다운 목록으로 충분한지 먼저 본다.
- **차트.** 개수 두 줄에 그래프는 과하다.

## 11. 순서

1. 레지스트리 + SQL 조립 + 테스트 (서버, DB 없이)
2. API 3개 + 서비스
3. 어드민 조건 패널 + 결과 표
4. 드릴다운
5. 요청받은 질문("질문 20/50개 이상")으로 끝단 확인
6. prod에서 §5의 표를 다시 떠서 dev 수치가 유지되는지 확인
