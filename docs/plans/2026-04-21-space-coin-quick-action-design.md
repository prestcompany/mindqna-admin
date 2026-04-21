# Space Coin Quick Action Design

**Goal:** 공간 목록과 공간 검색 결과에서 코인 지급 진입 depth를 줄이고, 운영자가 어디서 보든 같은 위치에서 `코인 관리`를 바로 실행할 수 있게 한다.

**Repo In Scope:**
- Frontend admin: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Decision Summary:**
- `행 클릭 = 상세 보기` 패턴은 유지한다.
- `코인 관리`는 행 우측 끝 sticky 액션 영역에 직접 노출한다.
- 드롭다운은 저빈도 보조 액션만 남긴다.
- 공간 검색 결과는 기본적으로 테이블 뷰에서 시작한다.

## Current Problem

- 메인 공간 목록에서는 `TableRowActions` 안으로 들어가야 `코인 관리`를 찾을 수 있다.
- 공간 검색 결과는 기본 뷰가 카드라서, 코인 지급을 위해 운영자가 테이블 뷰로 다시 전환해야 한다.
- 검색 결과 테이블에서도 다시 옵션 메뉴를 눌러야 하므로, 조회 후 작업까지의 단계가 길다.

## UX Direction

운영 액션 중 빈도가 높은 `코인 관리`는 숨기지 않고 노출한다. 대신 삭제나 멤버 목록 같은 보조 액션만 드롭다운에 남겨, 정보 밀도와 빠른 스캔이라는 어드민 패턴을 유지한다.

이 구조의 핵심은 아래 두 가지다.

- 조회와 작업의 의미를 분리한다.
  - 행 본문 클릭은 계속 상세 조회에 사용한다.
  - 직접 버튼은 즉시 작업 실행에 사용한다.
- 동일한 위치에 동일한 액션을 둔다.
  - 메인 목록과 검색 결과 모두 우측 끝에서 `코인 관리`를 찾을 수 있어야 한다.

## UI Changes

### Main Space List

- `actions` 컬럼 폭을 넓혀 `코인 관리` 버튼과 드롭다운을 함께 배치한다.
- 직접 노출 버튼:
  - `코인 관리`
- 드롭다운 유지 액션:
  - `멤버 목록`
  - `삭제`

### Space Search Result Table

- 검색 결과 기본 뷰를 `table`로 시작하게 바꾼다.
- 메인 목록과 동일하게 `코인 관리` 버튼을 직접 노출한다.
- 드롭다운은 `삭제`만 남긴다.

## Interaction Rules

- `코인 관리` 버튼 클릭은 반드시 `stopPropagation`으로 row click과 분리한다.
- 행 클릭은 계속 `SpaceDetailSheet`를 연다.
- sticky right 액션 컬럼 안에서 버튼과 드롭다운이 같이 보이도록 유지한다.

## Validation

- 변경 대상 파일:
  - `/src/components/page/space/SpaceTableColumns.tsx`
  - `/src/components/page/space/SpaceSearch.tsx`
- 파일 단위 타입 진단을 통과해야 한다.
- 파일 단위 lint를 통과해야 한다.
- 전체 `next build`가 기존 경고 수준 내에서 성공해야 한다.
