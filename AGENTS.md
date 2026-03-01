# AGENTS.md

이 문서는 `mindqna-admin` 레포의 UI/UX 및 유지보수 기준을 정의합니다.  
작성일: **2026-02-25**

## 1) 제품 디자인 방향

- 기본 톤: **Vercel 스타일 기반 + 화이트 배경 중심**
- 다크는 포인트/강조에 제한적으로 사용
- 어드민 SaaS 관점의 우선순위:
  - 정보 밀도
  - 빠른 스캔
  - 일관된 액션 위치
  - 예측 가능한 상호작용

## 2) 공통 레이아웃/컴포넌트 규칙

### Sheet

- 페이지 우측 패널은 `AdminSideSheetContent`를 기본 사용
- 헤더 고정 + 본문 스크롤 + 하단 액션 영역 고정(sticky) 패턴 유지
- 생성/수정 Sheet는 같은 폭 토큰(`sm|md|lg|xl|full`)을 사용

### Modal

- 긴 폼 모달은 반드시 `max-h` + `overflow-y-auto` 구조 적용
- 본문과 하단 액션(취소/저장) 분리
- 작은 뷰포트에서도 모달이 화면 밖으로 벗어나지 않도록 반응형 폭 사용

### Form

- 폼은 `FormSection` + `FormGroup` 조합을 기본으로 사용
- 라디오/체크 선택은 칩형 UI(라벨 카드) 우선
- 주요 액션 버튼은 우측 정렬, 하단 고정(sticky) 권장
- 생성/수정 모두 필수값 검증을 `zod + react-hook-form`로 통일

### Table

- 리스트는 `DataTable` 사용
- 컬럼 `size` 명시로 고정폭 관리
- 긴 텍스트는 `truncate + tooltip` 기본 적용
- 행 액션은 `TableRowActions`(드롭다운)로 통일
- Row expand(접기/펼치기)는 특별한 요구가 없으면 사용하지 않음

### 이미지/미디어

- 테이블 내 미리보기는 `ClickableImagePreview`로 확대 보기 가능해야 함
- 썸네일/에셋은 투명 배경 + `object-contain` 원칙 사용
- 리스트 셀 기준 대표 미리보기는 현재 `120px` 중심으로 통일

## 3) 코드 구조 및 관심사 분리

- 공통 폼 옵션/상수는 공유 경로로 분리
  - 예: `src/components/shared/form/constants/locale-options.ts`
- 도메인 페이지는 다음 책임을 분리:
  - `List`: 조회/필터/테이블/열기 트리거
  - `Form` or `Modal`: 생성/수정 입력과 검증
  - `services/hooks`: API 조합, 상태 로직

## 4) 오늘 반영된 핵심 사항

- Sheet 기반 Form 전반 레이아웃 현대화
- 검색형 Sheet(`UserSearch`, `SpaceSearch`) 구조 통일
- `template/custom`:
  - 펫 커스텀 모달 화면 이탈 이슈 수정(반응형 폭 + 최대 높이 + 내부 스크롤)
  - 폼 섹션 재구성(기본/판매/미디어)
  - 하단 액션 고정 및 칩형 선택 UI 반영
  - 리스트 테이블 컬럼 폭/순서/미디어 셀 정돈
- 유지보수 정리:
  - 빈 Sheet/미사용 상태 일부 제거
  - 빈 디렉토리 정리
  - locale 옵션 중복을 공통 상수로 통합

## 5) 유지보수 정책

- 새 화면 추가 시 기존 패턴을 우선 재사용하고, 새 패턴 도입은 최소화
- 사용되지 않는 상태/분기/빈 디렉토리는 즉시 정리
- 기능 변경 시 최소한 대상 파일 단위 타입 진단을 수행
- 회귀 방지를 위해 UI 일관성(버튼 위치/상태 라벨/행 액션 위치) 점검 필수

## 6) 알려진 잔존 이슈(별도 트랙)

- 프로젝트 레벨 TypeScript 에러 일부는 기존 잔존 상태로 별도 해결 필요:
  - `Dashboard.tsx`
  - `GameRankingList.tsx` (`bestScore` 타입)
  - `GameRewardList.tsx`
  - `square-library/columns.tsx`
  - `useAdsTest.ts`

---

새 작업은 본 문서 기준을 우선 적용하고, 제품 방향 변경 시 이 문서를 먼저 갱신합니다.
