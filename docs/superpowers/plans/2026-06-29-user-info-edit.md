# 유저 정보 수정 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 어드민 유저 상세에서 `locale`·`spaceMaxCount`·`reserveUnregisterAt`를 수정한다.

**Architecture:** 백엔드 `UserService.updateUser(username, params)`(부분 업데이트, 검증) + `PUT /admin/user/:username`. 어드민은 `UserEditModal`(SpaceEditModal 복제)에서 변경 필드만 전송, `reserveUnregisterAt` 신규 설정 시 AlertDialog 확인, 성공 시 상세·목록 쿼리 invalidate. `UserDetailContent` 헤더의 "수정" 버튼으로 트리거.

**Tech Stack:** NestJS 10 + Nestia(@TypedRoute.Put/@TypedBody/@TypedParam), Prisma 5.8, Jest. 어드민: Next.js, React Query, shadcn/ui.

**Repos:**
- 백엔드: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 어드민: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Constraints:** 스키마 변경 없음. `BadRequestException`은 `src/common/exception/error.ts`에 이미 존재. 푸시는 SSH로 직접. 이모지 금지. 디자인은 SpaceEditModal과 동일.

---

## File Structure

**백엔드 (`mindqna-server`)**
- Modify `src/admin/user/user.interface.ts` — `UpdateUserParams`
- Modify `src/admin/user/user.service.ts` — `updateUser` + import(Locale, BadRequestException)
- Modify `src/admin/user/user.controller.ts` — `PUT :username` 라우트
- Modify `src/admin/user/user.service.spec.ts` — error mock에 BadRequestException, 서비스 타입 선언, 테스트

**어드민 (`mindqna-admin`)**
- Modify `src/client/types.ts` — `UpdateUserParams`
- Modify `src/client/user.ts` — `updateUser` fetcher
- Create `src/components/page/user/components/UserEditModal.tsx`
- Modify `src/components/page/user/components/UserDetailContent.tsx` — `onEdit` prop + 수정 버튼
- Modify `src/components/page/user/components/UserDetailSheet.tsx` — 모달 상태/렌더, `onEdit` 연결

---

## Task 1: 백엔드 `updateUser` 서비스 (TDD)

**Files:**
- Modify: `src/admin/user/user.interface.ts`
- Modify: `src/admin/user/user.service.ts`
- Modify: `src/admin/user/user.service.spec.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 테스트 하네스 확장 (서비스 타입 선언만)**

> 검증 예외는 `@nestjs/common`의 `BadRequestException`(이미 `user.service.ts`에서 `new`로 사용 중)을 그대로 쓴다. 이건 실제 클래스라 spec에서 mock 불필요 — `.rejects.toThrow('Invalid locale')`는 그 message로 매칭된다. 따라서 에러 모듈 mock은 **건드리지 않는다**(기존 `NotFoundException` mock 유지).

`src/admin/user/user.service.spec.ts`의 서비스 타입 선언(`const { UserService } = require('./user.service') as { UserService: new (...) => { ... } }`)에서 `getUserPushes?` 줄 다음에 추가:
```ts
    updateUser?: (
      username: string,
      params: { locale?: string; spaceMaxCount?: number; reserveUnregisterAt?: string | null },
    ) => Promise<void>;
```

- [ ] **Step 2: 실패 테스트 추가**

최상위 `describe('UserService', () => { ... })` 안, 마지막 내부 describe 뒤(최상위 닫힘 `});` 직전)에 추가:

```ts
  describe('updateUser', () => {
    it('updates only provided fields', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await service.updateUser!('ralph', { locale: 'en', spaceMaxCount: 10 });

      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { username: 'ralph' },
        data: { locale: 'en', spaceMaxCount: 10 },
      });
    });

    it('sets reserveUnregisterAt as a Date and clears it with null', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await service.updateUser!('ralph', { reserveUnregisterAt: '2026-08-01T00:00:00.000Z' });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { username: 'ralph' },
        data: { reserveUnregisterAt: new Date('2026-08-01T00:00:00.000Z') },
      });

      await service.updateUser!('ralph', { reserveUnregisterAt: null });
      expect(prisma.user.update).toHaveBeenCalledWith({
        where: { username: 'ralph' },
        data: { reserveUnregisterAt: null },
      });
    });

    it('rejects an invalid locale', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await expect(service.updateUser!('ralph', { locale: 'kr' as any })).rejects.toThrow('Invalid locale');
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('rejects a negative spaceMaxCount', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await expect(service.updateUser!('ralph', { spaceMaxCount: -1 })).rejects.toThrow('Invalid spaceMaxCount');
    });

    it('rejects a past reserveUnregisterAt date', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await expect(service.updateUser!('ralph', { reserveUnregisterAt: '2020-01-01T00:00:00.000Z' })).rejects.toThrow(
        'reserveUnregisterAt',
      );
      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('does nothing when no fields are provided', async () => {
      prisma.user.findUnique.mockResolvedValue({ id: 'user_1' });

      await service.updateUser!('ralph', {});

      expect(prisma.user.update).not.toHaveBeenCalled();
    });

    it('throws when the user does not exist', async () => {
      prisma.user.findUnique.mockResolvedValue(null);

      await expect(service.updateUser!('missing', { locale: 'en' })).rejects.toThrow('Not Found');
    });
  });
