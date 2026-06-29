# 공간 정보 수정 (서브프로젝트 1) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 운영자가 공간 상세 사이드패널에서 공간의 선언적 정보(이름·펫이름·타입·시작일·로케일·알림시각·활성여부·삭제예약)를 수정한다.

**Architecture:** 백엔드는 기존 `SpaceService`에 부분 업데이트 `updateSpace(id, params)`를 추가하고 `PUT /admin/space/:id`로 노출한다. 트랜잭션 내에서 전달된 필드만 `spaceInfo`/`space` 두 테이블에 반영한다. 어드민은 `SpaceEditModal`(기존 Dialog 패턴)에서 변경된 필드만 전송하고, 성공 시 상세 쿼리(`['space-detail', id]`)를 invalidate해 패널을 즉시 갱신한다.

**Tech Stack:** NestJS 10 + Nestia(@TypedRoute.Put/@TypedBody/@TypedParam), Prisma 5.8, Jest(AAA, virtual mock). 어드민: Next.js Pages Router, React Query(useMutation/useQueryClient), shadcn/ui(Dialog/Select/Switch/Input), sonner.

**Repos:**
- 백엔드: `/Users/gargoyle92/Documents/backend/mindqna-server`
- 어드민: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

**Constraints:** 스키마 변경 없음(`prisma generate`만, 마이그레이션 금지). 푸시는 사용자가 수동. 이모지 금지.

---

## File Structure

**백엔드 (`mindqna-server`)**
- Modify `src/admin/space/space.interface.ts` — `UpdateSpaceParams` 인터페이스 추가
- Modify `src/admin/space/space.service.ts` — `updateSpace` 메서드 추가(주석 자리 `:349` 대체), import에 `ForbiddenException` 추가
- Modify `src/admin/space/space.controller.ts` — `PUT :id` 라우트 추가, `TypedBody`/`UpdateSpaceParams` import
- Modify `src/admin/space/space.service.spec.ts` — mock 팩토리에 `spaceInfo.update` 추가, 서비스 타입 선언에 `updateSpace` 추가, `describe('updateSpace')` 테스트 추가

**어드민 (`mindqna-admin`)**
- Modify `src/client/types.ts` — `UpdateSpaceParams` 타입 추가
- Modify `src/client/space.ts` — `updateSpace(id, body)` fetcher 추가
- Create `src/components/page/space/components/SpaceEditModal.tsx` — 수정 폼 모달
- Modify `src/components/page/space/components/SpaceIdentityStrip.tsx` — `onEdit` prop + 수정 버튼
- Modify `src/components/page/space/components/SpaceDetailSheet.tsx` — 모달 상태/렌더, IdentityStrip에 `onEdit` 연결

---

## Task 1: 백엔드 `updateSpace` 서비스 (TDD)

**Files:**
- Modify: `src/admin/space/space.service.spec.ts` (mock 팩토리 446-520 영역, 서비스 타입 선언 47 영역, 새 describe)
- Modify: `src/admin/space/space.interface.ts`
- Modify: `src/admin/space/space.service.ts:349`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: 테스트 하네스 확장 (mock 팩토리 + 서비스 타입 선언 + 에러 mock)**

`src/admin/space/space.service.spec.ts`의 mock 팩토리 `createPrismaServiceMock`에서 `space` 블록 바로 다음에 `spaceInfo` 블록을 추가한다(현재 `space: { ... update: jest.fn() }` 다음 줄):

```ts
    spaceInfo: {
      update: jest.fn(),
    },
```

같은 파일 상단의 에러 모듈 mock에 `ForbiddenException`을 추가한다(현재 `NotFoundException`만 있음):

```ts
jest.mock(
  'src/common/exception/error',
  () => ({
    NotFoundException: () => new Error('Not Found'),
    ForbiddenException: () => new Error('Forbidden'),
  }),
  { virtual: true },
);
```

같은 파일에서 `const { SpaceService } = require('./space.service') as { ... }` 타입 선언 블록의 `getSpace: (id: string) => Promise<unknown>;` 줄 아래에 추가한다:

```ts
    updateSpace: (
      id: string,
      params: {
        name?: string;
        petName?: string;
        type?: string;
        startedAt?: string;
        locale?: string;
        noticeTime?: string;
        isActive?: boolean;
        dueRemovedAt?: string | null;
      },
    ) => Promise<void>;
```

- [ ] **Step 2: 실패하는 테스트 작성**

