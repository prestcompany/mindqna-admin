# 공간(Space) 어드민 고도화 — 설계 문서

- 작성일: 2026-06-22
- 범위: 프론트엔드 `mindqna-admin` + 백엔드 `mindqna-server` 동시 작업
- 관련 화면: 공간 목록(`/space/list`) 내 검색 + 공간 상세(사이드 패널 `SpaceDetailSheet`)

## 배경 / 요구사항

세 가지 요구사항을 분석하여 단계별 설계로 정리한다.

1. **검색 키별 분리** — 현재 공간 검색이 단일 `keyword` 통합검색으로 동작해 느리다. 검색 기준(키)을 선택해 해당 파라미터로만 조회하도록 어드민·서버 모두 개선.
2. **`isActive` 누락 버그** — 검색 결과의 active/inactive 상태가 모두 동일하게 표시된다. 원인 분석 및 수정.
3. **공간 상세 Tabs 고도화** — 현재 개요(overview) 정보 한 화면만 노출. 공간과 연관된 데이터를 탭별 상세 목록으로 조회하도록 확장.

## 현황 분석 (Evidence)

### 검색 흐름
- 프론트 `src/components/page/space/SpaceSearch.tsx`: 검색 폼이 단일 `keyword`만 서버로 전송 (`getSearchParams`). placeholder = `공간 ID / 공간 이름 / 사용자명 / 프로필 닉네임`.
- 프론트 `src/client/space.ts:14~25`: `SearchSpacesParams`에 `spaceId / name / username / nickname` 분리 파라미터 타입이 **이미 존재**하나 UI가 사용하지 않음.
- 백엔드 `src/admin/space/space.service.ts` `searchSpaces` (242~307줄):
  - `keyword` 있으면 → `id =`, `spaceInfo.name contains`, `profiles.some(user.username contains)`, `profiles.some(nickname contains)` 의 **OR 4분기**.
  - `keyword` 없으면 → `spaceId/name/username/nickname` 분리 파라미터를 OR로 조합하는 분기가 **이미 구현**되어 있음 (280~307줄).
- 컨트롤러 `src/admin/space/space.controller.ts`: `GET /admin/space/search` → `searchSpaces`.

### 느림의 원인
- `contains`는 MySQL `LIKE '%kw%'` → 인덱스 미사용 풀스캔.
- `profiles.some(...)` 2개는 Profile·User 조인 상관 서브쿼리. 통합검색은 한 글자 입력에도 OR 4갈래(텍스트 풀스캔 + 관계 서브쿼리 2개)를 매번 수행.
- 단일 키 조회로 바꾸면 분기 1개만 실행 → 비용 대폭 감소. username은 고유값이라 `equals`로 처리하면 인덱스 사용 가능.

### `isActive` 버그 (요구사항 2) — 원인 확정
- `space.service.ts`의 select 3종 비교:
  - `spaceListSelect` (15~73줄): `isActive: true` 포함.
  - `spaceDetailSelect` (126~152줄): `isActive: true` 포함.
  - `spaceSearchSelect` (75~96줄): **`isActive` 누락.**
- 결과: `/admin/space/search` 응답에 `isActive` 미포함 → 프론트 `SpaceStatusDot`은 누락(null/undefined) 시 `미상` 표시(과거엔 전부 `Inactive`로 보였음). 프론트는 이미 `미상` 방어 처리 완료.
- 수정: `spaceSearchSelect`에 `isActive: true` 한 줄 추가.

### Space 연관 스키마 (요구사항 3 입력)
`prisma/schema.prisma`의 `Space` 모델 관계 전수:

| 관계 | 모델 | 카디널리티 | 핵심 필드 / 의미 |
|---|---|---|---|
| spaceInfo | SpaceInfo | 1:1 | name·type·locale·ownerId·members·replies (개요에 사용 중) |
| profiles | Profile | 1:M | nickname·isPremium·isGoldClub·disabled·removed·removedAt·userId (멤버) |
| joinMetas | SpaceJoinMeta | 1:M | profileId·userId·isAccepted (가입/초대 수락 이력) |
| cards | Card | 1:M | templateId·order → replies·comments·stat (발급 카드 + 답변) |
| coinMetas | CoinMeta | 1:M | isPaid·amount·isUse·description (하트/스타 지급·사용) |
| diaries | Diary | 1:M | date·emotion·content → comments·likeMetas (감정일기) |
| Schedule | Schedule | 1:M | title·startedAt·endedAt → items·memberMetas (캘린더 일정) |
| pet | Pet | 1:1 | type·level·exp → metas·SpacePetCustom |
| spacePetCustoms | SpacePetCustom | 1:M | petCustomTemplateId·isEquipped·customType (펫 커스텀) |
| rooms | Room | 1:M | category·type·name → interior (방) |
| InteriorItem | InteriorItem | 1:M | interiorTemplateId (인테리어 아이템) |
| roomKeys | RoomKey | 1:M | 방 열쇠 |
| userAccessMetas | UserAccessMeta | 1:M | userId·heart·createdAt (접속 로그 + 하트 적립) |
| adsMetas | AdsMeta | 1:M | userId·description·createdAt (광고 시청 로그) |
| cardRefreshMeta | CardRefreshMeta | 1:1 | templateId·isExcepted (카드 갱신 예외 설정; 단독 탭 불필요) |

## 결정 사항 (확정)

