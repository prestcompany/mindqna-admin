# 공간 정보 수정 — 설계 (서브프로젝트 1)

> 공간 상세 사이드패널에서 운영자가 공간의 **선언적(저장값) 정보**를 직접 수정한다.
> 강제 카드 발급 등 **명령형 운영 액션**은 서브프로젝트 2로 분리하며 본 스펙에 포함하지 않는다.

- 대상 레포: `mindqna-server`(백엔드), `mindqna-admin`(어드민 프런트)
- 확장 지점: 기존 주석 자리 `space.service.ts:349`, `space.controller.ts`의 `updateSpace` 주석
- 제약: DB 마이그레이션 없음(스키마 변경 없음, 기존 컬럼만 갱신). 푸시는 사용자가 수동.

## 배경 / 목적

운영자가 공간의 오타·부적절 명칭, 잘못된 타입/로케일, 알림 시각, 활성 여부, 삭제 예약 등을
어드민에서 직접 교정·조정할 수 있어야 한다. 현재는 조회만 가능하다.

## 수정 대상 필드 (선언적 8개)

| 그룹 | 필드 | 모델 | 입력 형태 | 검증 |
|---|---|---|---|---|
| 표시 | `name` | SpaceInfo | text | trim 후 비어있을 수 없음 |
| 표시 | `petName` | SpaceInfo | text | trim 후 비어있을 수 없음 |
| 표시 | `type` | SpaceInfo | select | `SpaceType` enum 멤버 |
| 표시 | `startedAt` | SpaceInfo | text | 문자열(공백 허용 안 함) |
| 동작 | `locale` | SpaceInfo | select | `Locale` enum 멤버 |
| 동작 | `noticeTime` | SpaceInfo | text | 비어있을 수 없음 |
| 운영 | `isActive` | Space | switch | boolean |
| 운영 | `dueRemovedAt` | Space | date \| null | ISO 문자열 또는 null(예약 취소) |

**enum 값**
- `SpaceType`: `couple | family | friends | alone`
- `Locale`: `ko | en | zh | zhTw | ja | es | id`

**수정 금지(본 스펙 비대상)**: 집계 카운터(`members`, `replies`, `coin`, `coinPaid`, `cardOrder`),
내부 타임스탬프(`cardGenDate`, `latestEdit*At`, `createdAt`, `updatedAt`), PK/소유권(`id`, `spaceId`, `ownerId`).

## 아키텍처 / 데이터 흐름

```
[SpaceEditModal] --(변경된 필드만)--> client.updateSpace(id, body)
   --> PUT /admin/space/:id (TypedBody)
   --> SpaceService.updateSpace(id, params)
        --> $transaction: space.update(운영 필드) + spaceInfo.update(표시/동작 필드)
   --> 성공 시 어드민에서 상세 쿼리 invalidate --> 패널 즉시 반영
```

부분 업데이트: 클라이언트는 **변경된 필드만** 전송하고, 서비스는 **전달된 필드만** `data`에 포함한다.

## 백엔드 (mindqna-server)

### interface — `space.interface.ts`
```ts
export interface UpdateSpaceParams {
  name?: string;
  petName?: string;
  type?: SpaceType;
  startedAt?: string;
  locale?: Locale;
  noticeTime?: string;
  isActive?: boolean;
  dueRemovedAt?: string | null; // null = 삭제예약 취소
}
```

### service — `space.service.ts`
- 시그니처: `async updateSpace(id: string, params: UpdateSpaceParams)`
- 절차:
  1. `space.findUnique({ where: { id }, include: { spaceInfo: true } })` → 없으면 `NotFoundException()`
  2. enum 검증: `type`이 있으면 `SpaceType` 멤버인지, `locale`이 있으면 `Locale` 멤버인지. 아니면 예외.
  3. 문자열 필드(`name`, `petName`, `startedAt`, `noticeTime`)는 있으면 trim, 빈 문자열이면 예외.
  4. `$transaction`:
     - `spaceInfo` 데이터(`name`/`petName`/`type`/`startedAt`/`locale`/`noticeTime`) 중 전달된 것만 모아 비어있지 않으면 `prisma.spaceInfo.update({ where: { spaceId: id }, data })`
     - `space` 데이터(`isActive`/`dueRemovedAt`) 중 전달된 것만 모아 비어있지 않으면 `prisma.space.update({ where: { id }, data })`. `dueRemovedAt`는 `null`이면 그대로 null(예약 취소), 문자열이면 `new Date(...)`.
  5. **반환값 없음(`void`)**. 어드민이 저장 성공 시 관련 쿼리를 invalidate해 refetch하므로 서비스가 갱신 상세를 다시 조회하지 않는다(불필요한 DB 재조회 회피).
- 검증 실패(잘못된 enum, 빈 문자열)는 `BadRequestException`(HTTP 400)으로 던진다. `error.ts`에 없으므로 코드 16으로 신규 추가한다.
- enum 멤버십 검증은 `Object.values(SpaceType)`/`Object.values(Locale)`로 스키마와 자동 동기화.
- `this.prisma` 직접 사용(기존 `removeSpace`와 동일 패턴).

### controller — `space.controller.ts`
```ts
@TypedRoute.Put(':id')
async updateSpace(@TypedParam('id') id: string, @TypedBody() body: UpdateSpaceParams) {
  return (await this.spaceService.updateSpace(id, body)) as any;
}
```
(`@TypedBody` import 추가)

