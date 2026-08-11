# 쿠폰 관리 고도화 — 코드 리뷰 결과

- **일자**: 2026-08-10
- **범위**: `mindqna-admin` `a9901c3..8f68bf0` (프론트엔드 28커밋)
- **방식**: 백그라운드 워크플로우, 에이전트 28개, finder → 적대적 verify 패스
- **결과**: 검증 완료 결함 10건 (CONFIRMED 9, PLAUSIBLE 1)
- **상태**: **전부 미수정**

리뷰에는 이미 승인된 설계 결정(단일 통화 라디오, 공용 배치의 코드 복사 미제공 등)과
미해결 타임존 질문을 제외하도록 지시했고, 대신 "이전 리뷰가 이름 붙이지 않은 경로"를
찾도록 요청했습니다. 10건 중 8건이 `CouponForm` · `CouponCodeList` · `CouponList`
**세 파일의 상호작용**에서 나왔습니다 — 태스크별 리뷰가 구조적으로 볼 수 없던 영역입니다.

---

## 1. 중단한 쿠폰이 수정만 하면 되살아남

`src/components/page/coupon/CouponForm.tsx:129` · correctness · CONFIRMED

발급 중단된 배치를 수정하면 조용히 재활성화됩니다. 폼이 `dueAt`을 날짜 단위 입력으로
왕복시키고, `updateCouponBatch`가 이를 다시 하루 끝으로 펼칩니다.

**재현 경로**: 관리자가 진행중 배치에 발급 중단을 실행합니다. 백엔드 `stopCouponBatch`가
`dueAt = new Date()`(예: 오늘 14:20이라는 시각)로 설정해 즉시 등록이 막힙니다. 이후 관리자가
같은 배치의 수정을 열어 무관한 필드(쿠폰 이름 오타)를 고칩니다. 129행의 reset이 그 시각을
`dayjs(init.dueAt).format('YYYY-MM-DD')` = 오늘로 뭉개고, save가 그대로 전송합니다.
`updateCouponBatch`는 `dueAt: dayjs(dueAt).endOf('day')`로 기록합니다. 아무것도 이를
막지 않습니다 — 보상은 그대로 echo되므로 `rewardsChanged`가 false, `startChanged`도 false.
결과적으로 쿠폰이 오늘 23:59:59까지 다시 사용 가능해집니다. 발급 중단 확인 다이얼로그는
"더 이상 등록할 수 없게 합니다"라고 약속했지만, 사용자들은 남은 하루 동안 계속 등록하고
보상을 받아가며 관리자는 중단이 취소된 사실을 알 방법이 없습니다.

## 2. 공용 코드 모드에서 발급 버튼이 아무 반응 없이 죽음

`src/components/page/coupon/CouponForm.tsx:56` · correctness · CONFIRMED

`count`가 SHARED 모드에서도 공용 zod 스키마로 검증되는데, 해당 `FormMessage`가 렌더링되지
않아 범위를 벗어난 값이 아무 표시 없이 제출을 막습니다.

**재현 경로**: 관리자가 쿠폰 발급을 엽니다(기본 개별 코드). 발급 수량에 5000을 입력한 뒤
공용 코드가 낫겠다고 판단해 모드를 전환합니다. `count`는 unregister되지 않고
(RHF `shouldUnregister` 기본값 false), 68행의 superRefine은 `!isEdit`로만 게이트되므로
zod가 `{path:['count'], message:'1000 이하로 입력해주세요.'}`를 냅니다. 발급 수량 FormGroup은
언마운트 상태이므로(270행이 `issueMode === 'INDIVIDUAL'`로 게이트) 이를 표시할 `FormMessage`가
없고, `shouldFocusError`도 언마운트된 ref에 포커스할 수 없습니다. 쿠폰 발급 버튼을 눌러도
**아무 일도 일어나지 않습니다** — 토스트도, 필드 에러도, 네트워크 요청도 없습니다. 공용 모드에서
폼은 영구히 제출 불가 상태가 됩니다. 모드 전환 전에 발급 수량 입력을 비우는 경우에도
(빈 문자열 → `z.coerce.number` → 0 → `min(1)` 실패) 같은 막다른 길에 빠집니다.

## 3. 예정 상태 배치를 중단하면 시작일과 만료일이 역전됨

`src/components/page/coupon/CouponColumns.tsx:114` · correctness · CONFIRMED

발급 중단은 EXPIRED 배치에서만 숨겨지므로 SCHEDULED 배치에서도 실행 가능하고, 그 결과
`startAt`이 `dueAt`보다 뒤에 놓여 수정 자체가 잠깁니다.

