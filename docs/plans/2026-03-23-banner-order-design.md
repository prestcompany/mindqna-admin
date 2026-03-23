# Banner Order Management Design

**Goal:** 배너 관리에서 운영자가 `location + locale` 그룹별 노출 순서를 직접 지정할 수 있게 하고, 관리자 화면과 일반 사용자 조회 API가 동일한 순서 기준을 사용하도록 정렬 계약을 통일한다.

**Repos In Scope:**
- Frontend admin: `/Users/gargoyle92/Documents/frontend/mindqna-admin`
- Backend admin + user API: `/Users/gargoyle92/Documents/backend/mindqna-server`

**Decision Summary:**
- 정렬 기준 필드는 `order` 대신 `orderIndex`로 둔다.
- `orderIndex`의 의미는 같은 `location + locale` 그룹 안에서의 노출 순서다.
- 비활성 배너도 순서를 유지하고 점유한다.
- 같은 그룹에서 중복 순서를 입력하면 기존 배너를 뒤로 자동 밀어낸다.
- 삭제 시 뒤 순번은 한 칸씩 당겨서 빈 번호가 남지 않게 유지한다.
- 일반 사용자 배너 조회도 `orderIndex` 기준으로 내려간다.

## Current State

- 어드민 배너 목록은 `/admin/banner`에서 `createdAt desc`로 조회된다.
- 일반 사용자 배너 조회는 `/event/:name`에서 `location + locale + isActive` 조건으로 조회되지만, 정렬은 역시 `createdAt desc`다.
- `EventBanner` 모델에는 정렬용 컬럼이 없다.
- 어드민 UI에는 순서를 입력하거나 검수할 수 있는 필드와 컬럼이 없다.

## Data Model

`EventBanner`에 아래 필드를 추가한다.

```prisma
model EventBanner {
  id         Int      @id @default(autoincrement())
  ...
  location   String   @default("")
  orderIndex Int      @default(1)
  clickCount Int      @default(0)
  viewCount  Int      @default(0)
  ...

  @@index([location, locale, orderIndex])
}
```

### Why `orderIndex`

- SQL 예약어와의 혼동을 피한다.
- 프론트/백엔드 타입명으로 의미가 명확하다.
- 현재 코드베이스의 다른 숫자형 정렬 필드와도 일관성이 좋다.

### Migration Strategy

기존 배너의 사용자 노출 순서를 깨지 않기 위해, 데이터 마이그레이션은 각 `location + locale` 그룹 안에서 기존 `createdAt desc` 순서를 그대로 `orderIndex`에 반영한다.

- 가장 최근 생성된 배너: `orderIndex = 1`
- 그다음 배너: `orderIndex = 2`
- 이후 동일하게 연속 번호 부여

이렇게 하면 마이그레이션 직후 사용자 화면에서 체감 순서는 바뀌지 않고, 이후부터 운영자가 숫자로 제어할 수 있다.

## Backend Design

### Admin Banner Contract

다음 계약에 `orderIndex`를 추가한다.

- `/src/admin/admin.dto.ts`
- `/src/admin/banner/types/banner.types.ts`
- `/src/admin/banner/banner.service.ts`
- 프론트 `/src/client/banner.ts`

생성/수정 DTO는 아래 필드를 포함한다.

```ts
type BannerMutationParams = {
  location: string;
  locale: Locale;
  name: string;
  img: string;
  link: string;
  orderIndex: number;
};
```

### Admin List Sorting

어드민 목록 기본 정렬은 운영 검수 관점으로 바꾼다.

```ts
orderBy: [
  { location: 'asc' },
  { locale: 'asc' },
  { orderIndex: 'asc' },
  { createdAt: 'desc' },
]
```

이 정렬은 실제 사용자 노출 순서와 운영 화면의 검수 순서를 맞추기 위한 것이다.

### User Banner Sorting

일반 사용자 조회인 `PremiumService.getEvents()`는 아래 정렬을 사용한다.

```ts
orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }]
```

조회 조건은 기존처럼 유지한다.

- `location = name`
- `locale = user.locale`
- `isActive = true` in production

즉, 활성 배너만 노출하지만 비활성 배너의 순서 값은 DB에서 계속 유지된다.

## Reordering Rules

모든 생성/수정/삭제는 트랜잭션 안에서 처리한다. 목표는 각 `location + locale` 그룹에서 항상 `1..N` 연속 순번을 유지하는 것이다.

### Create

입력된 `orderIndex`는 같은 그룹의 현재 마지막 순번 기준으로 보정한다.

