# 어드민 "기능 토글" 메뉴 설계

앱 메뉴 노출(오퍼월·광장·광고 등)을 빌드 대신 서버 기능 토글로 운영한다. 요청 원문은 MindBridge 저장소 `docs/requests/2026-11-03-feature-flags-api.md`(브랜치 `docs/feature-flags-request`, 커밋 `e80e89e7`)의 3절이다. 서버 API 는 mindqna-server 가 만든다.

## 서버 API (mindqna-server 확정, 2026-11-03)

서버 계획서: mindqna-server `docs/superpowers/plans/2026-11-03-feature-flags-api.md`.

```ts
// GET /admin/feature-flags → 항상 16개, 서버 키 상수 순서
{ items: { key: string; label: string; appDefault: 'on' | 'off' | 'env'; row: FeatureFlagRow | null }[] }

type FeatureFlagRow = {
  key: string;
  enabled: boolean;
  platforms: ('ios' | 'android')[]; // 비면 전체
  flavors: ('global' | 'huawei')[]; // 비면 전체
  minVersionCode: number | null;
  maxVersionCode: number | null;
  description: string;
  updatedAt: string; // ISO
};

// PUT /admin/feature-flags/:key (upsert) → 저장된 FeatureFlagRow
// body 는 모두 필수, 버전 둘은 null 가능, description 최대 191자
{ enabled; platforms; flavors; minVersionCode; maxVersionCode; description }
```

- 400: 허용 밖·중복 platforms/flavors 값, 0·음수·소수 versionCode, min > max, 목록에 없는 key.
- `appDefault: 'env'` 는 `wallet.offerwall.tnk`·`wallet.offerwall.adison` 두 개다(앱 빌드 env 값).
- 판정: `enabled && (platforms 비었거나 포함) && (flavors 비었거나 포함) && (min ≤ versionCode ≤ max)`. 저장한 서버 프로세스는 바로, 나머지는 최대 30초 안에 반영된다.
- DELETE·수정 이력·수정자(`updatedBy`)는 없다. 어드민 JWT 가 공용 계정 하나라 사람을 구분할 수 없다.
- 중국 리전은 admin-china 가 mindbridge-china 서버를 보고 따로 운영한다. 어드민 코드는 같다.

## 결정

1. **자리:** 사이드바 시스템 메뉴의 `앱 버전 관리` 바로 아래에 `기능 토글`(`/feature-flags`)을 둔다. 권한은 다른 어드민 화면과 같다.
2. **목록:** 표 하나로 16개 키를 서버가 준 순서대로 보여 준다. 열은 키(아래에 설명), 상태, 조건, 수정 시각, 편집이다. 수정자 열은 없다.
   - 키 아래에 서버가 준 `label` 을, 행이 있으면 그 아래에 `description` 을 보여 준다.
   - 상태: 행이 있으면 켬/끔 스위치. 행이 없으면 `앱 기본값: 켬 | 끔 | 빌드 설정` 뱃지와 함께 스위치를 보여 준다. 스위치는 앱 기본값 위치(켬이면 켜짐, 끔이면 꺼짐)로 그린다. 처음 누르면 행이 만들어진다는 것을 확인 창에 적는다.
   - 행 없는 `env` 키는 서버가 실제 상태를 모르므로 스위치를 막고 `편집에서 켬/끔을 골라 만드세요` 툴팁을 단다. 꺼짐으로 그려 두면 운영(켬)과 다르게 보이기 때문이다.
   - 화면 위에 "저장하면 운영 앱에 최대 30초 안에 반영됩니다. 이 화면은 접속한 리전 서버(운영/중국)의 값만 바꿉니다." 안내를 둔다.
   - 조건 요약: `전체 플랫폼 · 전체 flavor · 버전 제한 없음` 꼴. 플랫폼은 `iOS`/`Android`, flavor 는 `global`/`huawei`, 버전은 `250 이상`, `260 이하`, `250–260`.
3. **켬/끔:** 스위치를 누르면 확인 창(`AlertDialog`)을 먼저 띄운다. 창에는 키, 바꿀 상태, 조건 요약, "저장 즉시 운영 앱에 반영(최대 30초)"을 적는다. 확인해야 PUT 을 보내고, 성공 뒤 목록을 다시 받는다. 기존 조건·설명은 그대로 보낸다.
4. **편집:** 행의 편집 버튼으로 대화상자를 연다. 설명, 플랫폼(전체/iOS/Android), flavor(전체/global/huawei), 최소·최대 versionCode 를 고친다. 켬/끔은 편집 대화상자에서 바꾸지 않는다(목록 스위치 한 곳).
   - 행이 없는 키를 편집해 저장하면 행이 새로 만들어진다. 이때만 대화상자에 `만들 때 상태`(켬/끔)를 두고, 초기값을 앱 기본값으로 채운다(`on` → 켬, `off` → 끔). 그대로 저장하면 앱 동작이 바뀌지 않는다.
   - `appDefault: 'env'`(tnk·adison)는 서버가 빌드 값을 모르므로 초기값 없이 켬/끔을 직접 고르게 한다. 고르기 전에는 저장할 수 없다. 안내 문구: `운영 빌드는 켬입니다.`
   - (mindbridge-64 제안 반영. 처음 안은 꺼진 행을 만들고 경고 체크박스로 확인받는 방식이었다.)
   - versionCode 는 빈칸(제한 없음) 또는 1 이상 정수. 최소 > 최대이면 저장하지 않는다. 설명은 최대 191자.
   - 서버에 iOS·Android 가 둘 다 든 행이 있으면 `전체`와 같은 뜻이므로 폼에서는 `전체`로 보여 준다.
5. **키:** 어드민은 키를 입력받지 않는다. 서버가 준 16개만 다룬다(행 추가·삭제 UI 없음).

## 수용 기준

- 16개 키가 모두 보이고, 행 없는 키는 `앱 기본값`으로 표시된다.
- 스위치를 누르면 확인 창이 뜨고, 취소하면 아무 요청도 가지 않는다.
- 편집 저장 뒤 목록의 조건 요약·수정 시각이 바뀐다.
- 최소 > 최대, 0·음수·소수 versionCode, 191자 넘는 설명은 저장되지 않고 이유가 보인다.
- 저장 실패 시 서버 메시지를 토스트로 보여 주고, 스위치는 서버 값으로 돌아간다.

## 범위 밖

행 삭제(앱 기본값으로 되돌리기), 수정 이력, 수정자, `values` 설정. 서버 2단계 때 다시 본다.