**재현 경로**: 행 액션은 `batch.status === 'EXPIRED'`일 때만 발급 중단을 생략하므로 SCHEDULED
배치에도 노출되고, 백엔드 `stopCouponBatch`는 startAt 가드 없이 무조건
`updateMany({ data: { dueAt: new Date() } })`를 실행합니다. 관리자가 다음 주 시작 예정 쿠폰을
만든 뒤 캠페인을 취소하려고 행 메뉴에서 발급 중단을 선택합니다. `dueAt`은 오늘이 되고 `startAt`은
일주일 뒤에 그대로 남아, 기간 컬럼이 "26.08.17 – 26.08.10"처럼 역전된 범위를 렌더링하고 상태가
만료로 뒤집힙니다. 관리자가 수정으로 일정을 다시 잡으려 하면 폼이 그 역전된 쌍을 불러오고
`startAt.isAfter(dueAt)` superRefine이 만료일에서 제출을 거부합니다 — 두 날짜를 모두 다시
입력하기 전까지. 백엔드 `assertCouponInput`도 동일하게 거부합니다.

## 4. 삭제 후에도 코드 목록이 이전 페이지에 남아 빈 화면을 보여줌

`src/components/page/coupon/CouponCodeList.tsx:11` · correctness · CONFIRMED

`page`가 컴포넌트 로컬 상태라 삭제 후 캐시 무효화를 넘겨 살아남고, 뒤쪽 페이지에 머물던 확장
영역이 "표시할 코드가 없습니다."를 보여줍니다 — 사용된 코드는 실제로 보존됐는데도.

**재현 경로**: `handleConfirmRemove`(CouponList.tsx:72)는 확장된 행이 refetch하도록
`['coupon-batch-codes', batchId]`를 의도적으로 무효화하지만, `CouponCodeList`의 로컬 `page`에는
닿지 못합니다. 백엔드 `removeCouponBatch`는 미사용 코드만 삭제하고 등록된 코드는 남깁니다.
개별 배치에 코드 100개(20개씩 5페이지)가 있고 그중 3개가 등록된 상태에서, 관리자가 행을 펼쳐
5페이지로 이동해 끝부분을 확인한 뒤 행 액션 삭제를 실행합니다. 미사용 97개가 삭제되고 3개가
남고 토스트는 정확히 3개 보존을 알립니다 — 그런데 확장 영역은 `page`가 여전히 5인 채로
refetch하고, 배치는 이제 1페이지뿐이므로 "표시할 코드가 없습니다."와 "5 / 1" 페이저를
렌더링합니다. 관리자는 3개가 남았다는 안내와 하나도 없다는 화면을 동시에 봅니다.

## 5. 삭제로 마지막 페이지가 비어도 목록 페이지가 보정되지 않음

`src/components/page/coupon/CouponList.tsx:66` · correctness · CONFIRMED

**재현 경로**: 배치 25개(3페이지). 관리자가 3페이지로 이동해 그곳의 5개를 전부 삭제합니다.
마지막 `refetch()`가 page 3인 채로 재실행되고, 서버는 이제 2페이지뿐인 목록에 대해 빈 배열을
반환합니다. 테이블은 빈 상태를 렌더링하고 페이지네이션 푸터는 오래된 페이지 번호로 범위를
계산합니다. 관리자는 존재할 수 없는 페이지에 남겨진 채 돌아갈 안내도 없이, 삭제가 성공했는지
확인하려면 직접 1페이지를 눌러야 합니다.

## 6. 에러 상태가 페이저까지 언마운트해 관리자를 가둠

`src/components/page/coupon/CouponCodeList.tsx:39` · correctness · CONFIRMED

`isError` 조기 반환이 페이저를 포함한 패널 전체를 대체하므로, N페이지 요청 실패 시 1페이지로
돌아갈 수단이 사라집니다.

**재현 경로**: 관리자가 배치를 펼쳐 3페이지로 이동합니다. 그 요청이 실패합니다(500, 또는 전역
`retry: 0` 하에서의 연결 끊김). `CouponCodeList`가 에러 상태를 조기 반환하며 이전/다음 버튼을
포함한 패널 전체를 대체합니다. 재시도 버튼은 같은 실패 페이지를 다시 요청하므로, 3페이지 자체가
문제라면 행을 접었다 다시 펴지 않는 한 1페이지로 돌아갈 방법이 없습니다.

## 7. 등록 없는 공용 배치의 페이저가 "1 / 0"

`src/components/page/coupon/CouponCodeList.tsx:74` · correctness · CONFIRMED

