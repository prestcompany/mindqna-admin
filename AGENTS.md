# AGENTS.md

> **이 문서가 레포의 루트 가이드(Source of Truth)입니다.** 코딩 에이전트와 기여자는 작업 전 이 문서를 먼저 읽습니다.
> - **디자인/UI/UX 기준 → [DESIGN.md](./DESIGN.md)** (색·타이포·간격·컴포넌트 규약의 단일 출처)
> - `CLAUDE.md`는 이 문서를 가리키는 포인터입니다.

`mindqna-admin`은 게임/소셜 플랫폼(사용자·에셋·상품·게임·공간·분석)을 관리하는 **한국어 어드민 패널**입니다.

---

## 1. 개발 명령어

```bash
npm run dev      # 개발 서버 (포트 4000)
npm run build    # 프로덕션 빌드
npm run start    # 프로덕션 서버
npm run lint     # 린트
npm run export   # 정적 익스포트
```

검증: 기능 변경 시 최소 `npx tsc --noEmit` + `npm run lint` 통과를 확인합니다(프로덕션 빌드는 `ignoreBuildErrors: true`라 타입 에러를 숨기므로 tsc를 직접 돌립니다).

---

## 2. 기술 스택 (실태 기준)

- **프레임워크**: Next.js 13 (pages router) + TypeScript
- **UI**: **shadcn/ui** (Radix 기반, `src/components/ui/**`) + **Tailwind CSS** + `lucide-react` 아이콘
  - Ant Design은 사용하지 않습니다(마이그레이션 완료, `antd` import 0).
- **상태관리**: 전역 `Zustand`, 서버 상태 `TanStack Query`
- **폼**: `react-hook-form` + `zod` (검증 통일)
- **인증**: NextAuth.js (JWT + refresh 회전)
- **HTTP**: Axios + 요청/응답 인터셉터(토큰 자동 첨부/갱신)
- **차트**: Chart.js + react-chartjs-2
- **에디터**: Quill.js, CodeMirror
- **폰트**: Pretendard

### 주요 설정
- 개발 포트 **4000**
- `next.config.js`: `ignoreBuildErrors: true`
- Tailwind: `preflight: false` (레거시 스타일 충돌 회피)
- API 프록시: `/s3-proxy/*` → `https://mindqna.s3.amazonaws.com/*`
- 테마: 라이트 고정(`data-admin-theme="vercel"`), near-black primary

### 인증 흐름
1. NextAuth 자격증명 로그인(`/api/auth/[...nextauth].ts`)
2. 세션에 JWT 저장 + 자동 갱신
3. Axios 인터셉터가 토큰 첨부/갱신 처리
4. 401 → 자동 로그아웃 후 `/login` 리다이렉트
5. `AuthProvider`가 `/login` 외 전 페이지에서 인증 강제

---

## 3. 디렉터리 구조

```
src/
├── client/        # 도메인별 API 클라이언트 (@base.ts = Axios 인스턴스/인터셉터)
├── components/
│   ├── layout/    # 레이아웃(사이드바/헤더/네비)
│   ├── page/      # 라우트별 페이지 컴포넌트 (예: space/, user/, dashboard/)
│   ├── shared/    # 재사용 컴포넌트 (DataTable, TableRowActions, form 헬퍼 등)
│   └── ui/        # shadcn/ui 베이스 컴포넌트
├── hooks/         # 도메인별 커스텀 훅 (TanStack Query)
├── lib/           # 유틸/프로바이더 (design-system/theme-provider 등)
├── pages/         # Next.js 파일 기반 라우팅
├── styles/        # globals.css(디자인 토큰) 등
└── types/         # 타입 정의 (client/types.ts 중심)
```

### 컴포넌트 조직
- **Pages**: 로직 최소화, `components/page/[route]`에서 import
- **API**: `src/client/` 도메인별 + `src/hooks/`의 TanStack Query 훅
- **List / Form|Modal / hooks** 책임 분리:
  - `List`: 조회/필터/테이블/열기 트리거
  - `Form`·`Modal`: 생성/수정 입력 + zod 검증
  - `hooks`/`services`: API 조합·상태 로직

### 패턴
```ts
// src/client/example.ts
export const getExamples = () => client.get('/examples');
// src/hooks/useExamples.ts
export const useExamples = () => useQuery(['examples'], getExamples);

// src/pages/example/list.tsx
const ExampleListPage = () => <ExampleList />;
ExampleListPage.getLayout = getDefaultLayout;
export default ExampleListPage;
```

---

## 4. UI/UX & 컴포넌트 규약 (요약 — 상세는 DESIGN.md)

- **Sheet**: 우측 패널은 `AdminSideSheetContent`. 헤더 고정 + 본문 스크롤 + 하단 액션 sticky. 생성/수정은 동일 폭 토큰(`sm|md|lg|xl|full`).
- **Modal**: 긴 폼은 `max-h` + `overflow-y-auto`, 작은 뷰포트 이탈 금지.
- **Form**: `FormSection` + `FormGroup` + `react-hook-form`/`zod`. 라디오/체크는 칩형 우선, 주요 액션 우측·하단 고정.
- **Table**: `DataTable`(canonical, 레거시 `DefaultTable` 신규 사용 금지). 컬럼 `size` 명시, 긴 텍스트 `truncate`, 행 액션 `TableRowActions`.
- **이미지/미디어**: 테이블 미리보기 `ClickableImagePreview`, 썸네일 투명 배경 + `object-contain`, 리스트 대표 미리보기 `120px` 기준.
- **색·타이포·간격·접근성**: → **[DESIGN.md](./DESIGN.md)** 를 단일 기준으로 따른다.

---

## 5. 유지보수 정책

- 새 화면은 **기존 패턴 우선 재사용**, 새 패턴 도입은 최소화
- 사용되지 않는 상태/분기/빈 디렉터리는 즉시 정리
- 기능 변경 시 대상 파일 타입 진단(`tsc`) 수행, UI 일관성(버튼 위치/상태 라벨/행 액션) 점검
- 옵셔널 응답 필드는 **값이 있을 때만 렌더**(서버 누락에 방어적; 예: 멤버 상태 뱃지)
- 제품/디자인 방향 변경 시 **코드보다 DESIGN.md / AGENTS.md 를 먼저 갱신**

## 6. 알려진 잔존 이슈 (별도 트랙)

프로젝트 레벨 TS 에러 일부가 잔존(별도 해결): `Dashboard.tsx`, `GameRankingList.tsx`(`bestScore` 타입), `GameRewardList.tsx`, `square-library/columns.tsx`, `useAdsTest.ts`.

---

새 작업은 본 문서와 DESIGN.md 기준을 우선 적용합니다.