```

- [ ] **Step 3: 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/user/user.service.spec.ts -t updateUser`
Expected: FAIL — `service.updateUser is not a function`

- [ ] **Step 4: 인터페이스 추가**

`src/admin/user/user.interface.ts` 맨 아래에 추가(상단에 `import { Locale } from '@prisma/client';` 이미 있음):
```ts
export interface UpdateUserParams {
  locale?: Locale;
  spaceMaxCount?: number;
  reserveUnregisterAt?: string | null;
}
```

- [ ] **Step 5: 서비스 구현**

`src/admin/user/user.service.ts` 상단 import 조정.
- 예외: **`@nestjs/common`의 `BadRequestException`을 그대로 사용**(이미 line 1에서 `import { BadRequestException, Injectable } from '@nestjs/common';`로 import되어 있고 171·218줄에서 `new BadRequestException(...)`로 사용 중). 커스텀 `src/common/exception/error`에서 가져오지 **않는다**(중복 식별자/호출규약 충돌 방지). `NotFoundException`은 기존대로 커스텀에서 유지.
- Prisma enum: `@prisma/client` import에 `Locale` 추가(현재 import 라인에 합침). 없으면 `import { Locale } from '@prisma/client';` 추가.
- 인터페이스: `import { ... , UpdateUserParams } from './user.interface';`에 `UpdateUserParams` 추가.

`UserService` 클래스 안에 메서드 추가(기존 메서드 뒤, 클래스 닫힘 전). 검증 예외는 `new BadRequestException(...)`(NestJS 클래스, 기존 171·218줄과 동일 호출규약):
```ts
  async updateUser(username: string, params: UpdateUserParams) {
    const user = await this.prisma.user.findUnique({
      where: { username },
      select: { id: true },
    });
    if (!user) throw NotFoundException();

    if (params.locale !== undefined && !Object.values(Locale).includes(params.locale)) {
      throw new BadRequestException('Invalid locale');
    }
    if (
      params.spaceMaxCount !== undefined &&
      (!Number.isInteger(params.spaceMaxCount) || params.spaceMaxCount < 0)
    ) {
      throw new BadRequestException('Invalid spaceMaxCount');
    }
    if (params.reserveUnregisterAt !== undefined && params.reserveUnregisterAt !== null) {
      const target = new Date(params.reserveUnregisterAt);
      // 과거/무효 날짜는 거부 — auth-user-remove cron이 지난 날짜를 즉시 삭제 대상으로 처리(되돌릴 수 없음)
      if (Number.isNaN(target.getTime()) || target < new Date(new Date().toDateString())) {
        throw new BadRequestException('reserveUnregisterAt must be a valid future date');
      }
    }

    const data: Record<string, unknown> = {};
    if (params.locale !== undefined) data.locale = params.locale;
    if (params.spaceMaxCount !== undefined) data.spaceMaxCount = params.spaceMaxCount;
    if (params.reserveUnregisterAt !== undefined) {
      data.reserveUnregisterAt = params.reserveUnregisterAt === null ? null : new Date(params.reserveUnregisterAt);
    }

    if (Object.keys(data).length > 0) {
      await this.prisma.user.update({ where: { username }, data });
    }
  }
```

- [ ] **Step 6: 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/user/user.service.spec.ts`
Expected: PASS (기존 + updateUser 6개 신규).

- [ ] **Step 7: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/user/user.interface.ts src/admin/user/user.service.ts src/admin/user/user.service.spec.ts
git commit -m "feat(admin/user): add updateUser partial update service"
```

---

