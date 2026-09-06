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
type Operator = 'gte' | 'lte' | 'eq' | 'in' | 'between';

type Metric = {
  key: string;                 // 'cardCount'
  label: string;               // '질문 수'
  kind: 'number' | 'date' | 'enum' | 'boolean';
  operators: Operator[];       // 이 지표가 답할 수 있는 질문
  enumValues?: readonly string[];
  predicate(op: Operator, value: unknown): Prisma.Sql;
};

type EntityDef = {
  key: 'space' | 'user';
  from: Prisma.Sql;            // 구동 테이블 + 고정된 조인
  idColumn: Prisma.Sql;
  listSelect: Prisma.Sql;      // 드릴다운에 보여줄 컬럼
  metrics: Record<string, Metric>;
};
```

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

## 4. 질문 개수 — 임계값 질문은 전부 EXISTS로 접힌다

선행 문서 §4가 확립한 사실을 그대로 쓴다. `Card.order`는 발급 시 `totalCards + 1`로 매겨지므로(`card.service.ts:179`) **공간의 최대 order가 곧 카드 수**이고, `MAX(order) >= N`보다 `EXISTS (… AND order >= N)`이 훨씬 싸다. 첫 행에서 멈추고 `idx_card_space_order`가 seek로 답하기 때문이다. dev 실측으로 질문≥10 조건에서 40.3초가 9.8초가 됐다.

`Space.cardOrder`는 쓰지 않는다. 이름이 비슷하지만 템플릿 시퀀스 포인터라(`card.service.ts:287`) 건너뛴 템플릿이 있으면 실제 카드 수보다 크다.

여기서 한 걸음 더 간다. **`gte` 말고 다른 연산자도 EXISTS로 표현된다.**

| 질문 | 술어 |
|---|---|
| 질문 ≥ N | `EXISTS (order >= N)` |
| 질문 < N | `NOT EXISTS (order >= N)` |
| 질문이 A 이상 B 이하 | `EXISTS (order >= A) AND NOT EXISTS (order >= B+1)` |
| 질문 = N | `EXISTS (order >= N) AND NOT EXISTS (order >= N+1)` |

전부 seek로 끝나고 집계가 없다. `cardCount`의 `predicate`는 이 표를 그대로 구현한다. 이것이 지표를 "컬럼"이 아니라 "연산자별 술어 생성기"로 정의하는 이유다 — `cardCount`에는 셀 컬럼이 아예 없다.

## 5. 성능 — 비용 모델이 선택도에 따라 뒤집힌다

### 선행 문서의 결론을 그대로 물려받으면 안 된다

선행 문서 §4는 `MAX(order) >= N`보다 `EXISTS (order >= N)`이 4배 빠르다고 측정했다. 맞는 측정이지만 **조건이 붙어 좁혀진 질의**에 대한 것이었다 — "커플 + ko + 질문10 + 펫5"는 16,500명으로 좁혀진다.

이번 요청은 정반대다.

> 질문 20개 이상 작성된 공간 개수

좁히는 조건이 하나도 없다. 이 차이가 비용 모델을 뒤집는다.

| | 좁혀진 질의 | 전체 집계 |
|---|---|---|
| EXISTS | 매칭 공간만 seek — **싸다** | 공간 수만큼 랜덤 seek (~295k회) |
| GROUP BY MAX | 훑는 공간마다 MAX 계산 — 비싸다 | 인덱스 순차 1회 통과 — **싸다** |

`idx_card_space_order`는 `(spaceId, order)` 복합 인덱스다. 전체 집계에서 `GROUP BY spaceId` + `MAX(order)`는 이 인덱스를 **커버링 인덱스로 순차 스캔** 한 번에 끝낸다. 반면 EXISTS는 `SpaceInfo` 295k행을 훑으면서 매 행마다 B-tree를 새로 내려간다. 순차 읽기와 랜덤 접근 295k번의 차이다.

즉 **선행 문서의 EXISTS는 여전히 옳고, 이 요청에는 맞지 않는다.** 둘 다 필요하다.

### 채택: 선택도로 갈래를 고른다

```
필터가 SpaceInfo를 좁히는가?
  예 → 버킷마다 EXISTS 술어로 COUNT (§4의 술어를 그대로)
  아니오 → 히스토그램 1회 통과 (아래)
