# DESIGN.md — mindqna-admin 디자인 스타일 가이드

> 이 문서는 `mindqna-admin`의 **디자인 단일 출처(Source of Truth)** 입니다.
> 모든 UI/UX 작업(컴포넌트 신규/수정, 색·타이포·간격 결정, 리뷰)은 이 문서를 우선 기준으로 합니다.
> 제품 디자인 방향이 바뀌면 **코드보다 이 문서를 먼저 갱신**합니다.
> 기준 화면(canonical reference): `/dashboard/analytics` 대시보드와 `space`(공간) 상세/검색/목록.

---

## 1. 원칙 & 레퍼런스

데이터 밀집 어드민 SaaS. 지향점은 **Stripe / Linear / Apple HIG / Swiss(International) 스타일**의 교집합:

- **정보 밀도 + 빠른 스캔**: 한 화면에서 많은 데이터를 읽되 위계가 분명해야 함
- **중립 캔버스 + 절제된 색**: 무채색(slate) 베이스 위에 색은 **의미 신호에만**
- **위계는 색이 아니라 weight·size·여백으로**: 큰 숫자는 중립, 색은 작은 요소에 한정
- **예측 가능한 상호작용**: 액션 위치·상태 라벨·행 액션을 일관되게

---

## 2. 색 (Color)

### 2.1 테마 토큰 (CSS 변수, `src/styles/globals.css`)
라이트 단독 운영(`color-scheme: light`, `data-admin-theme="vercel"`). 다크는 비활성.

| 토큰 | 값(HSL) | 용도 |
|---|---|---|
| `--background` / `--card` | `0 0% 100%` | 캔버스·카드 배경(흰색) |
| `--foreground` | `0 0% 3.9%` | 본문 기본 텍스트(거의 검정) |
| `--primary` / `--ring` | `0 0% 9%` | 브랜드 1차 액션·포커스 링(near-black) |
| `--muted-foreground` | `0 0% 45.1%` | 보조 텍스트(중립 회색) |
| `--border` / `--input` | `0 0% 89.8%` | 헤어라인 보더 |
| `--destructive` | `0 72% 51%` | 위험/삭제 |
| `--success` | `142 64% 42%` | 성공/긍정 |
| `--warning` | `37 96% 58%` | 경고 |
| `--info` | `212 92% 58%` | 정보 |
| `--radius` | `0.625rem` (10px) | 기본 곡률 |

> 가능하면 테마 토큰(`text-foreground`, `bg-card`, `border` …)을 우선 사용. 단, 아래 **surface 팔레트(slate)** 는 analytics/space 화면에서 의도적으로 채택된 보조 체계입니다(라이트 고정이라 토큰과 시각적으로 정합).

### 2.2 Surface 팔레트 (slate) — 표면·텍스트 위계
analytics 대시보드 기준. 카드/시트 내부의 표면·텍스트 위계는 다음 slate 스케일을 사용:

| 역할 | 클래스 | 비고 |
|---|---|---|
| 카드 표면 | `bg-white` + `border-slate-200/80` + `shadow-sm` | 흰 카드 + 헤어라인 + 약한 그림자 |
| 1차 텍스트(값/제목) | `text-slate-900` ~ `text-slate-950` | |
| 레이블 | `text-slate-600` | |
| 보조/캡션 | `text-slate-500` | **본문 텍스트 최저선** (대비 ≈4.4:1) |
| 구분점·장식 | `text-slate-300` | 텍스트 아님(`·` 등 데코만) |

> **`text-slate-400`는 텍스트에 사용 금지**(white 위 ≈2.6:1, WCAG AA 미달). 아이콘/데코만 허용, 텍스트는 `slate-500` 이상.

### 2.3 액센트 & 뱃지 변형 (`src/components/ui/badge.tsx`)
색은 **카테고리/상태 신호**에만. solid 뱃지는 강조가 과하므로 데이터 화면에선 **soft 톤**(50/700 페어)을 기본으로.

| variant | 색 | 의미 |
|---|---|---|
| `softNeutral` | slate | 중립 태그(언어, 카드수, 기본) |
| `softSuccess` | emerald | 긍정/프리미엄/최근 |
| `softWarning` | amber | 주의/골드클럽/스타 |
| `softDanger` | rose | 위험/삭제/하트 |
| `softInfo` | sky | 정보/혼자 타입 |
| `tonePink` | pink | 커플 타입 |
| `default`/`destructive`/`success`/`warning`/`info`/`secondary` | (solid) | 강한 강조가 필요한 폼·버튼 맥락에서만 |

### 2.4 의미색 규칙 (Currency / Status)
- **재화 방향**: 사용/차감 = `rose-600`, 지급/획득 = `emerald-600`
- **재화 종류 식별**: 하트 = rose 계열, 스타 = amber 계열
- **신선도(생성 경과)**: 7일내 = `softSuccess`, 30일내 = `softWarning`, 그 외 = `softNeutral` (`getRecencyVariant`)
- **0/빈 값은 색을 빼고 중립(`slate-500`)** — 0을 빨강으로 칠해 경고처럼 보이게 하지 않는다.
- 공유 헬퍼: `src/components/page/space/utils/space-display.ts` (`getSpaceTypeConfig`, `getRecencyVariant`, `getMetricAccent`).