## Task 2: 백엔드 컨트롤러 `PUT :username`

**Files:**
- Modify: `src/admin/user/user.controller.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: import 확장**

`TypedBody`는 이미 import되어 있다(transfer 라우트가 사용 중) — 건드리지 않는다. 인터페이스 import에만 `UpdateUserParams`를 추가한다(현재 `import { SearchUserParams, TransferUserAccountParams, UserTabQuery } from './user.interface';`):
```ts
import { SearchUserParams, TransferUserAccountParams, UpdateUserParams, UserTabQuery } from './user.interface';
```

- [ ] **Step 2: 라우트 추가**

주석 처리된 `updateUser` 블록(`// @TypedRoute.Put('/user/:id') ...`)을 아래로 교체한다(없으면 `removeUser` 라우트 위에 추가):
```ts
  @TypedRoute.Put(':username')
  async updateUser(@TypedParam('username') username: string, @TypedBody() body: UpdateUserParams) {
    await this.userService.updateUser(username, body);
  }
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit 2>&1 | grep -iE "admin/user" ; echo DONE`
Expected: 에러 줄 없음(`DONE`만).

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/user/user.controller.ts
git commit -m "feat(admin/user): expose PUT /admin/user/:username route"
```

---

## Task 3: 어드민 타입 + fetcher

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/user.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: 타입 추가**

`src/client/types.ts` 맨 아래에 추가(`Locale` 타입은 이미 존재):
```ts
export type UpdateUserParams = {
  locale?: Locale;
  spaceMaxCount?: number;
  reserveUnregisterAt?: string | null;
};
```

- [ ] **Step 2: fetcher 추가**

`src/client/user.ts` import에 `UpdateUserParams`를 추가하고(기존 types import 블록), 파일 맨 아래에 추가:
```ts
export async function updateUser(username: string, body: UpdateUserParams) {
  const res = await client.put(`/user/${username}`, body);

  return res.data;
}
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "client/user|client/types" ; echo DONE`
Expected: 에러 줄 없음.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts src/client/user.ts
git commit -m "feat(user): add updateUser client fetcher and type"
```

---

## Task 4: `UserEditModal` 컴포넌트

**Files:**
- Create: `src/components/page/user/components/UserEditModal.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: 모달 생성**

`src/components/page/user/components/UserEditModal.tsx`:

```tsx
import { updateUser } from '@/client/user';
import type { Locale, UpdateUserParams, UserDetail } from '@/client/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ko', label: 'KO' },
  { value: 'en', label: 'EN' },
  { value: 'zh', label: 'ZH' },
  { value: 'zhTw', label: 'ZH-TW' },
  { value: 'ja', label: 'JA' },
  { value: 'es', label: 'ES' },
  { value: 'id', label: 'ID' },
];

interface UserEditModalProps {
  open: boolean;
  user: UserDetail;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  locale: Locale;
  spaceMaxCount: string; // input 문자열, 저장 시 Number 변환
  reserveUnregisterAt: string; // 'YYYY-MM-DD' 또는 ''
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return new Date(value).toLocaleDateString('sv-SE');
}

function buildInitialForm(user: UserDetail): FormState {
  return {
    locale: (user.locale as Locale) ?? 'ko',
    spaceMaxCount: String(user.spaceMaxCount ?? 0),
    reserveUnregisterAt: toDateInput(user.reserveUnregisterAt),
  };
}

const TODAY = new Date().toLocaleDateString('sv-SE');