```

판정은 통계 추정이 아니라 **요청 자체**로 한다 — `filters`에 `SpaceInfo` 컬럼(`locale`, `type`) 조건이 하나라도 있으면 좁혀진 경로다. 옵티마이저 추정에 걸지 않는 이유는 선행 문서 §5에서 그 추정이 실제의 2배로 어긋난 전례가 있어서다.

### 히스토그램 — "여러 건 한 번에"가 곧 효율적인 모양이다

전체 집계 경로는 버킷마다 쿼리를 돌리지 않는다. 한 번 통과해서 **분포 전체**를 만든다.

```sql
SELECT mx AS cardCount, COUNT(*) AS spaces
FROM (SELECT spaceId, MAX(`order`) AS mx FROM Card GROUP BY spaceId) t
GROUP BY mx
```

결과는 `질문 수 → 공간 수` 표 하나다. **모든 임계값 질문이 이 표의 접미사 합**이다.

- 질문 ≥ 20 → `mx >= 20`인 행의 합
- 질문 ≥ 50 → `mx >= 50`인 행의 합
- 질문 10~19 → 구간 합

버킷이 2개든 10개든 쿼리는 하나다. API가 버킷 배열을 받는 이유가 단순한 편의가 아니라 여기 있다 — 요청을 모아 받아야 한 번에 풀 수 있다.

행 수는 서로 다른 카드 수의 종류만큼이라 수백 행을 넘지 않는다. 응답에 담아도 되고 캐시해도 싸다.

**이 히스토그램은 캐시한다 — TTL 10분.** 통계 질문에 10분 신선도면 충분하고, 이미 읽기 복제본 지연을 받아들이고 있다. 캐시가 살아 있는 동안은 아직 아무도 묻지 않은 임계값까지 공짜로 답한다.

필터가 붙은 경우로 확장하고 싶으면 `GROUP BY si.locale, si.type, mx`로 큐브를 만들면 된다. `locale × type`은 선행 문서 기준 27조합이므로 표가 여전히 작다. **다만 첫 버전에 넣지 않는다** — 필터+임계값 조합 요청이 실제로 오는지 보고 결정한다.

### 남은 비싼 경로 하나

필터가 `SpaceInfo`를 좁히지 못하는데 히스토그램으로도 안 풀리는 조합이 있다. 예를 들어 `coin >= 1000` (Space 컬럼, 인덱스 없음) + `질문 >= 20`이다. 이때는 `Space` 전체 스캔이 되고 히스토그램과 조인해야 한다.

이 경우는 **막지 않되 느릴 수 있음을 인정한다.** 타임아웃이 잡아주고, 실제로 그런 요청이 반복되면 그때 인덱스를 판단한다.

### 측정 계획

위 설계는 인덱스 구조에서 따라 나온 추론이고 **실측이 아니다.** 구현 1단계에서 dev에 대고 확인한다.

| 재는 것 | 확인하려는 것 |
|---|---|
| 히스토그램 쿼리 `EXPLAIN` | `idx_card_space_order`로 `Using index`가 뜨는지 (커버링 여부) |
| 히스토그램 실행 시간 | 10분 캐시로 충분한지, 아니면 §11의 요약 테이블이 필요한지 |
| 필터 있는 EXISTS 경로 | 선행 문서의 0.6초가 `Profile` 조인 없이도 유지되는지 |
| `SpaceInfo` 대비 `Space` 행 수 | 구동 테이블 선택의 근거 |

**`EXPLAIN` 결과가 추론과 다르면 설계를 고친다.** 특히 `GROUP BY spaceId`가 커버링으로 안 풀리고 임시 테이블을 만든다면 히스토그램 전제가 무너진다.

새 인덱스는 제안하지 않는다. 필요한 둘(`idx_card_space_order`, `idx_spaceinfo_type_locale`)이 이미 있고, 추가가 필요한지는 위 측정이 답한다. 선행 문서에서 근거 없이 넣었던 `idx_pet_level`이 `EXPLAIN`으로 무용함이 드러나 빠진 전례가 있다.

### 안전장치

측정 결과와 무관하게 넣는다.

- 버킷은 요청당 최대 10개. 그 이상은 400.
- 쿼리마다 `SELECT /*+ MAX_EXECUTION_TIME(10000) */`. 넘으면 해당 버킷만 실패로 표시하고 나머지는 반환한다 — 하나가 느리다고 전체가 무응답이 되지 않게. MySQL 힌트는 `SELECT`에만 걸리는데 이 기능은 전부 `SELECT`다.
- EXISTS 경로에서 버킷 병렬 실행은 동시성 3. 히스토그램 경로는 쿼리가 하나라 해당 없다.
- 모든 쿼리는 `databaseManager.read()`로 읽기 복제본을 탄다.

### 드릴다운의 비용 — 별도로 다뤄야 한다

목록은 개수와 비용 구조가 다르다. 둘을 같이 설계하면 목록이 병목이 된다.

**총 개수를 다시 세지 않는다.** 조회 단계가 이미 개수를 알고 있으므로 `POST /stats/list`는 그 값을 받아 페이징 정보를 만든다. 페이지마다 `COUNT(*)`를 다시 도는 것이 가장 흔한 실수다.

**OFFSET을 쓰지 않는다.** `LIMIT 50 OFFSET 5000`은 5,050행을 읽고 5,000행을 버린다. `spaceId`가 PK이므로 키셋 페이징으로 간다.

```sql
SELECT … FROM SpaceInfo si
WHERE <조건> AND si.spaceId > :cursor
ORDER BY si.spaceId
LIMIT 50
```

**기본 정렬은 `spaceId`다.** `createdAt DESC` 같은 정렬은 매칭 행 전체를 모아 정렬해야 하므로 조건이 넓을 때 비싸다. 정렬 옵션은 이를 받쳐줄 인덱스가 있을 때만 연다 — 첫 버전에는 열지 않는다.

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
- **읽기 복제본 지연.** 방금 만든 공간이 결과에 빠질 수 있다. 히스토그램에 10분 캐시를 얹으므로 어차피 그 정도 신선도인데, 복제 지연 폭 자체는 모른다.
- **히스토그램의 커버링 여부.** §5의 전제는 `GROUP BY spaceId`가 `idx_card_space_order`만으로 풀린다는 것이다. `EXPLAIN`에 `Using index`가 안 뜨고 임시 테이블이 잡히면 전제가 무너지고 §11의 요약 테이블로 가야 한다.

### 확인해서 해소한 것

설계가 이 사실들에 기대고 있으므로 근거를 남긴다.

| 확인한 것 | 결과 | 어디에 쓰였나 |
|---|---|---|
| `Card` 삭제 경로 | **없다** — 생성만 한다 | `MAX(order)`가 카드 수라는 전제, 증분 카운터의 안전성 (§11) |
| 모든 `Space`에 `SpaceInfo`가 있는가 | **있다** — `space.create`가 같은 트랜잭션에서 중첩 생성한다(`space/space.service.ts:44`) | `SpaceInfo`를 구동 테이블로 써도 공간이 누락되지 않음 |
| 모든 `Space`에 `Pet`이 있는가 | **있다** — 같은 자리에서 `pet: { create: {} }`, 레벨 기본값 1 | `petLevel` 지표에 "펫 없는 공간" 예외 처리가 불필요 |
| `SpaceInfo.members` 갱신 방식 | **재계산** — `syncSpaceMembers`가 `Profile`을 새로 센다 | 지표로 채택 |
| `SpaceInfo.replies` 갱신 방식 | **증분만**, 감소 없음 | 지표에서 제외 (§3) |
- **삭제된 공간 처리.** `Space.dueRemovedAt`이 있는데 통계에서 제외해야 하는지 정하지 않았다. 요청자가 "지금 살아있는 공간"을 뜻했는지 확인이 필요하다.

## 10. 하지 않기로 한 것

- **필터 × 임계값 큐브.** `GROUP BY locale, type, mx`로 만들면 필터 붙은 임계값 질문도 한 통과로 풀린다. 표도 작다. 그런데 그런 조합 요청이 실제로 왔는지 모른다 — 지금까지 온 것은 필터 없는 임계값뿐이다. 오면 넣는다.
- **자유 SQL 입력.** 유연성은 최대지만 운영 DB에 임의 쿼리가 나간다. 무거운 쿼리 하나가 서비스에 영향을 주고, 드릴다운을 일반화할 수 없다. 레지스트리에 지표를 추가하는 비용이 그만큼 크지 않다.
- **유저 대상.** 구조는 열어두되 첫 버전은 공간만. 실제로 유저 질문이 오는지 보고 넣는다.
- **OR 조건과 중첩 그룹.** 지금까지 온 요청은 전부 AND였다. 넣는 순간 UI와 SQL 조립이 같이 복잡해진다.
- **저장된 질의.** 같은 질문이 반복되는 것이 확인되면 그때. 지금은 반복되는 것이 "질문 개수"라는 축이지 특정 임계값이 아니다.
- **CSV 내보내기.** 드릴다운 목록으로 충분한지 먼저 본다.
- **차트.** 개수 두 줄에 그래프는 과하다.

## 11. 물러설 자리 — 요약 테이블

§5의 히스토그램이 측정에서 무너지면(커버링이 안 되거나 캐시 미스 때마다 수십 초가 걸리면) 다음 단계는 **공간별 집계를 미리 만들어 두는 것**이다. 미리 설계해 두되 지금 만들지는 않는다.

```sql
CREATE TABLE `SpaceStat` (
  `spaceId`   VARCHAR(191) NOT NULL PRIMARY KEY,
  `cardCount` INT NOT NULL DEFAULT 0,
  `updatedAt` DATETIME(3) NOT NULL,
  INDEX `idx_spacestat_cardcount` (`cardCount`)
);
```

이러면 요청받은 질문이 인덱스 범위 스캔 하나가 된다.

```sql
SELECT COUNT(*) FROM SpaceStat WHERE cardCount >= 20
```

**갱신 방식은 크론 재계산으로 한다.** 카드 발급 시점에 `increment: 1`을 거는 쪽이 더 정확해 보이지만, `SpaceInfo.replies`가 정확히 그 방식으로 어긋났다(§3). 카드는 삭제 경로가 없어 증분이 이론상 안전하지만, 안전함이 **코드에 삭제가 추가되지 않는다는 가정**에 걸려 있다. 그 가정은 언젠가 조용히 깨지고, 깨진 걸 아무도 모른다. 크론 재계산은 틀려도 다음 주기에 스스로 고친다.

공간이 하드 삭제되면 `SpaceStat` 행이 남는데, `spaceId`로 `SpaceInfo`와 조인해 쓰므로 고아 행은 결과에 영향을 주지 않는다. 크론이 같이 정리한다.

이 단계로 갈지는 §5 측정이 정한다. 먼저 만들지 않는 이유는 유지할 상태가 하나 늘고, 그 상태가 틀렸을 때 통계가 조용히 틀리기 때문이다.

## 12. 순서

1. dev에서 §5 히스토그램 `EXPLAIN` + 실측 → 캐시로 충분한지, §11이 필요한지 확정
2. 삭제된 공간(`dueRemovedAt`) 포함 여부를 요청자에게 확인 → 기본 조건 확정
3. 레지스트리 + SQL 조립 + 테스트 (서버, DB 없이)
4. API 3개 + 서비스
5. 어드민 조건 패널 + 결과 표
6. 드릴다운
7. 요청받은 질문("질문 20/50개 이상")으로 끝단 확인
