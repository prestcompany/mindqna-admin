# DESIGN.md — mindqna-admin 디자인 스타일 가이드

> 이 문서는 `mindqna-admin`의 **디자인 단일 출처(Source of Truth)** 입니다.
> 모든 UI/UX 작업(컴포넌트 신규/수정, 색·타이포·간격 결정, 리뷰)은 이 문서를 우선 기준으로 합니다.
> 제품 디자인 방향이 바뀌면 **코드보다 이 문서를 먼저 갱신**합니다.
>
> **디자인 언어: Vercel Geist.** 기준 화면(canonical reference)은 `/dashboard/analytics`와 `space`(공간) 목록/상세입니다.

---

## 0. 원칙 — 뺄셈의 설계

Geist는 **덜어내기의 훈련**입니다. 페이지는 거의 흰 종이(`canvas` #fafafa)이고 그 위에 거의 검은 잉크(`ink` #171717)가 얹힙니다. 제목, 본문, 1차 버튼, 모든 카드를 정의하는 1px 헤어라인이 **같은 잉크-회색 사다리**에서 나옵니다. 나머지는 절제입니다.

- **무채색이 규율이다**: 회색은 채도 0. 파란 기가 도는 회색을 섞지 않는다.
- **위계는 색이 아니라 weight·명도·여백으로**: 큰 수치는 중립, 색은 의미 신호에만.
- **깊이는 헤어라인이 먼저**: 1px 보더로 분리하고, 그림자는 "떠 있는 것"에만.
- **정보 밀도 + 빠른 스캔**: 한 화면에서 많은 데이터를 읽되 위계가 분명해야 함.
- **예측 가능한 상호작용**: 액션 위치·상태 라벨·행 액션을 일관되게.

### 0.1 원본 스펙 대비 조정 사항 (의도적 이탈)

Geist 원안은 **마케팅 사이트** 시스템입니다. 어드민에 옮기며 다음 4가지를 조정했습니다.

| 원안 | 이 프로젝트 | 사유 |
|---|---|---|
| Geist Sans | **Pretendard 유지** | Geist Sans에 한글 글리프 없음. 대체 불가 |
| success = link 블루 | **success = 녹색 유지** | 지급/차감·성공/실패를 색으로 구분해야 하는 데이터 요구 (§2.5) |
| `mute` #8f8f8f 를 캡션에 사용 | **텍스트 최저선은 #737373** | #8f8f8f는 캔버스 위 3.1:1로 WCAG AA 미달 (§7) |
| 히어로 메시 그라디언트 · 마케팅 알약 CTA · 로고 스트립 · 푸터 밴드 | **제외** | 어드민에 대응 화면 없음. 알약 형태는 필터 칩에만 잔존 (§5.3) |

---

## 1. 코드 레퍼런스

| 대상 | 위치 |
|---|---|
| 토큰 정의 | `src/styles/globals.css` (`:root`) |
| 팔레트·반경·그림자 매핑 | `tailwind.config.js` |
| 테마 적용 | `src/lib/design-system/theme-provider.tsx` (`data-admin-theme="vercel"` 고정) |
| 뱃지 | `src/components/ui/badge.tsx` |
| 테이블 | `src/components/shared/ui/data-table.tsx` |
| 필터 툴바 | `src/components/shared/ui/filter-bar.tsx` |
| 시트 | `src/components/shared/ui/admin-side-sheet-content.tsx` |
| 데이터 의미색 헬퍼 | `src/components/page/space/utils/space-display.ts` |

---

## 2. 색 (Color)

라이트 단독 운영(`color-scheme: light`). 다크는 비활성입니다.

### 2.1 Surface

| 역할 | 토큰 | 값 | 용도 |
|---|---|---|---|
| 캔버스 | `--canvas` / `bg-background` | `#fafafa` | 페이지 바탕. 카드가 떠 보이게 하는 기준면 |
| 상승 표면 | `--canvas-elevated` / `bg-white`·`bg-card` | `#ffffff` | 카드·입력·코드블록 |
| 옅은 표면 | `--hairline-soft` / `bg-muted` | `#f2f2f2` | 인셋 웰·교차 패널 |

> **핵심**: 캔버스가 #fafafa이므로 흰 카드는 **그림자 없이도** 뜹니다. 이것이 Geist가 그림자를 안 쓰는 이유입니다. 카드에 `shadow`를 더하지 마세요.

### 2.2 Ink ladder (텍스트 4단)

| 역할 | 토큰 | 값 | 대비(캔버스 위) | 용도 |
|---|---|---|---|---|
| 잉크 | `text-foreground` / `text-ink` / `text-slate-900` | `#171717` | 16.9:1 | 제목·1차 텍스트·수치 |
| 본문 | `text-muted-foreground` / `text-body` / `text-slate-600` | `#4d4d4d` | 8.1:1 | 본문·보조 텍스트·레이블·네비 |
| 캡션 | `text-slate-500` | `#737373` | 4.54:1 | **본문 텍스트 최저선** |
| 뮤트 | `text-mute` / `text-slate-400` | `#8f8f8f` | 3.1:1 | **텍스트 금지** — 아이콘·구분점·데코 전용 |
| 페인트 | `text-faint` | `#a1a1a1` | 2.9:1 | placeholder·disabled 라벨 전용 |

> **텍스트 대비 규칙**: 본문·데이터 값은 `slate-500`(#737373) 이상. `text-mute`/`slate-400` 이하는 텍스트에 쓰지 않습니다.
> **작은 크기 × 낮은 대비 중첩 금지**: `text-xs`에는 `slate-600` 이상을 씁니다.

### 2.3 Border

| 역할 | 토큰 | 값 | 용도 |
|---|---|---|---|
| 헤어라인 | `border-border` / `border-hairline` / `border-slate-200` | `#ebebeb` | 모든 카드·입력·구분선의 1px. 시스템의 구조적 일꾼 |

불투명도 변형(`border-border/70` 등)은 쓰지 않습니다 — 헤어라인은 단일 값입니다.

### 2.4 Accent

색이 허용되는 유일한 자리입니다. **넓은 면을 칠하지 마세요.**

| 역할 | 토큰 | 값 | 용도 |
|---|---|---|---|
| 링크 | `text-link` / `--ring` | `#0070f3` | 인라인 링크, 포커스 링 |
| 링크(press) | `text-link-deep` | `#0761d1` | 눌림 상태 |
| 링크(wash) | `bg-link-soft` | `#d3e5ff` | 옅은 하이라이트 배경 |
| 크로매틱 | `violet` `cyan` `pink` `magenta` | `#7928ca` `#50e3c2` `#ff0080` `#eb367f` | 차트·일러스트 액센트 전용 |

**브랜드 그라디언트** (`--gradient-*`): develop(블루→시안) / preview(바이올렛→핑크) / ship(레드→앰버). 차트나 일러스트 워시에만 쓰고, UI 크롬에는 쓰지 않습니다.

### 2.5 데이터 의미색 레이어 (어드민 전용)

Geist 원안에 없는, 이 프로젝트가 추가로 관리하는 층입니다. **크롬이 아니라 데이터의 의미**를 나타냅니다.

- **재화 방향**: 사용/차감 = `rose-600`, 지급/획득 = `emerald-600`
- **재화 종류**: 하트 = rose 계열, 스타 = amber 계열
- **신선도(생성 경과)**: 7일내 `softSuccess`, 30일내 `softWarning`, 그 외 `softNeutral` (`getRecencyVariant`)
- **0/빈 값은 색을 빼고 중립(`slate-500`)** — 0을 빨강으로 칠해 경고처럼 보이게 하지 않습니다.
- 공유 헬퍼: `space/utils/space-display.ts` (`getSpaceTypeConfig`, `getRecencyVariant`, `getMetricAccent`)

### 2.6 Semantic

| 토큰 | 값 | 용도 |
|---|---|---|
| `--destructive` | `#ee0000` | 위험/삭제 (press: `--destructive-deep` `#c50000`) |
| `--success` | 녹색 | 성공/긍정 — **원안의 블루 매핑을 따르지 않음** (§0.1) |
| `--warning` | `#f5a623` | 경고 |
| `--info` | `#0070f3` | 정보 (= link) |

---

## 3. 타이포그래피

### 3.1 폰트

- **한글·영문 모두 Pretendard 단일** (`var(--font-pretendard)`). Geist Sans는 한글 글리프가 없어 채택 불가입니다. 라틴 전용 폰트를 추가로 섞지 않습니다.
- **코드·ID·트랜잭션·JSON은 `font-mono`** = JetBrains Mono (`var(--font-jbmono)`). `0/O`·`1/l` 구분이 필요한 대조 작업 전용.
  - Geist Mono로 교체하려면 `_app.tsx`의 `JetBrains_Mono` import만 바꾸면 됩니다(mono는 라틴 전용이라 한글 제약 없음). 현재는 이미 셀프호스팅 중인 JetBrains Mono를 유지합니다.
- UGC(유저명·공간명·카드 내용)의 일본어는 `Hiragino Sans`/`Yu Gothic` 폴백. **UI에 이모지 사용 금지.**

### 3.2 스케일 (고정 5단)

`text-xs`(12) / `text-sm`(14) / 기본 15(html) / `text-base`(16) / `text-2xl`+(24+)

스케일 밖 임의값(`text-[Npx]`) 사용 금지. `text-lg`·`text-xl`·`text-3xl`은 신규 사용하지 않습니다.

**플로어**: 데이터 값·본문은 14px(`text-sm`) 미만 금지. 캡션·라벨은 12px(`text-xs`) 미만 금지.

### 3.3 위계

| 역할 | 사양 |
|---|---|
| 페이지 타이틀 | `text-2xl font-semibold tracking-display text-foreground` |
| 큰 수치(KPI) | `text-2xl font-semibold tracking-display tabular-nums` |
| 섹션 제목 | `text-base font-semibold tracking-heading text-foreground` |
| 레이블 | `text-sm font-medium tracking-label text-muted-foreground` |
| 캡션/메타 | `text-xs text-slate-600` |
| mono 아이브로우 | `.eyebrow` (`font-mono text-xs font-medium uppercase tracking-wide`) |

### 3.4 원칙

- **디스플레이 타입은 음수 자간으로 정의됩니다.** 클수록 더 조입니다 — `tracking-display`(-1.28px) → `tracking-heading`(-0.4px) → `tracking-label`(-0.28px). 본문은 중립 자간.
- **weight는 이분법**: 제목 600, 버튼·라벨 500, 나머지 400. light/black 없음, 이탤릭 없음.
- **mono는 두 역할뿐**: 코드/ID, 그리고 섹션을 여는 대문자 아이브로우 라벨.
- **숫자는 항상 `tabular-nums`** (정렬·점프 방지). 수치 자체는 중립색.
- **한글 보정**: 라틴 기준 레퍼런스의 px를 그대로 이식하지 않습니다. 한글은 글리프 밀도가 높아 같은 px에서 체감 가독성이 한 단계 낮으므로, 벤치마크 대비 한 단계 큰 스케일을 적용합니다. (원안의 48px 디스플레이를 24px로 낮춘 이유이기도 합니다 — 어드민은 마케팅 히어로가 없습니다.)

---

## 4. 간격 · 그리드 · 반경 · 깊이

### 4.1 간격 (4px 베이스)

허용 스텝: **4 / 8 / 12 / 16 / 24 / 32 / 40 / 64 / 96 / 128px**
→ `gap-1/2/3/4/6/8/10/16/24/32`, `p-1/2/3/4/6/8`

**20px(`p-5`·`gap-5`)은 스케일 밖입니다** — 쓰지 마세요.

- 카드 내부: 24–32px (`p-6`~`p-8`), 밀집 화면은 16px(`p-4`) 허용
- 섹션 간 수직 리듬: 32–64px (`space-y-8`~`space-y-16`)
- KPI 그리드는 화면폭에 따라 단계적 확장(예: `grid-cols-2 sm:grid-cols-3 xl:grid-cols-6`), 좁은 폭에서 과밀 금지

컨테이너: 중앙 정렬 `max-w-[1600px]`, 좌우 거터 `px-4 sm:px-8`.

### 4.2 반경 (Geist 스케일)

| Tailwind | 값 | 용도 |
|---|---|---|
| `rounded-sm` | 4px | 체크박스 등 마이크로 컨트롤 |
| `rounded-md` | **6px** | 버튼·입력·뱃지·셀렉트 — 기능적 크롬 |
| `rounded-lg` | **12px** | 카드·테이블 컨테이너·코드블록 |
| `rounded-2xl` | 16px | 큰 패널·시트 |
| `rounded-pill` | 100px | 필터 칩·카테고리 탭 |
| `rounded-full` | 9999px | 아바타·원형 아이콘 버튼 |

> 반경 언어는 **이분법**입니다: 기능적 크롬은 타이트한 6px, 콘텐츠 카드는 12px.
> `rounded-xl`은 카드 값(12px)으로 흡수한 **레거시 별칭**입니다 — 신규 코드는 `rounded-lg`를 쓰세요.

### 4.3 깊이 (2단)

| 레벨 | 처리 | 용도 |
|---|---|---|
| **0 — Flat** | 1px 헤어라인, 그림자 없음 | **기본값.** 카드·테이블·입력·구분선 |
| 1 — Whisper | 헤어라인 + `shadow-whisper` (`0 1px 1px rgba(0,0,0,.04)`) | 살짝 들린 카드 |
| 2 — Floating | `shadow-floating` (레이어드 저알파) | 드롭다운·모달·툴팁·토스트 |

**정적 표면에 보더와 그림자를 함께 걸지 마세요.** 이것이 이 시스템에서 가장 흔한 실수이며, 화면을 낡아 보이게 하는 1순위 원인입니다.

`shadow-md/lg/xl/2xl`은 전부 `floating` 한 단계로 접혔습니다. 5단 그림자 스케일은 존재하지 않습니다.

### 4.4 모션

| 토큰 | 값 | 용도 |
|---|---|---|
| `duration-fast` | 120ms | hover/press 색·불투명도, 행 hover |
| `duration-base` | 160ms | 팝오버/드롭다운/툴팁 fade+scale |
| `duration-slow` | 200ms | 시트/모달 진입 (퇴장 ≈140ms) |

easing: enter `ease-out`, exit `ease-in`. `prefers-reduced-motion` 전역 존중. **임의 duration 금지.**

---

## 5. 컴포넌트 규약

### 5.1 Card / Surface
흰 카드(`bg-white`) + `border border-border` + `rounded-lg` + **그림자 없음**. 내부 패딩 `p-4`(밀집) ~ `p-6`(여유).

### 5.2 Table — `DataTable` (canonical)
- 리스트는 `DataTable`을 씁니다. 원시 `<table>`·레거시 테이블 신규 사용 금지.
- 컨테이너: `rounded-lg border border-border`, 그림자 없음.
- 컬럼 `size` 명시로 고정폭. 긴 텍스트 `truncate`(+tooltip).
- 헤더: `h-9`, `text-xs font-medium text-slate-600`, 대문자 변환 금지.
- 행 패딩 `py-2`(행높이 ≈36px). 셀 숫자는 중립 `tabular-nums`.
- 행 액션은 `TableRowActions`(드롭다운)로 통일. Row expand는 특별 요구 없으면 미사용.

### 5.3 Button
- **모든 버튼은 6px 사각(`rounded-md`)** 입니다. 어드민에는 마케팅 CTA가 없으므로 알약 버튼을 쓰지 않습니다.
- 1차 액션: `bg-primary`(#171717) + 흰 텍스트. 2차: 흰 배경 + 헤어라인.
- 높이: 툴바/인라인 컨트롤 `h-8`, 주요 액션 `h-9`. `size='lg'`는 쓰지 않습니다.
- 알약(`rounded-pill`)은 **필터 칩과 카테고리 탭에만** 허용됩니다.

### 5.4 Badge
shadcn `Badge` 사용. 데이터 화면은 soft 톤 기본.

| 종류 | 변형 | 규칙 |
|---|---|---|
| **상태값** (활성/만료/성공/실패) | `dotSuccess` `dotDanger` `dotWarning` `dotNeutral` `dotInfo` | 색 점 + 중립 텍스트. 배경칠 없음 |
| **카테고리** (플랫폼·타입·재화 종류) | `softNeutral` `softSuccess` `softWarning` `softDanger` `softInfo` `tonePink` | 50/700 페어 |
| 강한 강조 | `default` `destructive` `success` `warning` `info` `secondary` | 폼·버튼 맥락에서만 |

> **soft vs dot**: 카테고리는 soft, **상태값은 dot**. dot은 항상 텍스트 라벨을 병행합니다(색 단독 금지).

### 5.5 Filter / Toolbar
- 목록 상단 필터는 `FilterBar`를 씁니다 — **카드로 감싸지 않은 평면 툴바**(`py-3`).
- 컨트롤 높이는 `FILTER_CONTROL_CLASS`(`h-8`)로 통일.
- 활성 필터는 `FilterChips`(`rounded-pill`)로 노출하고 개별 제거를 지원합니다.
- 검색은 디바운스 자동검색을 기본으로 합니다.

### 5.6 Sheet / Modal
- 우측 패널은 `AdminSideSheetContent`. 헤더 고정 + 본문 스크롤 + 하단 액션 sticky.
- 긴 폼 모달은 `max-h` + `overflow-y-auto` 필수.
- 확인 대화는 `AlertDialog`로 통일합니다.

### 5.7 Form
- `FormSection` + `FormGroup` 조합. 검증은 **`react-hook-form` + `zod`** 로 통일.
- 라디오/체크는 칩형(라벨 카드) 우선. 주요 액션 우측 정렬·하단 고정.

### 5.8 KPI 타일 / 타임라인 행
- KPI 타일: 흰 카드, 레이블 `text-sm text-muted-foreground`, 값 `text-2xl font-semibold tracking-display tabular-nums`(중립).
- 타임라인(재화 내역): 좌측 **종류 칩(색)** · 중앙 행위자+사유 · 우측 **부호 금액(방향색)+압축 날짜**.

---

## 6. 페이지 리듬

어드민 페이지의 표준 구성:

```
PageHeader (타이틀 + 설명 + 액션)
  ↓
FilterBar (평면 툴바 + 활성 칩)
  ↓
DataTable (헤어라인 카드, 그림자 없음)
  ↓
Pagination
```

상세는 우측 `Sheet`로 엽니다. 페이지 전환보다 시트를 우선합니다.

---

## 7. 접근성 (필수)

- **대비**: 본문/보조 텍스트 최소 `slate-500`(#737373, 4.54:1). `text-mute`/`slate-400` 이하 텍스트 금지.
- **색 단독 금지**: 색 + 라벨/부호/아이콘 병행(예: 사용/지급은 색 + `+/-` + 텍스트).
- **히트영역(데스크톱 포인터)**: 툴바/필터/인라인 컨트롤 최소 32px(`h-8`), 주요 액션 36px(`h-9`). 터치 44px 규칙은 터치 지원 화면 한정. 칩 내부 제거(X) 버튼 등 마이크로 컨트롤은 24px(`h-6`)까지 허용하되 여백으로 히트영역을 보강합니다.
- **포커스**: 키보드 포커스 링 가시화. 링 색은 `--ring`(link 블루)입니다.
- **모션**: §4.4의 3단 토큰만 사용. 레이아웃 시프트를 유발하는 scale hover 지양.

---

## 8. Do / Don't

### Do
- 캔버스는 #fafafa, 잉크는 #171717 — 흑백 듀엣으로 끌고 간다
- 카드·입력은 **1px 헤어라인 먼저**, 그림자는 마지막 수단
- 회색은 채도 0. 잉크 사다리를 단계적으로 밟는다(`ink → body → slate-500`)
- 버튼은 6px 사각, 알약은 필터 칩·카테고리 탭에만
- 디스플레이 타입에 음수 자간(`tracking-display`)을 건다
- 상태값은 dot 뱃지, 카테고리는 soft 뱃지
- 숫자는 `tabular-nums`, 수치 자체는 중립색
- 이모지 대신 SVG 아이콘(lucide)

### Don't
- 정적 표면에 보더 + 그림자를 함께 걸지 않는다 — **가장 흔한 실수**
- 넓은 면을 액센트 색으로 칠하지 않는다 (violet/cyan/pink는 차트·일러스트용)
- 본문을 순수 검정(`#000`)으로 두지 않는다 — 잉크는 #171717
- 회색 스케일에 파란 기가 도는 톤을 섞지 않는다
- 한 맥락에서 버튼 형태를 섞지 않는다
- 그림자를 쌓아 올리지 않는다 — 깊이는 헤어라인 + 저알파 1단
- 0 값을 빨강으로 강조하지 않는다
- 임의값(`text-[Npx]`, `duration-[Nms]`, `p-5`)을 쓰지 않는다
- 두 번째 장식 체계를 추가하지 않는다 — 잉크와 헤어라인이 전부다

---

## 9. 마이그레이션 현황

### 완료

| 항목 | 규모 | 결과 |
|---|---|---|
| 토큰 레이어 Geist 전환 | — | `globals.css` / `tailwind.config.js` |
| `slate`·`gray` 팔레트 무채색화 | 팔레트 재정의 | 청회색 160곳이 파일 수정 없이 정합 |
| 정적 표면 `shadow-sm` 제거 | 83곳 → **0** | 보더+그림자 이중 적용 전량 해소 |
| 컨트롤 그림자 제거 | 버튼·입력·뱃지·셀렉트·체크박스·라디오·스위치 | Geist 평면 규칙 적용 |
| `rounded-xl` → `rounded-lg` | 19곳 → **0** | |
| 보더 불투명도 변형 제거 | 77곳 → **0**(login 제외) | 헤어라인 단일값화 |
| 임의 duration 토큰화 | 1곳 → **0** | `duration-exit` 추가 |
| `zinc-*` → `slate-*` | 26곳 → **0** | |
| 툴바 `DefaultTableBtn` → `FilterBar` | 14개 모듈 + `UserFilterBar` | 툴바 세대 통일. `default-table-btn.tsx` 삭제 |
| 툴바 컨트롤 높이 통일 | — | 전 모듈 `FILTER_CONTROL_CLASS`(h-8), 추가 버튼 `size='lg'` 제거 |

### 남은 작업

| 항목 | 규모 | 조치 |
|---|---|---|
| solid 뱃지 → dot/soft 재분류 | 41곳 | §5.4 |
| `assets` 모듈 편입 | 4파일 | 자체 페이지 헤더·`bg-gray-50` 캔버스·`blue-500` 액센트·정적 `shadow-md/lg` 제거, `DataTable` 채택 |
| `text-gray-*` → `text-slate-*` | 41곳 | 팔레트 재정의로 **색은 이미 동일**. 명명 통일만 남음 |
| `border-slate-*` → `border-border` | — | 값 동일. 시맨틱 토큰으로 점진 이전 |

> `pages/login.tsx`는 의도적으로 어두운 표면을 쓰는 예외 화면입니다(`slate-900` 배경 위 `slate-400` 텍스트 — 어두운 배경에서는 대비를 충족).