function UserEditModal({ open, user, onOpenChange }: UserEditModalProps) {
  const queryClient = useQueryClient();
  const initial = buildInitialForm(user);
  const [form, setForm] = useState<FormState>(initial);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [pendingBody, setPendingBody] = useState<UpdateUserParams | null>(null);

  useEffect(() => {
    setForm(buildInitialForm(user));
  }, [user]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: (body: UpdateUserParams) => updateUser(user.username, body),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['user-detail', user.username] }),
        queryClient.invalidateQueries({ queryKey: ['users'] }),
        queryClient.invalidateQueries({ queryKey: ['user-search'] }),
      ]);
      toast.success('사용자 정보를 수정했습니다.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(`${err}`),
  });

  const diff = (): UpdateUserParams => {
    const body: UpdateUserParams = {};
    if (form.locale !== initial.locale) body.locale = form.locale;
    if (form.spaceMaxCount.trim() !== initial.spaceMaxCount) body.spaceMaxCount = Number(form.spaceMaxCount);
    if (form.reserveUnregisterAt !== initial.reserveUnregisterAt) {
      body.reserveUnregisterAt = form.reserveUnregisterAt ? new Date(form.reserveUnregisterAt).toISOString() : null;
    }
    return body;
  };

  // 탈퇴예약을 새로 설정/변경하는 경우만 위험(취소=null은 안전).
  const isDangerous = (body: UpdateUserParams) =>
    body.reserveUnregisterAt !== undefined && body.reserveUnregisterAt !== null && body.reserveUnregisterAt !== '';

  const save = () => {
    const body = diff();
    if (Object.keys(body).length === 0) {
      toast.info('변경된 내용이 없습니다.');
      return;
    }
    if (body.spaceMaxCount !== undefined && (!Number.isInteger(body.spaceMaxCount) || body.spaceMaxCount < 0)) {
      toast.warning('최대 공간 수는 0 이상의 정수여야 합니다.');
      return;
    }
    if (isDangerous(body)) {
      setPendingBody(body);
      setConfirmOpen(true);
      return;
    }
    mutation.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='flex max-h-[90vh] w-full max-w-[480px] flex-col'>
        <DialogHeader className='shrink-0'>
          <DialogTitle>사용자 정보 수정</DialogTitle>
        </DialogHeader>

        <div className='min-h-0 flex-1 space-y-4 overflow-y-auto py-1 pr-1'>
          <div className='space-y-1.5'>
            <Label htmlFor='user-locale' className='text-xs text-slate-600'>
              언어
            </Label>
            <Select value={form.locale} onValueChange={(v) => set('locale', v as Locale)}>
              <SelectTrigger id='user-locale'>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LOCALES.map((l) => (
                  <SelectItem key={l.value} value={l.value}>
                    {l.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <section className='space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-3'>
            <div className='flex items-center gap-1.5'>
              <span className='h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500' aria-hidden />
              <span className='text-xs font-semibold text-slate-700'>운영 — 계정에 영향</span>
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='user-space-max' className='text-xs text-slate-600'>
                최대 공간 수
              </Label>
              <Input
                id='user-space-max'
                type='text'
                inputMode='numeric'
                value={form.spaceMaxCount}
                onChange={(e) => set('spaceMaxCount', e.target.value.replace(/[^\d]/g, ''))}
              />
            </div>
            <div className='space-y-1.5'>
              <Label htmlFor='user-reserve' className='text-xs text-slate-600'>
                탈퇴 예약일
              </Label>
              <div className='flex items-center gap-2'>
                <Input
                  id='user-reserve'
                  type='date'
                  min={TODAY}
                  value={form.reserveUnregisterAt}
                  onChange={(e) => set('reserveUnregisterAt', e.target.value)}
                  className='flex-1'
                />
                {form.reserveUnregisterAt ? (
                  <Button type='button' variant='outline' size='sm' onClick={() => set('reserveUnregisterAt', '')}>
                    예약 취소
                  </Button>
                ) : null}
              </div>
              <p className='text-xs text-slate-500'>날짜를 비우거나 &quot;예약 취소&quot;를 누르면 탈퇴 예약이 해제됩니다.</p>
            </div>
          </section>
        </div>

        <div className='flex shrink-0 justify-end gap-2 border-t border-slate-100 pt-4'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type='button' onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className='mr-1 h-4 w-4 animate-spin' /> : null}
            저장
          </Button>
        </div>
      </DialogContent>

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>탈퇴 예약 확인</AlertDialogTitle>
            <AlertDialogDescription>
              설정한 날짜에 이 사용자 계정이 삭제됩니다. 진행하시겠습니까?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setPendingBody(null)}>취소</AlertDialogCancel>
            <AlertDialogAction
              className='bg-rose-600 text-white hover:bg-rose-700'
              onClick={() => {
                if (pendingBody) mutation.mutate(pendingBody);
                setConfirmOpen(false);
                setPendingBody(null);
              }}
            >
              확인하고 저장
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Dialog>
  );
}

export default UserEditModal;
```

- [ ] **Step 2: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "UserEditModal" ; echo DONE`
Expected: 에러 줄 없음. (`UserDetail`에 `locale`/`spaceMaxCount`/`reserveUnregisterAt`/`username` 존재 — `UserDetailContent`에서 구조분해로 사용 중임을 확인함.)

