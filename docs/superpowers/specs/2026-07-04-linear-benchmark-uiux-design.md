# Linear 벤치마크 UI/UX 개선 (설계)

- 날짜: 2026-07-04
- 상태: 설계 검토 중
- 범위: `mindqna-admin` 전용 (서버 변경 없음)
- 전제: **컬러 팔레트 불변** — slate 중립 캔버스, near-black primary, soft 뱃지 색상값(50/700 페어) 모두 유지

## 1. 배경 / 목표

DESIGN.md는 이미 Stripe/Linear/Swiss를 지향점으로 명시하지만, 실제 구현은 밀도·모션·키보드 인터랙션에서 Linear 수준에 미달한다. 이번 작업은 색을 바꾸지 않고 **구조·밀도·모션·인터랙션**으로 Linear의 "빠릿하고 밀도 높은" 감각을 구현한다.

전략: **공통 컴포넌트/토큰 개선 → "인앱 결제 관리" 화면 파일럿 → 확산**. Cmd+K 커맨드 팔레트 포함.

## 2. 비목표 (Non-goals)

- 컬러 팔레트/브랜드 변경, 다크 모드 도입
- 모바일 터치 최적화 (데스크톱 포인터 전용 어드민 기준 유지)
- 레거시 `DefaultTable` 개선 (신규 사용 금지 정책 유지)
- 파일럿 외 화면의 일괄 변경 (확산은 후속 단계)

## 3. 디자인 결정

### 3.1 스케일·밀도

| 항목 | 현재 | 변경 |
|---|---|---|
| 카드 곡률 | `rounded-xl`(12px) | `rounded-lg`(10px, `--radius`와 정합). 위계: 카드 10 > 칩/입력 8(`rounded-md`) > 알약 full |
| 테이블 행 패딩 | `py-3` | `py-2` (행 높이 ≈44→36px) |
| 테이블 헤더 | UPPERCASE + `tracking-wide` | 소문자 원문 + `text-xs font-medium text-slate-500` (대문자 변환 제거) |
| 툴바 컨트롤 | `h-10` 입력, 기본 버튼 | 필터/툴바는 컴팩트 `h-8` + `text-[13px]`, 폼(생성/수정)은 기존 `h-10` 유지 |
| 본문 기준 | html 15px | 유지. 데이터 UI(테이블 셀·필터·메타)는 `text-sm`(14) 기준 |

**히트영역 규칙 완화(결정)**: DESIGN.md §6의 "인터랙션 최소 36px(h-9)"를 **"데스크톱 포인터 기준: 툴바/인라인 컨트롤 최소 32px(h-8), 주요 액션 버튼은 36px(h-9) 유지"**로 개정한다. 근거: 마우스 전용 어드민이며 Linear/Stripe 동급 밀도 확보에 필수. 터치 최소 44px 규칙은 폐기가 아니라 "터치 지원 화면 한정"으로 명확화.

### 3.2 모션 토큰

`tailwind.config.js`에 duration 토큰 추가, DESIGN.md에 규정:

| 토큰 | 값 | 용도 |
|---|---|---|
| `duration-fast` | 120ms | hover/press 색·불투명도 |
| `duration-base` | 160ms | 팝오버/드롭다운/툴팁 fade+scale |
| `duration-slow` | 200ms | 시트/모달 진입 (퇴장은 ~140ms, enter보다 짧게) |

- easing: enter `ease-out`, exit `ease-in`. `prefers-reduced-motion` 존중(전역 미디어 쿼리로 duration 단축).
- 레이아웃을 흔드는 scale hover 금지 유지. 리스트 행 hover는 `bg-slate-50` 즉각 전환(`duration-fast`).

### 3.3 상태 표현 — Badge `dot` 변형 추가

배경칠 soft 뱃지의 시각 소음을 줄이기 위해 **dot indicator 변형**을 추가한다 (soft 뱃지는 폐기하지 않고 공존 — 카테고리성 태그는 soft 유지, **상태(활성/만료/성공/실패/구독상태)는 dot 우선**):

```
[● 활성]  = w-1.5 h-1.5 rounded-full bg-emerald-500 + text-[13px] text-slate-700
```

- `badge.tsx`에 `dotSuccess | dotDanger | dotWarning | dotNeutral | dotInfo` variant 추가 (색상값은 기존 soft 팔레트의 500 계열 재사용, 배경 없음/투명).
- 색 단독 금지 원칙 준수: dot + 텍스트 라벨 병행이므로 충족.

### 3.4 필터 툴바 — `FilterBar` 공통 컴포넌트 신설

`src/components/shared/ui/filter-bar.tsx`:

- 한 줄 컴팩트 툴바: 검색 인풋(`h-8`, 아이콘 인라인) + Select들(`h-8`) + 우측 액션. 줄바꿈 허용.
- 적용된 필터는 **제거 가능한 칩**(`x` 버튼)으로 표시 — 기존 `SpaceActiveFilterChips` 패턴을 일반화.
- 제출 방식 규칙: **즉시 반영(디바운스 500ms)이 기본**. 단, 조회 비용이 큰 화면(결제 내역 탭 등 서버 페이지네이션 검색)은 Enter 제출 + 컴팩트 검색 버튼(`h-8`)을 허용한다. 어느 쪽이든 적용된 필터는 칩으로 표시.