`src/admin/space/space.service.spec.ts`의 마지막 `describe(...)` 블록 뒤(최상위 `describe('SpaceService', ...)` 닫힘 `});` 직전)에 추가한다:

```ts
  describe('updateSpace', () => {
    const existing = { id: 'space-1', isActive: true, dueRemovedAt: null, spaceInfo: { spaceId: 'space-1' } };

    beforeEach(() => {
      prisma.$transaction.mockImplementation(async (cb: any) => cb(prisma));
    });

    it('updates only provided display fields on spaceInfo and trims strings', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await service.updateSpace('space-1', { name: '  새 이름  ', type: 'family' });

      expect(prisma.spaceInfo.update).toHaveBeenCalledWith({
        where: { spaceId: 'space-1' },
        data: { name: '새 이름', type: 'family' },
      });
      expect(prisma.space.update).not.toHaveBeenCalled();
    });

    it('updates operational fields on space', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await service.updateSpace('space-1', { isActive: false });

      expect(prisma.space.update).toHaveBeenCalledWith({
        where: { id: 'space-1' },
        data: { isActive: false },
      });
      expect(prisma.spaceInfo.update).not.toHaveBeenCalled();
    });

    it('clears the scheduled removal when dueRemovedAt is null', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await service.updateSpace('space-1', { dueRemovedAt: null });

      expect(prisma.space.update).toHaveBeenCalledWith({
        where: { id: 'space-1' },
        data: { dueRemovedAt: null },
      });
    });

    it('sets the scheduled removal date when dueRemovedAt is a string', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await service.updateSpace('space-1', { dueRemovedAt: '2026-07-01T00:00:00.000Z' });

      expect(prisma.space.update).toHaveBeenCalledWith({
        where: { id: 'space-1' },
        data: { dueRemovedAt: new Date('2026-07-01T00:00:00.000Z') },
      });
    });

    it('updates both tables in one call', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await service.updateSpace('space-1', { name: 'X', isActive: false });

      expect(prisma.spaceInfo.update).toHaveBeenCalled();
      expect(prisma.space.update).toHaveBeenCalled();
    });

    it('rejects an invalid space type', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await expect(service.updateSpace('space-1', { type: 'bogus' })).rejects.toThrow('Forbidden');
      expect(prisma.spaceInfo.update).not.toHaveBeenCalled();
    });

    it('rejects an invalid locale', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await expect(service.updateSpace('space-1', { locale: 'kr' })).rejects.toThrow('Forbidden');
    });

    it('rejects an empty name', async () => {
      prisma.space.findUnique.mockResolvedValue(existing);

      await expect(service.updateSpace('space-1', { name: '   ' })).rejects.toThrow('Forbidden');
    });

    it('throws when the space does not exist', async () => {
      prisma.space.findUnique.mockResolvedValue(null);

      await expect(service.updateSpace('missing', { name: 'X' })).rejects.toThrow('Not Found');
    });
  });
```

- [ ] **Step 3: 테스트 실패 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/space/space.service.spec.ts -t updateSpace`
Expected: FAIL — `service.updateSpace is not a function` (메서드 미구현)

- [ ] **Step 4: 인터페이스 추가**

`src/admin/space/space.interface.ts` 맨 아래에 추가한다(파일 상단에 `import { Locale, SpaceType } from '@prisma/client';`가 이미 있음):

```ts
export interface UpdateSpaceParams {
  name?: string;
  petName?: string;
  type?: SpaceType;
  startedAt?: string;
  locale?: Locale;
  noticeTime?: string;
  isActive?: boolean;
  dueRemovedAt?: string | null;
}
```

- [ ] **Step 5: 서비스 구현**

`src/admin/space/space.service.ts` 상단 import에서 예외 헬퍼에 `ForbiddenException`을 추가한다. 현재:

```ts
import { NotFoundException } from 'src/common/exception/error';
```
변경:
```ts
import { ForbiddenException, NotFoundException } from 'src/common/exception/error';
```

같은 파일 상단 import에서 인터페이스에 `UpdateSpaceParams`를 추가한다. 현재:
```ts
import { GetSpacesParams, SearchSpacesParams } from './space.interface';
```
변경:
```ts
import { GetSpacesParams, SearchSpacesParams, UpdateSpaceParams } from './space.interface';
```

`updateSpace` 주석 줄(`// async updateSpace(params: UpdateSpaceParams) {}`)을 아래 구현으로 교체한다:

```ts
  async updateSpace(id: string, params: UpdateSpaceParams) {
    const SPACE_TYPES = ['couple', 'family', 'friends', 'alone'];
    const LOCALES = ['ko', 'en', 'zh', 'zhTw', 'ja', 'es', 'id'];

    const space = await this.prisma.space.findUnique({
      where: { id },
      include: { spaceInfo: true },
    });

    if (!space) throw NotFoundException();

    if (params.type !== undefined && !SPACE_TYPES.includes(params.type)) throw ForbiddenException();
    if (params.locale !== undefined && !LOCALES.includes(params.locale)) throw ForbiddenException();

    const spaceInfoData: Record<string, unknown> = {};
    for (const key of ['name', 'petName', 'startedAt', 'noticeTime'] as const) {
      const value = params[key];
      if (value !== undefined) {
        const trimmed = value.trim();
        if (!trimmed) throw ForbiddenException();
        spaceInfoData[key] = trimmed;
      }
    }
    if (params.type !== undefined) spaceInfoData.type = params.type;
    if (params.locale !== undefined) spaceInfoData.locale = params.locale;

    const spaceData: Record<string, unknown> = {};
    if (params.isActive !== undefined) spaceData.isActive = params.isActive;
    if (params.dueRemovedAt !== undefined) {
      spaceData.dueRemovedAt = params.dueRemovedAt === null ? null : new Date(params.dueRemovedAt);
    }

    await this.prisma.$transaction(async (tx) => {
      if (Object.keys(spaceInfoData).length > 0) {
        await tx.spaceInfo.update({ where: { spaceId: id }, data: spaceInfoData });
      }
      if (Object.keys(spaceData).length > 0) {
        await tx.space.update({ where: { id }, data: spaceData });
      }
    });
  }
```

- [ ] **Step 6: 테스트 통과 확인**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/space/space.service.spec.ts -t updateSpace`
Expected: PASS (9 tests)

전체 파일 회귀도 확인:
Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx jest src/admin/space/space.service.spec.ts`
Expected: PASS (기존 + 신규 모두)

