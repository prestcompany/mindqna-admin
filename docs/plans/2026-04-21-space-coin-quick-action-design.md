# Space Search Coin Quick Action Design

**Goal:** 공간 검색 결과 패널에서 코인 지급 진입 depth를 줄이고, 운영자가 카드 결과를 보면서 바로 `코인 관리`를 실행할 수 있게 한다.

**Repo In Scope:**
- Frontend admin: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Decision Summary:**
- 공간 검색 결과는 다시 `card` 뷰를 기본으로 둔다.
- 각 검색 결과 카드 상단에 `코인 관리` 버튼을 직접 노출한다.
- 메인 공간 목록과 검색 결과 테이블의 액션 패턴은 기존 구조를 유지한다.
- 테이블은 보조 뷰로 남기되, 카드에서 작업 진입을 해결한다.

## Current Problem

- 공간 검색 결과는 기본 뷰가 카드라서, 코인 지급을 위해 운영자가 테이블 뷰로 다시 전환해야 한다.
- 카드에서 바로 작업할 수 없어서, 검색 후 코인 지급 흐름이 한 단계 더 길다.

## UX Direction

이번 피드백은 검색 결과 패널에서의 depth 축소가 핵심이므로, 범위를 넓혀 목록 전체 패턴을 바꾸기보다 검색 카드 안에 직접 액션을 넣는 최소 수정이 더 적합하다.

이 구조의 핵심은 아래 두 가지다.

- 조회와 작업의 의미를 분리한다.
  - 카드 본문은 계속 공간 상태를 읽는 데 집중한다.
  - 카드 상단 버튼은 즉시 `코인 관리` 시트를 연다.
- 검색 패널 내부 흐름을 짧게 만든다.
  - `검색 -> 카드 확인 -> 코인 관리`의 2단계 흐름으로 줄인다.

## UI Changes

### Space Search Card View

- 검색 결과 기본 뷰를 다시 `card`로 둔다.
- 각 카드 상단 우측에 `코인 관리` 버튼을 추가한다.
- 버튼 클릭 시 현재 카드의 공간을 대상으로 `CoinForm` 시트를 연다.

### Main Space List And Search Table

- 메인 공간 목록의 액션 컬럼은 기존 `TableRowActions` 구조를 유지한다.
- 검색 결과 테이블도 기존 액션 구조를 유지한다.
- 즉, 이번 변경은 검색 카드의 직접 액션 추가에만 집중한다.

## Interaction Rules

- 카드의 `코인 관리` 버튼은 다른 클릭 동작과 분리된 독립 액션으로 처리한다.
- 검색을 새로 실행하면 다시 카드 뷰로 진입해 같은 사용 흐름을 유지한다.
- 테이블 뷰는 필요할 때만 전환해서 쓰는 보조 모드로 둔다.

## Validation

- 변경 대상 파일:
  - `/src/components/page/space/SpaceSearch.tsx`
- 변경 복원 파일:
  - `/src/components/page/space/SpaceTableColumns.tsx`
- 파일 단위 타입 진단을 통과해야 한다.
- 파일 단위 lint를 통과해야 한다.
- 전체 `next build`가 기존 경고 수준 내에서 성공해야 한다.