---

## 3. 타이포그래피
- 폰트: **Pretendard**(`var(--font-pretendard)`), 한국어 폴백 체인. 코드/ID는 `font-mono`.
- 기본 본문 `15px`(html). 위계는 weight·size로:
  - 큰 수치: `text-2xl`~`text-3xl font-semibold tracking-tight`
  - 섹션 제목: `text-base font-semibold text-slate-900`
  - 레이블: `text-sm font-medium text-slate-600`
- **숫자는 항상 `tabular-nums`** (정렬·점프 방지). 수치 자체는 **중립색** 원칙(색은 의미 신호에만).

---

## 4. 간격 · 그리드 · 곡률 · 깊이
- **8px 스케일**: `gap-2/4/6`, `p-4/6`, `space-y-6`. 20px(`gap-5`/`p-5`)처럼 그리드 밖 값은 지양.
- KPI 그리드는 화면폭에 따라 단계적 확장(예: `grid-cols-2 sm:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6`), 좁은 폭에서 과밀 금지.
- **곡률 위계**: 카드 `rounded-xl`(12) > 칩/아이콘 `rounded-lg`(10) > 알약/아바타 `rounded-full`.
- **깊이**: `shadow-sm`만. 그 이상 그림자·그라데이션 지양(헤어라인 보더로 분리).

---

## 5. 컴포넌트 규약

### Card / Surface
- 흰 카드 + `border-slate-200/80` + `shadow-sm`. 내부 패딩 `p-4`(밀집) ~ `p-6`(여유).

### Badge
- shadcn `Badge`(`src/components/ui/badge.tsx`) 사용. 데이터 화면 = soft 톤. 카테고리는 색, 단순 카운트는 중립 텍스트.

### Table — `DataTable` (canonical)
- 리스트는 `DataTable` 사용(레거시 `DefaultTable`은 신규 사용 금지).
- 컬럼 `size` 명시로 고정폭. 긴 텍스트 `truncate`(+필요시 tooltip).
- 행 액션은 `TableRowActions`(드롭다운)로 통일. Row expand는 특별 요구 없으면 미사용.
- 셀 숫자는 중립 `tabular-nums`, 의미 신호(타입/재화/상태)만 색.

### Sheet / Modal
- 우측 패널은 `AdminSideSheetContent`. 헤더 고정 + 본문 스크롤 + 하단 액션 sticky.
- 긴 폼 모달은 `max-h` + `overflow-y-auto` 필수, 작은 뷰포트에서 화면 이탈 금지.

### Form
- `FormSection` + `FormGroup` 조합. 검증은 **`react-hook-form` + `zod`** 로 통일(antd Form 미사용).
- 라디오/체크는 칩형(라벨 카드) 우선. 주요 액션 우측 정렬·하단 고정.

### KPI 타일 / 목록 행 / 타임라인 행
- KPI 타일: 흰 카드, 레이블 `text-slate-600`, 값 `text-2xl font-semibold tabular-nums`(중립, 의미 있을 때만 액센트).
- 타임라인(재화 내역 등): 좌측 **종류 칩(색)** · 중앙 행위자+사유 · 우측 **부호 금액(방향색)+압축 날짜**.

---

## 6. 접근성 (필수)
- **대비**: 본문/보조 텍스트 최소 `slate-500`(권장 `slate-600`), 4.5:1 지향. `slate-400` 이하 텍스트 금지.
- **색 단독 금지**: 색 + 라벨/부호/아이콘 병행(예: 사용/지급은 색 + `+/-` + 텍스트).
- **터치/히트영역**: 인터랙션 요소 최소 36px(`h-9`), 가능하면 44px. 인라인 복사 버튼은 패딩으로 히트영역 확보 + hover 피드백.
- **포커스**: 키보드 포커스 링 가시화(`--ring`).
- **모션**: `transition-colors` 150–300ms. 레이아웃 시프트 유발하는 scale hover 지양.

---

## 7. Do / Don't
- ✅ 무채색 캔버스 + 의미색 절제 / ❌ 모든 셀에 색 뱃지 남발
- ✅ 큰 숫자 중립 + 작은 신호에 색 / ❌ 0 값을 빨강으로 강조
- ✅ `DataTable`·`AdminSideSheetContent`·shadcn `Badge` 재사용 / ❌ 새 패턴 즉흥 도입
- ✅ `slate-500`+ 텍스트 / ❌ `slate-400` 텍스트
- ✅ 8px 간격·곡률 위계 준수 / ❌ `gap-5`·곡률 혼용
- ✅ 이모지 대신 SVG 아이콘(lucide) / ❌ 이모지 아이콘

---

## 8. 코드 레퍼런스
- 토큰: `src/styles/globals.css`, `tailwind.config.js`
- 뱃지: `src/components/ui/badge.tsx`
- 디자인 헬퍼: `src/components/page/space/utils/space-display.ts`
- 기준 화면: `src/components/page/dashboard/**`, `src/components/page/space/**`
