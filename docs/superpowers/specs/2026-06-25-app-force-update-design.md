# 앱 강제 업데이트 — 설계 문서

- 작성일: 2026-06-25
- 범위: 백엔드 `mindqna-server` + 프론트 `mindqna-admin`
- 목표: 앱 버전 정책(최소/최신 버전·강제 여부)을 **어드민에서 재배포 없이** 제어. 플랫폼별(iOS/Android), 강제+권장 2단계.

## 배경 / 현재 상태
- `GET /core/check` → `{ version: APP_VERSION_NAME, isEnableUpdate: APP_UPDATE_ENABLED }` — 둘 다 **env 변수**.
- `VersionInterceptor`가 헤더 `client-version-code`와 env `APP_VERSION_CODE` 비교해 `request.isCurrentRequest` 설정(강제 차단엔 미사용).
- env(prod): `APP_VERSION_CODE=243`, `APP_VERSION_NAME=1.3.13`, `APP_UPDATE_ENABLED=true`.

**한계**: 정책 변경 시 매번 재배포(실제 "강제 업데이트 적용" 커밋이 `.env.production` 수정), 플랫폼 구분 없음, 강제/권장 구분 없음.

## 결정 사항 (확정)
- 정책 저장: **DB** (어드민 편집, 재배포 불필요).
- 플랫폼: **iOS / Android 별도**.
- 단계: **강제(min 미만 차단) + 권장(latest 미만 soft 팝업)** 2단계.
- 응답 범위: **버전 정보만** (스토어 URL·팝업 문구는 앱이 보유).
- 비교 기준: **versionCode(int)**, versionName은 표시용 (기존 `client-version-code` 헤더와 일치).

## 데이터 모델 (테이블 사전 생성 완료)
플랫폼당 1행, 총 2행. **테이블은 수동 SQL로 이미 생성됨.** 본 작업은 `schema.prisma`에 모델만 추가하고 `prisma generate`로 클라이언트를 생성한다 (`prisma migrate` 미사용 — 배포 파이프라인에 migrate 없음).

```prisma
enum AppPlatform {
  ios
  android
}

model AppVersionPolicy {
  platform          AppPlatform @id
  minVersionCode    Int
  minVersionName    String
  latestVersionCode Int
  latestVersionName String
  forceEnabled      Boolean     @default(true)
  updatedAt         DateTime    @updatedAt
}
```
대응 테이블(이미 생성): `AppVersionPolicy(platform ENUM('ios','android') PK, minVersionCode INT, minVersionName VARCHAR(191), latestVersionCode INT, latestVersionName VARCHAR(191), forceEnabled BOOLEAN DEFAULT true, updatedAt DATETIME(3))`, ios·android 2행 시드(243/1.3.13).

## 백엔드
### 1. `/core/check` 확장 (하위호환)
기존 필드 유지 + `policies` 추가:
```ts
{
  version: string,          // 유지 (APP_VERSION_NAME)
  isEnableUpdate: boolean,  // 유지 (APP_UPDATE_ENABLED)
  policies: {
    ios:     { minVersionCode, minVersionName, latestVersionCode, latestVersionName, forceEnabled },
    android: { minVersionCode, minVersionName, latestVersionCode, latestVersionName, forceEnabled },
  }
}
```
- `CoreService.getVersionPolicies()`가 `AppVersionPolicy` 2행을 읽어 `{ ios, android }` 맵으로 반환. 행이 없으면 env(`APP_VERSION_CODE`/`APP_VERSION_NAME`) 폴백.
- **판정 주체는 앱**: 자기 플랫폼 정책을 골라 자기 versionCode와 비교 → `< minVersionCode && forceEnabled` 면 강제 차단, `< latestVersionCode` 면 권장 팝업.
- 읽기는 replica(`databaseManager.read`)로.

### 2. 어드민 API (`src/admin/app-version/`, AdminGuard)
- `GET /admin/app-version` → `{ ios, android }` (각 정책 전체 필드 + updatedAt).
- `PATCH /admin/app-version/:platform` → body `{ minVersionCode, minVersionName, latestVersionCode, latestVersionName, forceEnabled }`. upsert(없으면 생성). 검증: code는 양의 정수, name 비어있지 않음.
- 신규 모듈 `AppVersionModule`(controller+service), `PrismaService` 직접 주입(어드민 space 패턴).

## 프론트 (어드민)
- `src/client/app-version.ts`: `getAppVersionPolicies()`, `updateAppVersionPolicy(platform, body)`.
- `src/client/types.ts`: `AppVersionPolicy` 타입.
- 신규 페이지 `/app-version` (`src/pages/app-version/index.tsx`) + 메뉴 등록(`main-menu.tsx`, `pages/index.tsx`).
- UI: iOS / Android **카드 2개**, 각각 min(code+name)·latest(code+name)·forceEnabled 토글 편집 + 저장. 저장 시 토스트, `updatedAt` 표시. DESIGN.md 준수(FormSection/FormGroup, slate 표면).
- 검증(zod): code 양의 정수, latest ≥ min 권장(경고 수준), name 필수.

## 비범위
- 스토어 URL·팝업 문구·차단 화면 로직 → **앱 레포 소관**.
- `prisma migrate` 미사용(테이블 수동 생성). 모델 추가 후 `prisma generate`만 수행.
- `VersionInterceptor` 동작은 그대로 둠(별도 정리 안 함).

## 구현 순서
1. 백엔드: schema 모델 추가 + `prisma generate` → CoreService.getVersionPolicies + `/core/check` 확장 → 어드민 API(모듈/서비스/컨트롤러) + 테스트.
2. 프론트: client/types → 페이지/폼 + 메뉴 등록.

## 리스크
- 테이블-모델 정합: 수동 생성 테이블이 모델과 정확히 일치해야 함(이미 일치하도록 생성 완료). 불일치 시 런타임 오류 → 최초 `GET /admin/app-version` 1회로 검증.
- env 폴백: DB 행 누락 시에도 `/core/check`가 깨지지 않도록 폴백 필수.