- `orderIndex < 1` 이면 validation 에러
- `orderIndex > max + 1` 이면 `max + 1`로 보정

생성 절차:

1. 같은 그룹에서 `orderIndex >= targetOrder`인 배너를 모두 한 칸 뒤로 민다.
2. 새 배너를 `targetOrder`로 생성한다.

### Update In Same Group

같은 `location + locale` 그룹 안에서 순서만 바뀌는 경우:

- `5 -> 2`: `2..4`를 `+1`
- `2 -> 5`: `3..5`를 `-1`

이후 대상 배너를 새 `orderIndex`로 저장한다.

### Update Across Groups

`location` 또는 `locale`이 바뀌면 아래 순서로 처리한다.

1. 기존 그룹에서 현재 배너 뒤의 순번을 `-1`
2. 새 그룹에서 목표 위치 이상 순번을 `+1`
3. 대상 배너를 새 그룹과 새 `orderIndex`로 이동

### Delete

배너 삭제 후 같은 그룹에서 삭제된 순번보다 뒤에 있는 배너는 모두 `-1` 한다.

이 정책으로 모든 그룹은 항상 압축된 연속 번호를 유지한다.

## Admin UI Design

### Banner Form

`/src/components/page/banner/BannerForm.tsx`에 `노출 순서*` 숫자 입력을 추가한다.

- 위치: `노출 정책` 섹션
- 검증: `1 이상의 정수`
- 설명: `같은 위치/언어 그룹 안에서 순서를 관리합니다. 비활성 배너도 순서를 유지합니다.`

생성/수정 모두 `zod + react-hook-form` 기준을 유지한다.

### Banner List

`/src/components/page/banner/BannerList.tsx`에 `순서` 컬럼을 추가한다.

- `locale`, `location`과 인접하게 배치
- 운영자가 빠르게 검수할 수 있게 고정폭 사용

이번 범위에서는 드래그앤드롭 정렬 UI를 도입하지 않는다. 요구사항은 수동 숫자 입력과 서버 재정렬 정책으로 충족한다.

## Validation And Error Handling

- `orderIndex`는 필수값이며 `1 이상의 정수`만 허용
- 순서가 너무 큰 경우는 에러 대신 그룹 마지막 다음 값으로 보정
- 이미지 미선택, 필수 문자열 미입력 등 기존 폼 validation 은 유지
- 재정렬 로직은 서비스 내부에서만 처리하고, 프론트는 입력값만 전달한다

DB 수준의 강한 unique 제약보다 서비스 트랜잭션을 우선 사용한다. 순차 업데이트 중 충돌 가능성을 줄이기 위해 이번 단계에서는 `@@index([location, locale, orderIndex])`만 두고, 정합성은 서비스 레이어가 보장한다.

## Testing Plan

### Backend

`/src/admin/banner/banner.service.spec.ts`에 아래 케이스를 추가한다.

- 어드민 목록이 `location -> locale -> orderIndex -> createdAt` 기준으로 조회되는지
- 생성 시 같은 그룹의 기존 배너가 뒤로 밀리는지
- 같은 그룹 내 순서 변경 시 이동 구간만 재정렬되는지
- 그룹 변경 시 이전 그룹은 당기고 새 그룹은 밀어내는지
- 삭제 시 뒤 순번이 당겨지는지

`/src/premium/premium.service.ts`에 대해서도 `orderIndex asc` 정렬이 적용되는지 검증이 필요하다.

### Frontend

프론트는 아래 수준으로 검증한다.

- 폼에서 `orderIndex`가 숫자로 입력되고 검증되는지
- 생성/수정 요청에 `orderIndex`가 포함되는지
- 목록 컬럼에서 순서가 보이는지

## Implementation Order

1. DB 스키마와 마이그레이션 추가
2. 백엔드 admin DTO/service 재정렬 로직 구현
3. 일반 사용자 조회 정렬 변경
4. 어드민 프론트 타입/폼/리스트 반영
5. 서버 테스트와 타입 진단으로 회귀 확인

## Acceptance Criteria

- 운영자가 배너 생성/수정 시 `location + locale` 그룹 기준 순서를 직접 입력할 수 있다.
- 같은 순번을 입력하면 기존 배너가 자동으로 뒤로 밀린다.
- 비활성 배너도 순서를 유지하며 다시 활성화 시 같은 순서로 노출된다.
- 배너 삭제 후 순번이 자동 압축된다.
- 일반 사용자 배너 조회 결과가 `orderIndex` 오름차순으로 내려간다.
- 어드민 목록에서 실제 노출 순서를 확인할 수 있다.