### 3.5 DataTable 개선 (공통, 전 화면 영향)

- 행 패딩 `py-2`, 헤더 소문자화(§3.1), 행 hover `bg-slate-50 transition-colors duration-fast`.
- **키보드 접근**: `onRow`가 onClick을 반환하면 `tabIndex=0`, `role="button"`, Enter/Space로 활성화 (기존 백로그 해소. UserList/SpaceList/결제 목록 모두 자동 수혜).
- 페이지네이션 버튼 `h-8` 컴팩트화.

### 3.6 AdminSideSheetContent 컴팩트화 (공통)

- 헤더: `py-4`→`py-3`, 제목 `text-base`→`text-sm font-semibold`, description은 `text-xs text-slate-500` 한 줄(메타 성격).
- 본문 패딩 `px-6 py-5`→`px-5 py-4`.
- 시트 진입/퇴장 모션을 §3.2 토큰에 맞춤(진입 200ms ease-out / 퇴장 140ms ease-in).

### 3.7 Cmd+K 커맨드 팔레트

`src/components/shared/command-palette/CommandPalette.tsx` + 전역 등록(`default-layout` 또는 `_app`):

- **트리거**: `⌘K` / `Ctrl+K`, 사이드바에 힌트 표시(선택).
- **그룹 1 — 메뉴 이동**: `main-menu.tsx`의 메뉴 트리를 소스로 전 메뉴 항목 나열·필터·이동.
- **그룹 2 — 유저 검색**: 서버에 부분 일치 유저 검색 API가 없으므로 **정확 일치 단건 조회**로 동작한다. 2자 이상 입력 시 `getUser(username)` 시도 → 존재하면 "유저: {username} 열기" 항목 표시 → `/user/list?username=` 딥링크로 이동(Task 11에서 만든 기존 기능 재사용). 미존재 시 항목 미표시(에러 UI 없음).
- **그룹 3 — 스페이스 검색**: `searchSpaces({ spaceId | name })` 첫 페이지 상위 5건 → 스페이스 검색 화면으로 이동(가능하면 상세 시트 딥링크는 후속).
- shadcn `Command`(cmdk) 사용. 검색 디바운스 300ms, 로딩 인라인 스피너.
- 접근성: 포커스 트랩·ESC 닫기·`aria-label`은 cmdk 기본 + 검증.

## 4. 파일럿 적용 — "인앱 결제 관리" 화면

공통 개선(§3.1~3.6)이 자동 반영되는 것에 더해:

- 결제 내역/이용권 탭 필터를 `FilterBar`로 교체 (적용 필터 칩 포함).
- 상태 컬럼(성공/실패/만료, 활성/만료)을 dot 변형으로 전환. 플랫폼/유형 등 카테고리 태그는 soft 유지.
- `PurchaseDetailSheet` 섹션 헤더·간격을 컴팩트 스케일로 정리(섹션 `space-y-6`→`space-y-5`, 카드 행 `px-4 py-3`→`px-3 py-2.5`).
- 파일럿 검수 후 확산 단계에서 유저/스페이스/대시보드 화면 적용.

## 5. 구현 순서 (Phase)

| Phase | 내용 | 산출물 |
|---|---|---|
| 0 | **DESIGN.md 개정** (본 스펙 승인 후 즉시): §3.1 곡률/밀도, §3.2 모션 토큰, §3.3 dot 뱃지, 히트영역 규칙 완화 | DESIGN.md 커밋 |
| 1 | 전역 토큰: tailwind duration, reduced-motion, 곡률 가이드 반영 | globals.css / tailwind.config.js |
| 2 | 공통 컴포넌트: DataTable(밀도·헤더·hover·키보드), AdminSideSheetContent, Badge dot, FilterBar | shared 컴포넌트 4종 |
| 3 | Cmd+K 커맨드 팔레트 | CommandPalette + 전역 등록 |
| 4 | 파일럿: 인앱 결제 관리 + PurchaseDetailSheet 적용 | 파일럿 화면 |
| 5 | (후속, 별도 계획) 유저/스페이스/대시보드 확산 | — |

## 6. 리스크 / 가드

- **DataTable·시트는 전 화면 공유** — Phase 2 변경은 파일럿 외 화면에도 즉시 반영됨(밀도·hover·키보드는 회귀 위험이 낮은 비파괴 변경으로 한정). 시각 확인은 파일럿 검수 시 대표 화면(유저/스페이스 목록) 스팟 체크.
- 대비 4.5:1, `slate-400` 텍스트 금지, 색 단독 금지 등 기존 접근성 규칙 전부 유지.
- 검증: `npx tsc --noEmit` + `npm run lint` + dev 수동 검수(파일럿 화면, 대표 목록 2곳, Cmd+K).

## 7. 성공 기준

1. 파일럿 화면에서 같은 뷰포트에 기존 대비 행 수 +20% 이상 표시
2. 모든 상호작용 피드백 200ms 이내 시작, 시트/팝오버 모션 토큰 준수
3. Cmd+K로 마우스 없이 메뉴 이동·유저/스페이스 접근 가능
4. 키보드로 테이블 행 진입 가능 (기존 백로그 해소)
5. 기존 접근성 규칙(대비·색 단독 금지) 위반 0건