- **검색 입력 방식**: 단일 키 선택 + 값 입력 (한 번에 한 필드만 조회).
- **탭 범위**: 8개 탭 — 개요(유지) + 멤버 + 카드/답변 + 재화내역 + 일기 + 일정 + 펫·인테리어 + 활동로그.
- **상세 컨테이너**: 현행 사이드 패널(Sheet) 유지 + 상단 탭바. 패널 폭 확대. 탭 진입 시 lazy-load.
- **username 검색**: 정확 일치(`equals`).
- **데이터 로딩**: 탭별 신규 페이지네이션 엔드포인트(`/admin/space/:id/*`), replica 읽기, 10건/페이지.

## 설계

### Phase 0 — `isActive` 누락 수정 (요구사항 2)
- 백엔드 `space.service.ts` `spaceSearchSelect`에 `isActive: true` 추가.
- 검증: `/admin/space/search` 응답 각 항목에 `isActive` 포함, 프론트 검색 결과에서 Active/Inactive가 행마다 다르게 표시.
- 의존성 없음 → 가장 먼저 머지.

### Phase 1 — 검색 키별 분리 (요구사항 1)
- 프론트 `SpaceSearch.tsx`:
  - 「통합 검색」 인풋을 **검색 기준 Select + 값 인풋** 으로 교체.
  - Select 옵션: `공간ID(spaceId)` / `이름(name)` / `사용자명(username)` / `닉네임(nickname)`.
  - 제출 시 선택된 키에 해당하는 단일 파라미터만 채워 `searchSpaces` 호출. `keyword`는 전송하지 않음.
  - 기존 필터(type/locale/날짜범위)·뷰모드·페이지네이션·결과 카드/테이블은 유지.
  - `SpaceActiveFilterChips`가 키 기반 검색 상태를 반영하도록 보정.
- 백엔드 `searchSpaces`:
  - 분리 파라미터 분기(280~307줄) 재사용.
  - `username` 매칭을 `contains` → `equals`로 변경.
  - `keyword` 통합 분기는 하위호환을 위해 남겨두되 UI 미사용.
- 검증: 각 키별 검색이 의도한 필드만 조회. ID 검색은 즉시 응답. username 정확 일치.

### Phase 2 — 탭 컨테이너 + 핵심 3탭
- 프론트 공통:
  - `SpaceDetailSheet`를 탭 컨테이너로 개편 — 상단 탭바, 패널 폭 확대(넓은 size).
  - **개요 탭** = 현행 `SpaceDetailContent` 재사용(무변경).
  - 탭별 lazy-load: 활성 탭에서만 `useQuery` enabled.
  - 재사용 가능한 탭 목록 + 페이지네이션 컴포넌트 1종 작성.
- 백엔드 신규 엔드포인트 (`AdminGuard`, replica, select 명시, 10건/페이지):
  - `GET /admin/space/:id/members` — profiles 전체(enrich, 멤버 수가 적어 페이지네이션 없음) + joinMetas 최신 50건.
  - `GET /admin/space/:id/cards?page` — Card 목록 + 답변/댓글 수(`_count`), 최신순.
  - `GET /admin/space/:id/coins?page` — CoinMeta 전체, 최신순(개요는 최근 20건만 노출하므로 전체 조회 탭).
- 프론트 `client/space.ts`에 위 3개 fetch 함수 + 타입 추가.

### Phase 3 — 보조 4탭
- 백엔드:
  - `GET /admin/space/:id/diaries?page` — Diary 목록(date·emotion·content 요약 + 댓글/좋아요 수).
  - `GET /admin/space/:id/schedules?page` — Schedule 목록(title·기간·반복).
  - `GET /admin/space/:id/pet-interior` — pet(level·exp·type) + spacePetCustoms + rooms + InteriorItem 요약(단건, 경계 작음).
  - `GET /admin/space/:id/activity?page` — 주 목록은 userAccessMetas(접속·하트) 페이지네이션, adsMetas(광고 시청)는 동일 응답에 최신 20건 보조 섹션으로 포함.
- 프론트: 각 탭 UI + `client/space.ts` fetch 함수.

### 공통 규약
- 모든 신규 백엔드 쿼리: `databaseManager.read()`, `select` 명시(과다 조회 금지), 트랜잭션 범위 최소화.
- 컨벤션: 타입 명시·`any` 회피·파일당 export 1개·verb-first 함수(서버), `DESIGN.md` 준수(프론트).
- API 응답 형태는 기존 `searchSpaces`/`getSpace`의 `{ items, totalCount?, pageInfo }` 패턴과 일관.

## 비범위 (Out of scope)
- 공간 상세를 별도 라우트(`/space/[id]`)로 승격하지 않음(사이드 패널 유지).
- `cardRefreshMeta` 단독 탭 미생성.
- 검색 통합(`keyword`) UI는 제거하되 백엔드 분기는 보존(하위호환).

## 리스크 / 확인 필요
- 사이드 패널 폭: 8탭 목록을 담기 위해 `AdminSideSheetContent`의 size를 넓은 값으로 조정 필요. 디자인 톤은 `DESIGN.md` 확인.
- `cards`/`coins`/`diaries`는 데이터가 많을 수 있어 반드시 페이지네이션 + 인덱스(`idx_card_space_*`, `idx_coinmeta_space_created`) 활용.
- Phase는 독립 배포 가능. Phase 0 → 1 → 2 → 3 순서 권장.