## 프런트 (mindqna-admin)

### 타입 — `src/client/types.ts`
```ts
export type UpdateSpaceParams = {
  name?: string;
  petName?: string;
  type?: SpaceType;
  startedAt?: string;
  locale?: Locale;
  noticeTime?: string;
  isActive?: boolean;
  dueRemovedAt?: string | null;
};
```
(`SpaceType`, `Locale`이 types에 없으면 함께 정의)

### 클라이언트 — `src/client/space.ts`
```ts
export const updateSpace = async (id: string, body: UpdateSpaceParams) => {
  const { data } = await client.put(`/space/${id}`, body);
  return data;
};
```
(baseURL이 이미 `/admin`이므로 경로는 `/space/:id`)

### UI — `SpaceEditModal.tsx` (신규)
- `SpaceProfileModal` 패턴을 따른다(Dialog 기반).
- props: `detail: SpaceDetail`, `open`, `onOpenChange`.
- 폼 상태: 8개 필드 현재값 prefill(`detail.spaceInfo.*`, `detail.isActive`, `detail.dueRemovedAt`).
- 3그룹 시각 분리(표시 / 동작 / 운영). 운영 그룹은 위험 안내 문구 + **위험 액션 확인 다이얼로그(`AlertDialog`)**:
  - `isActive`를 off로 바꿀 때 또는 `dueRemovedAt`를 신규/변경 설정할 때 → 저장 전 확인 다이얼로그를 띄운다. 예약 취소(`null`)는 안전 방향이라 확인 생략.
  - `isActive` off 경고는 "원래 active였다가 off로 바꾼 경우"에만 노출(기존 비활성 공간 열 때 노이즈 방지).
- 저장: 원본과 비교해 **변경된 필드만** `updateSpace` 호출. `useMutation` + 성공 시 `queryClient.invalidateQueries`로 상세 키 `['space-detail', id]` 와 목록 키 `['spaces']`, `['space-search']`(prefix 매칭)를 무효화, `toast.success`.
- 트리거: `SpaceIdentityStrip`에 연필 버튼 추가 → 모달 open.
- 접근성/레이아웃: 모든 필드 `id`/`htmlFor` 연결, `DialogContent`는 `max-h` + 본문 `overflow-y-auto`(긴 폼 화면 이탈 방지), `grid-cols-1 sm:grid-cols-2` 반응형.

## 에러 / 엣지 처리

- 없는 공간 → 404, 프런트 toast 에러.
- 잘못된 enum 값 → 서비스 예외(프런트 select라 정상 경로에선 발생 안 함, 방어).
- 빈 `name`/`petName`/`startedAt`/`noticeTime` → 저장 차단(프런트 검증 + 서비스 검증 이중).
- `dueRemovedAt` null → 예약 취소로 동작. 문자열 → 해당 날짜로 예약.
- 변경 없음(모든 필드 동일) → 저장 버튼 비활성 또는 no-op.

## 테스트 (TDD, 백엔드 service spec)

1. 표시 필드 부분 수정 → `spaceInfo` 해당 필드만 갱신, 나머지 보존.
2. `isActive`/`dueRemovedAt` 수정 → `space` 갱신.
3. `dueRemovedAt: null` 전달 → 예약 취소(컬럼 null로).
4. 잘못된 `type`/`locale` → 예외.
5. 빈 `name` → 예외.
6. 없는 `id` → `NotFoundException`.
7. 표시+운영 동시 전달 → 두 테이블 모두 트랜잭션 내 갱신.

기존 spec 파일(`space.service.spec.ts` 등) 패턴(PrismaService 직접 주입, AAA, virtual mock) 준수. 잦은 커밋.

## 날짜(dueRemovedAt) 처리 주의

- 저장: 모달의 `<input type=date>` 값(`YYYY-MM-DD`)을 `new Date('YYYY-MM-DD').toISOString()`(UTC 자정)으로 보낸다.
- 표시: 서버가 `removeSpace`로 자동 설정한 값은 UTC 자정이 아닐 수 있어(현재시각+30일) `.slice(0,10)`로 자르면 KST 기준 하루 밀릴 수 있다. 표시는 로컬 타임존 포맷(`new Date(value).toLocaleDateString('sv-SE')`)으로 한다.
- 과거 날짜 방지: `<input type=date>`에 `min={오늘}` 부여.

## 알려진 한계 (서브프로젝트 1 범위 밖)

- **감사 로그 없음**: `isActive` off, 삭제예약 등 위험 조작의 who/what/when 기록은 별도 작업(서브프로젝트 2 또는 공통 감사 기능)으로 다룬다.
- **동시 편집 락 없음**: 낙관적 잠금/버전 체크 없음(어드민 저동시성). last-write-wins.

## 배포 / 운영 주의

- 스키마 변경 없음 → `prisma generate`만(마이그레이션 불필요). `error.ts`에 `BadRequestException` 추가는 코드 변경일 뿐 DB 영향 없음.
- `isActive`/`dueRemovedAt`는 앱 동작에 직접 영향 → 운영자 확인 다이얼로그로 오조작 방지.
- 푸시는 사용자가 수동(자격증명 write 권한 없음).