- [ ] **Step 3: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/user/components/UserEditModal.tsx
git commit -m "feat(user): add UserEditModal form for editing user info"
```

---

## Task 5: 사이드패널 연결 (DetailContent 수정 버튼 + Sheet 모달)

**Files:**
- Modify: `src/components/page/user/components/UserDetailContent.tsx`
- Modify: `src/components/page/user/components/UserDetailSheet.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: DetailContent에 수정 버튼**

`UserDetailContent.tsx` import에 `Pencil`을 추가한다(현재 lucide import 라인에 합침).

props 인터페이스에 `onEdit`를 추가한다. 현재:
```ts
interface UserDetailContentProps {
  user: UserDetail;
  copyId: (value: string) => void;
  onOpenTicket?: (user: UserSummary) => void;
  onRemove?: (user: UserSummary) => void;
}
```
변경: `onEdit?: () => void;` 한 줄 추가.

함수 시그니처에 `onEdit` 추가: `function UserDetailContent({ user, copyId, onOpenTicket, onRemove, onEdit }: UserDetailContentProps) {`

identity strip 우측 액션 블록의 조건과 내용을 수정한다. 현재:
```tsx
          {onOpenTicket || onRemove ? (
            <div className='flex shrink-0 items-center gap-1.5'>
              {onOpenTicket ? (
                <Button size='sm' variant='outline' className='h-9' onClick={() => onOpenTicket(user)}>
                  <Ticket className='h-4 w-4' />
                  티켓 관리
                </Button>
              ) : null}
```
변경:
```tsx
          {onOpenTicket || onRemove || onEdit ? (
            <div className='flex shrink-0 items-center gap-1.5'>
              {onEdit ? (
                <Button size='sm' variant='outline' className='h-9' onClick={onEdit}>
                  <Pencil className='h-4 w-4' />
                  수정
                </Button>
              ) : null}
              {onOpenTicket ? (
                <Button size='sm' variant='outline' className='h-9' onClick={() => onOpenTicket(user)}>
                  <Ticket className='h-4 w-4' />
                  티켓 관리
                </Button>
              ) : null}
```

- [ ] **Step 2: Sheet에 모달 상태/렌더**

`UserDetailSheet.tsx` import에 추가:
```ts
import UserEditModal from './UserEditModal';
```
`useState`가 이미 import되어 있다(탭 상태로 사용 중). 컴포넌트 본문의 `const [tab, setTab] = useState('overview');` 아래에 추가:
```ts
  const [editOpen, setEditOpen] = useState(false);
```
overview 탭의 `<UserDetailContent ... />`에 `onEdit`를 전달하고 그 아래 모달을 렌더한다. 현재:
```tsx
            <TabsContent value='overview'>
              <UserDetailContent user={data} copyId={copyId} onOpenTicket={onOpenTicket} onRemove={onRemove} />
            </TabsContent>
```
변경:
```tsx
            <TabsContent value='overview'>
              <UserDetailContent
                user={data}
                copyId={copyId}
                onOpenTicket={onOpenTicket}
                onRemove={onRemove}
                onEdit={() => setEditOpen(true)}
              />
              <UserEditModal open={editOpen} user={data} onOpenChange={setEditOpen} />
            </TabsContent>
```

- [ ] **Step 3: 타입체크 + 빌드**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit 2>&1 | grep -iE "UserDetailContent|UserDetailSheet" ; echo TSC_DONE`
Expected: 에러 줄 없음.

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && pnpm build 2>&1 | grep -iE "Compiled successfully|Failed to compile|error|/user/list"`
Expected: `Compiled successfully` + `/user/list` 라인.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/user/components/UserDetailContent.tsx src/components/page/user/components/UserDetailSheet.tsx
git commit -m "feat(user): wire user edit modal into detail overview"
```

---

## 최종 검증 (수동)

- [ ] 유저 상세 개요 헤더에 "수정" 버튼 노출
- [ ] 언어/최대 공간 수 변경 후 저장 → 개요·목록 즉시 갱신, toast 성공
- [ ] 최대 공간 수 음수/빈값 입력 차단
- [ ] 탈퇴 예약일 설정 후 저장 → **확인 다이얼로그** → 확인 시 반영(개요 탈퇴예약 표시 갱신)
- [ ] 과거 날짜 선택 불가(min)
- [ ] "예약 취소" 또는 날짜 비우고 저장 → 확인 없이 예약 해제
- [ ] 변경 없이 저장 → "변경된 내용이 없습니다"

> 푸시는 SSH로 직접. 스키마 변경 없음.