- [ ] **Step 7: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/space/space.service.ts src/admin/space/space.interface.ts src/admin/space/space.service.spec.ts
git commit -m "feat(admin/space): add updateSpace partial update service"
```

---

## Task 2: 백엔드 컨트롤러 `PUT :id` 라우트

**Files:**
- Modify: `src/admin/space/space.controller.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/backend/mindqna-server`

- [ ] **Step 1: import 확장**

`src/admin/space/space.controller.ts` 첫 줄을 변경한다. 현재:
```ts
import { TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
```
변경:
```ts
import { TypedBody, TypedParam, TypedQuery, TypedRoute } from '@nestia/core';
```

인터페이스 import에 `UpdateSpaceParams`를 추가한다. 현재:
```ts
import { SearchSpacesParams, SpaceTabQuery } from './space.interface';
```
변경:
```ts
import { SearchSpacesParams, SpaceTabQuery, UpdateSpaceParams } from './space.interface';
```

- [ ] **Step 2: 라우트 추가**

`space.controller.ts`의 주석 처리된 `updateSpace` 블록(`// @TypedRoute.Put('/space/:id') ...`)을 아래로 교체한다(`removeSpace` 라우트 바로 위에 위치):

```ts
  @TypedRoute.Put(':id')
  async updateSpace(@TypedParam('id') id: string, @TypedBody() body: UpdateSpaceParams) {
    await this.spaceService.updateSpace(id, body);
  }
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/backend/mindqna-server && npx tsc --noEmit`
Expected: 신규 변경 관련 에러 없음(기존에 에러가 있었다면 동일 수준 유지).

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/backend/mindqna-server
git add src/admin/space/space.controller.ts
git commit -m "feat(admin/space): expose PUT /admin/space/:id route"
```

---

## Task 3: 어드민 타입 + 클라이언트 fetcher

**Files:**
- Modify: `src/client/types.ts`
- Modify: `src/client/space.ts`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: 타입 추가**

`src/client/types.ts`에서 `export type SpaceDetail = Space & {` 정의 바로 위에 추가한다(`SpaceType`, `Locale` 타입은 같은 파일에 이미 존재):

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

- [ ] **Step 2: fetcher 추가**

`src/client/space.ts`의 import 목록(`from './types'`)에 `UpdateSpaceParams`를 추가하고, 파일 맨 아래에 fetcher를 추가한다:

import 수정 — `SpaceType,` 줄 아래(알파벳 순 위치 무관, 같은 블록 내)에:
```ts
  UpdateSpaceParams,
```

파일 맨 아래 추가:
```ts
export const updateSpace = async (id: string, body: UpdateSpaceParams) => {
  const { data } = await client.put(`/space/${id}`, body);
  return data;
};
```

> `client`의 baseURL이 이미 `/admin`이므로 경로는 `/space/${id}`.

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: 신규 변경 관련 에러 없음.

- [ ] **Step 4: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/client/types.ts src/client/space.ts
git commit -m "feat(space): add updateSpace client fetcher and type"
```

---

## Task 4: `SpaceEditModal` 컴포넌트

**Files:**
- Create: `src/components/page/space/components/SpaceEditModal.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: 모달 컴포넌트 생성**

`src/components/page/space/components/SpaceEditModal.tsx`:

```tsx
import { updateSpace } from '@/client/space';
import type { Locale, SpaceDetail, SpaceType, UpdateSpaceParams } from '@/client/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const SPACE_TYPES: { value: SpaceType; label: string }[] = [
  { value: 'couple', label: '커플' },
  { value: 'family', label: '가족' },
  { value: 'friends', label: '친구' },
  { value: 'alone', label: '혼자' },
];

const LOCALES: { value: Locale; label: string }[] = [
  { value: 'ko', label: 'KO' },
  { value: 'en', label: 'EN' },
  { value: 'zh', label: 'ZH' },
  { value: 'zhTw', label: 'ZH-TW' },
  { value: 'ja', label: 'JA' },
  { value: 'es', label: 'ES' },
  { value: 'id', label: 'ID' },
];

interface SpaceEditModalProps {
  open: boolean;
  detail: SpaceDetail;
  onOpenChange: (open: boolean) => void;
}

type FormState = {
  name: string;
  petName: string;
  type: SpaceType;
  startedAt: string;
  locale: Locale;
  noticeTime: string;
  isActive: boolean;
  dueRemovedAt: string; // 'YYYY-MM-DD' 또는 ''(예약 없음)
};

function toDateInput(value: string | null | undefined): string {
  if (!value) return '';
  return value.slice(0, 10);
}

function buildInitialForm(detail: SpaceDetail): FormState {
  const info = detail.spaceInfo;
  return {
    name: info?.name ?? '',
    petName: info?.petName ?? '',
    type: (info?.type as SpaceType) ?? 'couple',
    startedAt: info?.startedAt ?? '',
    locale: (info?.locale as Locale) ?? 'ko',
    noticeTime: info?.noticeTime ?? '',
    isActive: detail.isActive,
    dueRemovedAt: toDateInput(detail.dueRemovedAt),
  };
}

function SpaceEditModal({ open, detail, onOpenChange }: SpaceEditModalProps) {
  const queryClient = useQueryClient();
  const initial = buildInitialForm(detail);
  const [form, setForm] = useState<FormState>(initial);

  useEffect(() => {
    setForm(buildInitialForm(detail));
  }, [detail]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const mutation = useMutation({
    mutationFn: (body: UpdateSpaceParams) => updateSpace(detail.id, body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['space-detail', detail.id] });
      toast.success('공간 정보를 수정했습니다.');
      onOpenChange(false);
    },
    onError: (err) => toast.error(`${err}`),
  });

  const diff = (): UpdateSpaceParams => {
    const body: UpdateSpaceParams = {};
    if (form.name.trim() !== (initial.name ?? '')) body.name = form.name.trim();
    if (form.petName.trim() !== (initial.petName ?? '')) body.petName = form.petName.trim();
    if (form.type !== initial.type) body.type = form.type;
    if (form.startedAt.trim() !== (initial.startedAt ?? '')) body.startedAt = form.startedAt.trim();
    if (form.locale !== initial.locale) body.locale = form.locale;
    if (form.noticeTime.trim() !== (initial.noticeTime ?? '')) body.noticeTime = form.noticeTime.trim();
    if (form.isActive !== initial.isActive) body.isActive = form.isActive;
    if (form.dueRemovedAt !== initial.dueRemovedAt) {
      body.dueRemovedAt = form.dueRemovedAt ? new Date(form.dueRemovedAt).toISOString() : null;
    }
    return body;
  };

  const save = () => {
    const body = diff();
    if (Object.keys(body).length === 0) {
      toast.info('변경된 내용이 없습니다.');
      return;
    }
    if (form.name.trim() === '' || form.petName.trim() === '') {
      toast.warning('이름과 펫 이름은 비울 수 없습니다.');
      return;
    }
    mutation.mutate(body);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className='max-w-[560px]'>
        <DialogHeader>
          <DialogTitle>공간 정보 수정</DialogTitle>
        </DialogHeader>

        <div className='space-y-5'>
          <section className='space-y-3'>
            <div className='text-xs font-medium text-slate-500'>표시 정보</div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs text-slate-500'>공간 이름</Label>
                <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs text-slate-500'>펫 이름</Label>
                <Input value={form.petName} onChange={(e) => set('petName', e.target.value)} />
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs text-slate-500'>타입</Label>
                <Select value={form.type} onValueChange={(v) => set('type', v as SpaceType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SPACE_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-1.5'>
                <Label className='text-xs text-slate-500'>시작일</Label>
                <Input value={form.startedAt} onChange={(e) => set('startedAt', e.target.value)} />
              </div>
            </div>
          </section>

          <section className='space-y-3'>
            <div className='text-xs font-medium text-slate-500'>동작 설정</div>
            <div className='grid grid-cols-2 gap-3'>
              <div className='space-y-1.5'>
                <Label className='text-xs text-slate-500'>로케일</Label>
                <Select value={form.locale} onValueChange={(v) => set('locale', v as Locale)}>
                  <SelectTrigger>
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
              <div className='space-y-1.5'>
                <Label className='text-xs text-slate-500'>알림 시각</Label>
                <Input value={form.noticeTime} onChange={(e) => set('noticeTime', e.target.value)} />
              </div>
            </div>
          </section>

          <section className='space-y-3 rounded-lg border border-amber-200/70 bg-amber-50/50 p-3'>
            <div className='text-xs font-medium text-amber-700'>운영 (앱 동작에 영향)</div>
            <div className='flex items-center justify-between'>
              <div>
                <Label htmlFor='space-active' className='text-sm text-slate-700'>
                  활성 상태
                </Label>
                {!form.isActive ? (
                  <p className='text-xs text-rose-600'>비활성화하면 카드 생성이 중단됩니다.</p>
                ) : null}
              </div>
              <Switch
                id='space-active'
                checked={form.isActive}
                onCheckedChange={(v) => set('isActive', v)}
              />
            </div>
            <div className='space-y-1.5'>
              <Label className='text-xs text-slate-500'>삭제 예약일 (비우면 예약 취소)</Label>
              <Input
                type='date'
                value={form.dueRemovedAt}
                onChange={(e) => set('dueRemovedAt', e.target.value)}
              />
            </div>
          </section>
        </div>

        <div className='mt-2 flex justify-end gap-2'>
          <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
            취소
          </Button>
          <Button type='button' onClick={save} disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className='mr-1 h-4 w-4 animate-spin' /> : null}
            저장
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default SpaceEditModal;
```

- [ ] **Step 2: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: 신규 파일 관련 에러 없음. (`Button`의 `outline` variant는 `src/components/ui/button.tsx`에 존재함을 확인함.)

- [ ] **Step 3: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/space/components/SpaceEditModal.tsx
git commit -m "feat(space): add SpaceEditModal form for editing space info"
```

---

## Task 5: 사이드패널 연결 (IdentityStrip 수정 버튼 + Sheet 모달 상태)

**Files:**
- Modify: `src/components/page/space/components/SpaceIdentityStrip.tsx`
- Modify: `src/components/page/space/components/SpaceDetailSheet.tsx`

작업 디렉터리: `/Users/gargoyle92/Documents/frontend/mindqna-admin`

- [ ] **Step 1: IdentityStrip에 수정 버튼 추가**

`src/components/page/space/components/SpaceIdentityStrip.tsx`의 import에 `Pencil`을 추가한다. 현재:
```ts
import { Copy } from 'lucide-react';
```
변경:
```ts
import { Copy, Pencil } from 'lucide-react';
```

props 인터페이스에 `onEdit`를 추가한다. 현재:
```ts
interface SpaceIdentityStripProps {
  detail: SpaceDetail;
  copyId: (id: string) => void;
}
```
변경:
```ts
interface SpaceIdentityStripProps {
  detail: SpaceDetail;
  copyId: (id: string) => void;
  onEdit?: () => void;
}
```

함수 시그니처를 변경한다. 현재:
```ts
function SpaceIdentityStrip({ detail, copyId }: SpaceIdentityStripProps) {
```
변경:
```ts
function SpaceIdentityStrip({ detail, copyId, onEdit }: SpaceIdentityStripProps) {
```

최상위 `div` 내부의 첫 줄(공간명/배지가 들어있는 `<div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>` 블록)을 수정 버튼과 함께 배치하기 위해, 그 줄을 다음으로 감싼다. 현재:
```tsx
      <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
        <span className='truncate text-lg font-semibold text-slate-900'>{detail.spaceInfo?.name ?? '공간 상세'}</span>
        <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
        <Badge variant='softNeutral'>{detail.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
        <SpaceStatusDot active={detail.isActive} className='ml-1' />
        {hasPremiumMember ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
        {hasGoldClubMember ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
      </div>
```
변경:
```tsx
      <div className='flex items-start justify-between gap-2'>
        <div className='flex flex-wrap items-center gap-x-2 gap-y-1.5'>
          <span className='truncate text-lg font-semibold text-slate-900'>{detail.spaceInfo?.name ?? '공간 상세'}</span>
          <Badge variant={typeConfig.variant}>{typeConfig.text}</Badge>
          <Badge variant='softNeutral'>{detail.spaceInfo?.locale?.toUpperCase() ?? '-'}</Badge>
          <SpaceStatusDot active={detail.isActive} className='ml-1' />
          {hasPremiumMember ? <Badge variant='softSuccess'>PREMIUM</Badge> : null}
          {hasGoldClubMember ? <Badge variant='softWarning'>GOLD CLUB</Badge> : null}
        </div>
        {onEdit ? (
          <button
            type='button'
            onClick={onEdit}
            className='inline-flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900'
          >
            <Pencil className='h-3 w-3' />
            수정
          </button>
        ) : null}
      </div>
```

- [ ] **Step 2: Sheet에 모달 상태 추가 및 연결**

`src/components/page/space/components/SpaceDetailSheet.tsx`의 import에 `SpaceEditModal`을 추가한다(다른 컴포넌트 import 근처):
```ts
import SpaceEditModal from './SpaceEditModal';
```

`useState` import가 이미 있는지 확인하고(현재 `tab` 상태로 사용 중), 컴포넌트 본문 `const [tab, setTab] = useState('overview');` 아래에 추가한다:
```ts
  const [editOpen, setEditOpen] = useState(false);
```

overview 탭에서 `SpaceIdentityStrip`에 `onEdit`를 전달한다. 현재:
```tsx
                <SpaceIdentityStrip detail={detail} copyId={copyId} />
```
변경:
```tsx
                <SpaceIdentityStrip detail={detail} copyId={copyId} onEdit={() => setEditOpen(true)} />
```

모달을 렌더한다. `<SpaceIdentityStrip ... />` 바로 아래 줄에 추가한다:
```tsx
                <SpaceEditModal open={editOpen} detail={detail} onOpenChange={setEditOpen} />
```

- [ ] **Step 3: 타입체크**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && npx tsc --noEmit`
Expected: 신규 변경 관련 에러 없음.

- [ ] **Step 4: 빌드 확인**

Run: `cd /Users/gargoyle92/Documents/frontend/mindqna-admin && pnpm build`
Expected: 빌드 성공.

- [ ] **Step 5: 커밋**

```bash
cd /Users/gargoyle92/Documents/frontend/mindqna-admin
git add src/components/page/space/components/SpaceIdentityStrip.tsx src/components/page/space/components/SpaceDetailSheet.tsx
git commit -m "feat(space): wire space edit modal into detail side panel"
```

---

## 최종 검증 (수동)

- [ ] 어드민 실행 → 공간 목록 → 공간 클릭 → 사이드패널 개요 상단 "수정" 버튼 노출
- [ ] 이름/펫이름/타입/시작일 변경 후 저장 → 패널 즉시 갱신, toast 성공
- [ ] 로케일/알림시각 변경 → 저장 반영
- [ ] 활성 스위치 off → "카드 생성 중단" 경고 노출, 저장 시 `isActive=false` 반영
- [ ] 삭제 예약일 설정 후 저장 → IdentityStrip "삭제예정" 표시 갱신
- [ ] 삭제 예약일 비우고 저장 → 예약 취소(삭제예정 표시 사라짐)
- [ ] 변경 없이 저장 → "변경된 내용이 없습니다" 안내, 요청 미발생
- [ ] 이름 비우고 저장 시도 → 차단 경고

> 푸시(서버·어드민)는 사용자가 수동으로 진행. 스키마 변경 없으므로 마이그레이션 불필요.
