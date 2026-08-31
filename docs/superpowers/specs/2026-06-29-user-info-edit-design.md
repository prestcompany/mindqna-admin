# 유저 정보 수정 — 설계

> 어드민 유저 상세에서 운영자가 유저의 선언적 필드(`locale`, `spaceMaxCount`, `reserveUnregisterAt`)를 수정한다.
> SpaceEditModal(공간 정보 수정) 패턴을 그대로 미러링한다. `role`(권한) 변경은 보안 민감으로 본 스펙 제외.

- 대상 레포: `mindqna-server`(백엔드), `mindqna-admin`(어드민 프런트)
- 레퍼런스: 공간 정보 수정(`SpaceEditModal`, `space.service.updateSpace`, `PUT /admin/space/:id`)
- 제약: 스키마 변경 없음(`prisma generate`만). 푸시는 SSH로 직접. 이모지 금지. 디자인은 space 수정과 동일.

## 배경 / 목적

유저 상세는 사이클 1에서 탭 기반 조회까지 완성됐으나 수정 기능이 없어 space와 비대칭이다.
운영자가 유저의 언어·공간 생성 한도·탈퇴 예약을 어드민에서 직접 조정할 수 있게 한다.

## 수정 대상 필드 (선언적 3개)

| 그룹 | 필드 | 모델 | 입력 형태 | 검증 |
|---|---|---|---|---|
| 표시/동작 | `locale` | User | select | `Locale` enum 멤버 |
| 운영 | `spaceMaxCount` | User | number | 정수, 0 이상 |
| 운영(위험) | `reserveUnregisterAt` | User | date \| null | ISO 문자열 또는 null(예약 취소) |

**enum 값** — `Locale`: `ko | en | zh | zhTw | ja | es | id`

**`reserveUnregisterAt` 동작**: `auth-user-remove.cron`이 이 시점이 지난 유저를 삭제한다. 설정=탈퇴 예약, null=예약 취소(공간의 `dueRemovedAt`와 동일 의미).

**수정 금지(본 스펙 비대상)**: `role`(권한 — 별도), `id`, `username`(변경은 기존 transfer 기능), `code`, `fcmToken`, `latestSpaceId`, `createdAt`, `updateAt`.

## 아키텍처 / 데이터 흐름

```
[UserEditModal] --(변경된 필드만)--> client.updateUser(username, body)
   --> PUT /admin/user/:username (TypedBody)
   --> UserService.updateUser(username, params)
        --> user.findUnique({ where: { username } }) 없으면 404
        --> 검증(locale enum / spaceMaxCount 정수>=0 / reserveUnregisterAt)
        --> user.update({ where: { username }, data })
   --> 성공 시 ['user-detail', username] + 유저 목록 쿼리 invalidate
```

부분 업데이트: 클라이언트는 변경 필드만 전송, 서비스는 전달된 필드만 `data`에 포함.

## 백엔드 (mindqna-server)

### interface — `user.interface.ts`
```ts
export interface UpdateUserParams {
  locale?: Locale;
  spaceMaxCount?: number;
  reserveUnregisterAt?: string | null; // null = 탈퇴예약 취소
}
```

### service — `user.service.ts`
- `async updateUser(username: string, params: UpdateUserParams)`
- 절차:
  1. `user.findUnique({ where: { username }, select: { id: true } })` → 없으면 `NotFoundException()`
  2. `locale`이 있으면 `Locale` enum 멤버 검증(`Object.values(Locale)`), 아니면 `BadRequestException('Invalid locale')`
  3. `spaceMaxCount`가 있으면 `Number.isInteger` && `>= 0`, 아니면 `BadRequestException('Invalid spaceMaxCount')`
  4. `data` 조립(전달된 필드만): `locale`, `spaceMaxCount`, `reserveUnregisterAt`(null=null, 문자열=`new Date(...)`)
  5. `data`가 비어있지 않으면 `user.update({ where: { username }, data })`
  6. 반환값 없음(void) — 프런트 invalidate로 갱신(공간 수정과 동일 결정)
- `this.prisma` 직접 사용(기존 패턴). `BadRequestException`은 `src/common/exception/error.ts`에 이미 존재(공간 수정에서 추가됨).

### controller — `user.controller.ts`
```ts
@TypedRoute.Put(':username')
async updateUser(@TypedParam('username') username: string, @TypedBody() body: UpdateUserParams) {
  await this.userService.updateUser(username, body);
}
```
(`@TypedBody` import 추가. 주석 처리된 `updateUser` 블록 대체. `:username/...` 탭 라우트들과 충돌 없음 — 단일 세그먼트.)

## 프런트 (mindqna-admin)

### 타입 — `src/client/types.ts`
```ts
export type UpdateUserParams = {
  locale?: Locale;
  spaceMaxCount?: number;
  reserveUnregisterAt?: string | null;
};
```

### 클라이언트 — `src/client/user.ts`
```ts
export async function updateUser(username: string, body: UpdateUserParams) {
  const res = await client.put(`/user/${username}`, body);
  return res.data;
}
```

### UI — `UserEditModal.tsx` (신규)
- `SpaceEditModal` 구조 복제(Dialog + AlertDialog).
- props: `open`, `user: UserDetail`, `onOpenChange`.
- 폼 prefill: `user.locale`, `user.spaceMaxCount`, `user.reserveUnregisterAt`.
- 2그룹: 표시(locale) / 운영(spaceMaxCount, reserveUnregisterAt).
- 운영 그룹: `reserveUnregisterAt` date(`min`=오늘) + "예약 취소" 버튼 + 헬프 텍스트. **신규 설정 시 AlertDialog 확인**("해당 날짜에 계정이 삭제됩니다"). 취소(null)는 확인 불필요.
- 저장: 원본과 비교해 변경 필드만 `updateUser`. `useMutation` + 성공 시 `['user-detail', username]` 및 유저 목록 쿼리 invalidate, `toast.success`.
- 트리거: `UserDetailContent`(개요) 헤더에 "수정" 버튼(연필) → `onEdit` prop. 모달 상태/렌더는 `UserDetailSheet`(쿼리 invalidate 컨텍스트).

## 에러 / 빈 / 로딩

- 없는 유저 → 404, 프런트 toast 에러.
- 잘못된 locale / 음수 spaceMaxCount → 서버 `BadRequestException`(400) + 프런트 방어 검증.
- `reserveUnregisterAt` null → 예약 취소. 과거 날짜 → 프런트 `min`으로 차단.
- 변경 없음 → no-op + "변경된 내용이 없습니다".

## 테스트 (백엔드 service spec)

1. `locale`/`spaceMaxCount` 부분 수정 → `user.update` 해당 필드만.
2. `reserveUnregisterAt` 문자열 → Date로 set, null → 예약 취소(null).
3. 잘못된 `locale` → 예외.
4. 음수 `spaceMaxCount` → 예외.
5. 없는 username → 404.
6. 빈 params → no-op(`user.update` 미호출).

기존 `user.service.spec.ts` mock 패턴(로컬 prisma/config mock, `user.update`/`findUnique`) 준수.

## 알려진 한계 / 경계

- **role(권한) 변경 미포함**: USER↔ADMIN 권한 상승은 보안 민감 → 별도 스펙(감사 로그 포함 권장).
- 감사 로그 없음(공간 수정과 동일 한계).
- username 변경은 기존 transfer(계정 이관) 기능 사용.

## 배포 / 운영 주의

- 스키마 변경 없음 → `prisma generate`만.
- `reserveUnregisterAt`는 cron 삭제에 직접 영향 → 확인 다이얼로그로 오조작 방지.
- 푸시는 SSH로 직접.
