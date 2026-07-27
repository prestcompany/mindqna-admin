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

**색·타이포·간격·깊이·접근성은 [DESIGN.md](./DESIGN.md)가 단일 기준입니다.** 아래는 이 레포의 구현체 매핑입니다.

| DESIGN.md 컴포넌트 | 구현체 |
|---|---|
| `data-table` | `shared/ui/data-table.tsx` (canonical) |
| `filter-bar` / `filter-chip` | `shared/ui/filter-bar.tsx` (`FilterBar`, `FilterChips`, `FILTER_CONTROL_CLASS`) |
| `side-sheet` | `shared/ui/admin-side-sheet-content.tsx` |
| `form-section` | `shared/form/ui/form-section.tsx` + `form-group.tsx` |
| `dropdown-menu`(행 액션) | `shared/ui/table-row-actions.tsx` |
| `badge` | `ui/badge.tsx` (`dot*` 상태 / `soft*` 카테고리) |
| 데이터 의미색 헬퍼 | `page/space/utils/space-display.ts` |

- **토큰 정의**: `src/styles/globals.css` (`:root`) — `tailwind.config.js`가 팔레트·반경·그림자·자간으로 매핑.
- **테마**: `lib/design-system/theme-provider.tsx`가 `data-admin-theme="vercel"`을 고정 적용(다크 비활성).
- **중립 회색 램프**: Tailwind 기본 `slate`/`gray`를 채도 0 램프로 재정의했습니다. `slate-500`(#737373)이 텍스트 최저선, `slate-400` 이하는 아이콘/데코 전용.
- **Table**: 컬럼 `size` 명시, 긴 텍스트 `truncate`, 행 액션은 `TableRowActions`. 원시 `<table>` 신규 사용 금지.
- **Form**: `react-hook-form` + `zod`. 라디오/체크는 칩형 우선, 주요 액션 우측·하단 고정.
- **이미지/미디어**: 테이블 미리보기 `ClickableImagePreview`, 썸네일 투명 배경 + `object-contain`, 리스트 대표 미리보기 `120px` 기준.

### 4.1 DESIGN.md 원안(Vercel Geist) 대비 조정

| 원안 | 이 레포 | 사유 |
|---|---|---|
| Geist Sans | Pretendard | Geist Sans에 한글 글리프 없음 |
| success = link 블루 | success = 녹색 | 지급/차감을 색으로 구분해야 함 |
| 캡션에 mute(#8f8f8f) | 텍스트 최저선 #737373 | #8f8f8f는 캔버스 위 3.1:1로 AA 미달 |
| 히어로 메시 그라디언트 · 마케팅 알약 CTA · 로고 스트립 · 푸터 | 제외 | 어드민에 대응 화면 없음. 알약은 필터 칩에만 잔존 |

### 4.2 디자인 시스템 적용 현황

Geist 전환은 완료 상태입니다.

- 토큰 레이어(`globals.css` / `tailwind.config.js`) Geist 값으로 전환
- Tailwind `slate`/`gray` 팔레트를 채도 0 램프로 재정의
- 정적 표면의 border+shadow 이중 적용 83곳 제거, 컨트롤 전면 평면화
- 곡률·보더 불투명도·`zinc`·임의 duration 정규화
- 툴바 19개 모듈 `FilterBar` 통일 (`DefaultTableBtn` 삭제)
- solid 뱃지 재분류: 상태→`dot`, 카테고리→`soft`, 단순 값→중립 텍스트
- `assets` 모듈 편입 (자체 헤더·gray/blue 팔레트·전체 새로고침 제거)
- `gray-*`→`slate-*`, `border-slate-200/100`→`border-border`

**의도적으로 남긴 것**

| 항목 | 사유 |
|---|---|
| `assets`의 이미지 그리드 + 무한 스크롤 | 썸네일 브라우징에는 `DataTable`보다 그리드가 맞음 |
| `GamePlayList`·`GameRankingList`의 인라인 색 뱃지 | 게임별 `primaryKeyColor` 기반 데이터 색 |
| `border-slate-300` / `-400` | hover·focus 어포던스(헤어라인 아님) |
| `border-slate-700` / `-900`, `pages/login.tsx`의 `text-slate-400` | 로그인 화면은 다크 표면 예외 |

**남은 정리 대상** — `text-lg`/`rounded-2xl` 등 스케일 밖 값이 대시보드 일부에 잔존.

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