`totalPage`가 0일 때 기본값이 적용되지 않습니다(null/undefined만 처리).

**재현 경로**: 공용 쿠폰을 만들고 아직 아무도 등록하지 않은 상태. `getCouponBatchCodes`는 공용
배치에 대해 등록 내역을 페이징하므로 항목 0개와 `totalPage: 0`을 반환합니다. 훅의 폴백은
`data?.pageInfo.totalPage ?? 1`이라 null/undefined만 대체하고 실제 0은 그대로 통과합니다.
빈 상태 메시지 옆에 존재할 수 없는 위치인 "1 / 0"이 렌더링됩니다.

## 8. 수정 화면에 "새 코드를 발급한다"는 생성 미리보기가 뜸

`src/components/page/coupon/CouponSummaryCard.tsx:23` · correctness · CONFIRMED

`CouponSummaryCard`가 `CouponForm`에서 무조건 렌더링되어, 수정 화면이 N개 코드 자동 생성을
주장하는 생성 미리보기를 보여줍니다.

**재현 경로**: 관리자가 코드 100개짜리 기존 개별 배치의 수정을 엽니다. 요약 카드는 라이브 폼
상태를 읽어 생성 문구 — "코드 100개 자동 생성" / "1인 1코드 · 최대 100명" — 를 렌더링하며
저장이 새 코드 100개를 발급할 것처럼 암시합니다. 실제로는 발급하지 않습니다:
`updateCouponBatch`는 `count`를 보내지 않고 백엔드에 해당 필드가 없습니다. "쓰인 대로 발급된다"가
존재 이유인 카드가 이 화면에서는 일어나지 않을 동작을 설명하고 있습니다.

## 9. copyAll이 fetch를 기다린 뒤 클립보드에 써서 WebKit에서 실패

`src/components/page/coupon/CouponCodeList.tsx:18` · correctness · **PLAUSIBLE**

**재현 경로**: Safari의 관리자가 개별 배치를 펼쳐 코드 전체 복사를 누릅니다. `copyAll`은
`navigator.clipboard.writeText`에 도달하기 전에 `getCouponBatchCodes(batchId, 1, true)`를
await합니다. WebKit은 클립보드 쓰기가 원 제스처의 transient user activation 창 안에서
일어날 것을 요구하는데, 중간의 네트워크 await가 이를 소모하므로 쓰기가 NotAllowedError로
거부되고 토스트로 표면화됩니다. 방금 발급한 코드를 뽑아낼 수 없습니다. Chromium은 더
관대해서 Safari를 테스트하지 않으면 드러나지 않습니다.

## 10. 확장 버튼이 24px — DESIGN.md의 32px 하한 미달

`src/components/page/coupon/CouponColumns.tsx:28` · cleanup · CONFIRMED

DESIGN.md 접근성 섹션은 데스크톱 포인터 기준 툴바·인라인 컨트롤에 32px 최소값을 두고,
24px는 여백을 두른 칩의 제거 버튼에만 허용합니다. CouponColumns.tsx:28의 확장 버튼은
`h-6 w-6`(24px)이며 이제 배치의 코드에 접근하는 **유일한** 경로입니다. CouponForm.tsx:389의
빠른 기간 칩도 같은 하한 미달의 수제 버튼입니다. 새로 만든 화면의 주요 상호작용에
작고 부정확한 타깃이 놓였습니다.

---

## 정리

| # | 파일 | 성격 | 심각도 판단 |
|---|---|---|---|
| 1 | CouponForm | 중단이 무효화되어 보상이 계속 지급됨 | 최우선 |
| 2 | CouponForm | 공용 모드 제출 불가, 원인 표시 없음 | 최우선 |
| 3 | CouponColumns + 백엔드 | 예정 배치 중단 시 날짜 역전, 복구 어려움 | 높음 |
| 4 | CouponCodeList | 삭제 후 빈 화면, 안내와 모순 | 중간 |
| 5 | CouponList | 삭제 후 빈 페이지에 갇힘 | 중간 |
| 6 | CouponCodeList | 에러 시 탈출 경로 없음 | 중간 |
| 7 | CouponCodeList | "1 / 0" 표시 | 낮음 |
| 8 | CouponSummaryCard | 수정 화면의 거짓 미리보기 | 중간 |
| 9 | CouponCodeList | Safari 복사 실패 (미검증) | 중간 |
| 10 | CouponColumns / CouponForm | 접근성 하한 미달 | 낮음 |

1·3번은 백엔드(`stopCouponBatch`)도 함께 손봐야 근본 해결됩니다. 나머지는 프론트엔드 단독
수정으로 닫힙니다.
